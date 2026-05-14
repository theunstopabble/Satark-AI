# Database Schema

**Version:** 2.0.0 | **Last Updated:** May 2026

PostgreSQL schema managed via **Drizzle ORM** (`drizzle-orm/pg-core`). Migrations are applied using `drizzle-kit push`.

---

## Connection Configuration

```typescript
// apps/api/src/db/index.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,                      // Maximum connections in pool
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 5000 // Fail fast if DB unreachable
});
```

**Provider:** Supabase / Neon / Railway (any PostgreSQL 14+ with SSL)

---

## Tables

### `scans`

Stores all scan results — audio deepfake scans, image scans, and speaker verification logs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `serial` | NO | Auto-increment | Primary key |
| `user_id` | `text` | NO | — | Clerk user ID (e.g., `user_2abc123`) |
| `audio_url` | `text` | NO | — | Source identifier (URL, `uploaded://filename`, `image_scan:filename`, `Speaker Verification (File Upload)`) |
| `scan_type` | `text` | YES | `'audio'` | Scan category: `audio`, `image`, or `url` |
| `is_deepfake` | `boolean` | YES | — | Detection verdict |
| `confidence_score` | `double precision` | YES | — | Confidence score (0.0000–1.0000) |
| `file_hash` | `text` | YES | — | SHA-256 hash for deduplication |
| `audio_data` | `text` | YES | — | Base64-encoded audio blob (for playback) |
| `analysis_details` | `text` | YES | — | Human-readable XAI explanation |
| `created_at` | `timestamp` | YES | `now()` | Scan timestamp |
| `feedback` | `text` | YES | — | User feedback (max 500 chars, enforced at app level) |

#### Indexes

| Index Name | Column(s) | Purpose |
|------------|-----------|---------|
| `scans_user_id_idx` | `user_id` | Fast history lookup per user |
| `scans_created_at_idx` | `created_at` | Chronological ordering |
| `scans_file_hash_idx` | `file_hash` | SHA-256 deduplication lookups |
| `scans_scan_type_idx` | `scan_type` | Filter by scan category |

---

### `speakers`

Stores enrolled speaker voice prints (ECAPA-TDNN embeddings).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `user_id` | `text` | NO | — | Clerk user ID (scoped isolation) |
| `name` | `text` | NO | — | Speaker display name |
| `embedding` | `json` | NO | — | 192-dimensional float array (ECAPA-TDNN vector) |
| `created_at` | `timestamp` | NO | `now()` | Enrollment timestamp |

#### Indexes

| Index Name | Column(s) | Purpose |
|------------|-----------|---------|
| `speakers_user_id_idx` | `user_id` | Scoped speaker lookup per user |

---

## Schema Definition (Drizzle ORM)

```typescript
// apps/api/src/db/schema.ts
import {
  pgTable, serial, text, timestamp, boolean,
  doublePrecision, uuid, json, index,
} from "drizzle-orm/pg-core";

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  audioUrl: text("audio_url").notNull(),
  scanType: text("scan_type").default("audio"),
  isDeepfake: boolean("is_deepfake"),
  confidenceScore: doublePrecision("confidence_score"),
  fileHash: text("file_hash"),
  audioData: text("audio_data"),
  analysisDetails: text("analysis_details"),
  createdAt: timestamp("created_at").defaultNow(),
  feedback: text("feedback"),
}, (table) => ({
  userIdIdx: index("scans_user_id_idx").on(table.userId),
  createdAtIdx: index("scans_created_at_idx").on(table.createdAt),
  fileHashIdx: index("scans_file_hash_idx").on(table.fileHash),
  scanTypeIdx: index("scans_scan_type_idx").on(table.scanType),
}));

export const speakers = pgTable("speakers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  embedding: json("embedding").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("speakers_user_id_idx").on(table.userId),
}));
```

---

## Entity Relationship

```
┌──────────────────────────────────────────────────────────────┐
│                         scans                                 │
├──────────────────────────────────────────────────────────────┤
│  id (PK, serial)                                             │
│  user_id (text, NOT NULL) ──────────────────┐                │
│  audio_url (text, NOT NULL)                  │                │
│  scan_type (text, default 'audio')           │                │
│  is_deepfake (boolean)                       │                │
│  confidence_score (float8)                   │  Logical       │
│  file_hash (text)                            │  relationship  │
│  audio_data (text)                           │  (same userId) │
│  analysis_details (text)                     │                │
│  created_at (timestamp)                      │                │
│  feedback (text)                             │                │
└──────────────────────────────────────────────┼────────────────┘
                                               │
                                               │ user_id = user_id
                                               │
┌──────────────────────────────────────────────┼────────────────┐
│                       speakers               │                │
├──────────────────────────────────────────────┴────────────────┤
│  id (PK, uuid, random)                                        │
│  user_id (text, NOT NULL) ◀───────────────────────────────────│
│  name (text, NOT NULL)                                        │
│  embedding (json, NOT NULL) → [float × 192]                  │
│  created_at (timestamp, NOT NULL)                             │
└───────────────────────────────────────────────────────────────┘
```

> **Note:** There is no foreign key constraint between `scans` and `speakers`. The relationship is logical — both tables are scoped by `user_id` (Clerk user ID) at the application level.

---

## Data Isolation Model

All queries enforce user-scoped access:

```typescript
// Scan history — only returns current user's scans
db.select().from(scans).where(eq(scans.userId, userId));

// Speaker verification — only matches against current user's speakers
db.select().from(speakers).where(eq(speakers.userId, userId));

// Cache dedup — scoped to user to prevent cross-user data leakage
db.query.scans.findFirst({
  where: and(eq(scans.fileHash, fileHash), eq(scans.userId, userId))
});
```

---

## Embedding Storage Format

The `speakers.embedding` column stores a JSON array of 192 floating-point numbers:

```json
[0.0123, -0.0456, 0.0789, -0.0012, 0.0345, ...]
```

- **Dimensions:** 192 (ECAPA-TDNN output)
- **Range:** Typically [-1.0, 1.0] per dimension
- **Comparison:** Cosine similarity computed in TypeScript (API gateway)
- **Match Threshold:** `score > 0.75`

---

## Migration Commands

```bash
# Generate migration SQL from schema changes
cd apps/api
npx drizzle-kit generate:pg

# Push schema directly to database (development)
npx drizzle-kit push
```

---

## Storage Estimates

| Table | Row Size (avg) | Growth Rate |
|-------|---------------|-------------|
| `scans` (without audioData) | ~500 bytes | Per scan |
| `scans` (with audioData) | ~500 KB–2 MB | Per audio upload |
| `speakers` | ~2 KB | Per enrollment |

> **Note:** The `audio_data` column stores full base64-encoded audio. For high-volume production use, consider offloading to object storage (S3/R2) and storing only a reference URL.
