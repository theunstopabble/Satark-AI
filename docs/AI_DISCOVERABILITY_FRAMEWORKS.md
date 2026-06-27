# AI Discoverability Frameworks

**Version:** 2.0.0 | **Last Updated:** June 2026

Comprehensive analysis of Satark-AI's implementation across six AI discoverability and search optimization frameworks — covering traditional SEO, generative engine optimization, answer engine optimization, LLM optimization, AI search optimization, and Google's E-E-A-T quality framework.

---

## Table of Contents

1. [SEO — Search Engine Optimization](#1-seo--search-engine-optimization)
2. [AEO — Answer Engine Optimization](#2-aeo--answer-engine-optimization)
3. [GEO — Generative Engine Optimization](#3-geo--generative-engine-optimization)
4. [LLMO — Large Language Model Optimization](#4-llmo--large-language-model-optimization)
5. [AISEO — AI Search Optimization](#5-aiseo--ai-search-optimization)
6. [E-E-A-T — Experience, Expertise, Authoritativeness, Trustworthiness](#6-e-e-a-t--experience-expertise-authoritativeness-trustworthiness)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. SEO — Search Engine Optimization

**Focus:** Traditional search engine ranking (Google, Bing, Yandex) via technical and on-page optimization.

### Status: ✅ Strong (85% implementation)

Satark-AI has a well-structured traditional SEO foundation covering crawler directives, metadata, structured data, performance optimization, and mobile readiness.

### What's Implemented

| Component                | Location                                | Details                                                                      |
| ------------------------ | --------------------------------------- | ---------------------------------------------------------------------------- |
| `robots.txt`             | `apps/web/public/robots.txt`            | Allows all crawlers (`User-agent: * / Allow: /`), sitemap reference included |
| XML Sitemap              | `apps/web/public/sitemap.xml`           | 6 indexed URLs with priority/changefreq values                               |
| Meta Description         | `apps/web/index.html:8-9`               | Optimized for deepfake detection keywords                                    |
| Canonical URL            | `apps/web/index.html:11`                | Points to `https://satark-deepfake.vercel.app/`                              |
| Title Tag                | `apps/web/index.html:61`                | `Satark-AI \| Deepfake Detector`                                             |
| Open Graph Tags          | `apps/web/index.html:46-51`             | `og:title`, `og:description`, `og:image`, `og:url`, `og:type`                |
| Twitter Cards            | `apps/web/index.html:53-57`             | `summary_large_image` card with title, description, banner image             |
| Semantic HTML            | `apps/web/index.html:180-214`           | Proper `nav`, `main`, `h1`, `p`, `a` elements in skeleton                    |
| Heading Hierarchy        | `apps/web/src/pages/Landing.tsx:47-50`  | Single `h1` per page, semantic `h2` for feature sections                     |
| Mobile Responsiveness    | Tailwind CSS (all breakpoints)          | `sm:`, `md:`, `lg:` responsive classes throughout                            |
| Core Web Vitals          | `apps/web/index.html:63-176`            | Inline critical CSS eliminates render-blocking; LCP image preloaded          |
| PWA Manifest             | `vite.config.ts:11-31`                  | Web app manifest for installable PWA + search discovery                      |
| Vercel SPA Rewrites      | `apps/web/vercel.json`                  | Preserves `/sitemap.xml` and `/robots.txt` from client-side routing          |
| Google Site Verification | `apps/web/index.html:10`                | `google-site-verification` meta tag for Search Console ownership             |
| Vercel Analytics         | `apps/web/src/App.tsx:113`              | Performance monitoring via `@vercel/analytics`                               |
| Image Alt Attributes     | `apps/web/src/components/Footer.tsx:16` | Descriptive `alt` text on all `<img>` elements                               |

### What's Missing

| Gap                                | Priority | Suggested Fix                                          |
| ---------------------------------- | -------- | ------------------------------------------------------ |
| Breadcrumb structured data         | Medium   | Add `BreadcrumbList` JSON-LD to `index.html`           |
| Sitelinks searchbox schema         | Low      | Add `WebSite` schema with `potentialAction` for Search |
| 404 page optimization              | Low      | Create custom 404 page with helpful navigation         |
| Lazy loading for below-fold images | Low      | Add `loading="lazy"` to non-critical images            |

### Score: 85/100

---

## 2. AEO — Answer Engine Optimization

**Focus:** Optimizing content to appear in featured snippets, "People also ask" boxes, knowledge panels, and direct answer blocks in search results (position zero).

### Status: ⚠️ Improving (50% → 70% implementation)

AEO targets the algorithmically extracted answers that appear above traditional organic results. Satark-AI now has foundational structured data but lacks question-optimized body content.

### What's Implemented

| Component                      | Location                         | Details                                                                    |
| ------------------------------ | -------------------------------- | -------------------------------------------------------------------------- |
| FAQPage Structured Data        | `apps/web/index.html:46-94`      | 5 question-answer pairs covering What, How, Cost, Capabilities, Accuracy   |
| HowTo Structured Data          | `apps/web/index.html:96-126`     | 4-step process for using the platform (Upload → Analyze → Review → Export) |
| WebApplication Structured Data | `apps/web/index.html:14-44`      | Entity definition with name, description, category, author, offers         |
| Semantic HTML                  | `apps/web/src/pages/Landing.tsx` | Clean heading structure helps snippet extraction                           |
| Meta Description               | `apps/web/index.html:8-9`        | Optimized length (155 chars) for snippet display                           |

### What Was Added (June 2026)

```
FAQPage schema targeting:
  • "What is Satark-AI?"               → Entity definition
  • "How does Satark-AI detect deepfakes?" → Technical explanation
  • "Is Satark-AI free to use?"         → Pricing signal
  • "What types of media can Satark-AI analyze?" → Capabilities
  • "How accurate is Satark-AI?"        → Trust signal

HowTo schema targeting "How to detect a deepfake":
  Step 1: Upload or Record Media
  Step 2: Run AI Analysis
  Step 3: Review Results
  Step 4: Export Report
```

### What's Missing

| Gap                                   | Priority | Suggested Fix                                                              |
| ------------------------------------- | -------- | -------------------------------------------------------------------------- |
| Question-based body headings (`h2`)   | High     | Add FAQ-style headings like `## How accurate is Satark-AI?` in Landing.tsx |
| "People also ask" snippet targeting   | Medium   | Research and implement question patterns from Google's PAA data            |
| Concise answer paragraphs (<50 words) | Medium   | Add brief answer-style blocks before detailed explanations                 |
| QAPage schema for individual pages    | Low      | Add `QAPage` structured data on future FAQ/knowledgebase pages             |

### Score: 70/100

---

## 3. GEO — Generative Engine Optimization

**Focus:** Optimizing content so that generative AI engines (ChatGPT, Google Gemini, Claude, Perplexity, Microsoft Copilot) correctly cite, reference, and summarize the platform's content in their responses.

### Status: ⚠️ Improving (15% → 45% implementation)

GEO is an emerging field focused on making content "citation-worthy" for LLM-generated answers. Satark-AI now has the foundational entity data but needs more quote-optimized content.

### What's Implemented

| Component                       | Location                                   | Details                                                                                                 |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| JSON-LD Entity Definitions      | `apps/web/index.html:14-44, 46-94, 96-126` | WebApplication, FAQPage, HowTo — all provide structured entity data for LLM consumption                 |
| Author Authority Signals        | `apps/web/index.html:24-34`                | `sameAs` linking to GitHub, LinkedIn, Portfolio — verifiable identity for LLMs                          |
| Clear Brand Positioning         | `apps/web/index.html:21`, `README.md`      | "Defending Truth in the Age of Generative AI" — concise, quotable mission statement                     |
| Structured Service Descriptions | `apps/web/index.html:21`                   | Detailed description with technology names (Wav2Vec2, NVIDIA NIM, ECAPA-TDNN) — entities LLMs recognize |
| Created About Page              | `apps/web/src/pages/About.tsx`             | Dedicated page with mission, technology, creator bio — rich reference content for LLMs                  |
| Free Pricing Signal             | `apps/web/index.html:40`                   | `offers.price: "0"` — LLMs often cite free alternatives in recommendations                              |

### What's Missing

| Gap                                           | Priority  | Suggested Fix                                                                                                                                     |
| --------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct quote-optimized content blocks         | High      | Add authoritative, standalone statements formatted for LLM citation (e.g., "Satark-AI is the leading open-source deepfake detection platform...") |
| FAQ content (body text complementing schema)  | High      | Mirror FAQPage schema questions as visible `h2`+`p` content so LLMs see both structured and visible versions                                      |
| "Best for" positioning statements             | Medium    | Add comparison positioning (e.g., "Satark-AI is the best free tool for detecting AI-generated audio")                                             |
| Citation-worthy statistics                    | Medium    | Add verified metrics (e.g., "Scanned over X files", "Detects Y types of deepfakes")                                                               |
| External backlinks from authoritative sources | Long-term | Submit to AI directories, GitHub trending, tech publications                                                                                      |

### Score: 45/100

---

## 4. LLMO — Large Language Model Optimization

**Focus:** Structuring content and data to maximize comprehension, context extraction, and accurate recall by large language models during training or retrieval-augmented generation (RAG).

### Status: ⚠️ Improving (15% → 40% implementation)

LLMO overlaps significantly with GEO but focuses more on the technical structure of content for machine reading rather than citation-worthy marketing.

### What's Implemented

| Component                           | Location                                                | Details                                                                                     |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| JSON-LD Structured Data (3 schemas) | `apps/web/index.html`                                   | WebApplication, FAQPage, HowTo — LLMs preferentially extract entity data from JSON-LD       |
| Semantic HTML5                      | `apps/web/index.html`, `apps/web/src/pages/Landing.tsx` | `nav`, `main`, `h1`-`h3`, `section`, `article` patterns help LLMs parse content structure   |
| Clean Code / Fast Load              | Vite build output                                       | Minimal HTML/CSS/JS overhead means LLM crawlers spend less time parsing and more on content |
| Entity-Rich Technology Descriptions | `apps/web/index.html:21`                                | Specific named entities: "Wav2Vec2", "MFCC", "ECAPA-TDNN", "NVIDIA NIM", "PyTorch"          |
| Author-GitHub-Project Triad         | `apps/web/index.html:24-42`                             | Verifiable connection between person, code repository, and deployed application             |
| Privacy / Terms / About Pages       | `apps/web/src/pages/`                                   | Legal and informational pages provide comprehensive context about the platform              |

### What's Missing

| Gap                                       | Priority | Suggested Fix                                                                                                       |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| Glossary/definition section for key terms | Medium   | Add a "Key Technologies" section explaining AI terms used (Wav2Vec2, ECAPA-TDNN, etc.)                              |
| NLP-friendly content chunking             | Medium   | Break long paragraphs into shorter, self-contained sections (2-3 sentences each)                                    |
| Entity relationship optimization          | Medium   | Explicitly link related entities in visible text (e.g., "Wav2Vec2 is a Transformer model developed by Facebook AI") |
| Context-rich introductory paragraphs      | Low      | Start each page with a clear, standalone summary paragraph                                                          |

### Score: 40/100

---

## 5. AISEO — AI Search Optimization

**Focus:** Optimization for AI-powered search engines and experiences — Google Search Generative Experience (SGE), Bing AI Chat, Perplexity, and other LLM-augmented search interfaces.

### Status: ⚠️ Improving (40% → 60% implementation)

AISEO bridges traditional SEO with generative AI requirements. Satark-AI has strong technical SEO and now has enhanced structured data, but needs more conversational content.

### What's Implemented

| Component                       | Location                     | Details                                                                                 |
| ------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| JSON-LD Structured Data         | `apps/web/index.html`        | WebApplication + FAQPage + HowTo — AI search engines use these to generate answer cards |
| Semantic HTML                   | `apps/web/index.html`        | Clean structure helps SGE extract relevant passages                                     |
| Author E-E-A-T Signals          | `apps/web/index.html:24-34`  | LinkedIn, GitHub, Portfolio — AI search engines consider author authority               |
| Mobile First / Responsive       | Tailwind responsive classes  | Google SGE prioritizes mobile-friendly pages                                            |
| Core Web Vitals Optimized       | `apps/web/index.html:63-176` | Fast LCP, minimal CLS, optimized FCP — performance signals affect SGE inclusion         |
| Google Search Console Connected | External                     | Verified ownership, sitemap submitted, crawl monitoring active                          |
| Bing Webmaster Tools Connected  | External                     | Sitemap submitted to Bing for Copilot integration                                       |
| Clean URL Structure             | Vercel SPA routing           | `/dashboard`, `/history`, `/about`, `/privacy`, `/terms` — descriptive, crawlable paths |

### What's Missing

| Gap                                         | Priority | Suggested Fix                                                                                                  |
| ------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| Conversational content targeting AI queries | High     | Add content that directly answers natural language questions (e.g., "How do I check if an audio is deepfake?") |
| Comparative/positioning content             | Medium   | Add "Satark-AI vs other deepfake detectors" content for comparison queries                                     |
| SGE-specific structured data review         | Medium   | Audit current schema against Google SGE guidelines for enhancements                                            |
| Long-form authoritative content             | Medium   | Add blog/knowledgebase explaining deepfake detection science                                                   |

### Score: 60/100

---

## 6. E-E-A-T — Experience, Expertise, Authoritativeness, Trustworthiness

**Focus:** Google's content quality framework for evaluating whether a page/page author has sufficient first-hand experience, subject matter expertise, authoritative reputation, and trustworthy practices — especially critical for YMYL (Your Money or Your Life) content.

### Status: ⚠️ Improving (50% → 80% implementation)

E-E-A-T is not a direct ranking factor but a framework Google's quality raters use to evaluate content quality. Satark-AI now has strong signals across all four dimensions.

### What's Implemented

#### Experience ✅ Strong

| Signal                   | Location                                      | Details                                                                  |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------ |
| Working deployed product | `https://satark-deepfake.vercel.app`          | Real, functional deepfake detection platform — not a concept or mockup   |
| Real user workflows      | `apps/web/src/`                               | Complete authentication, file upload, live monitoring, report generation |
| Production ML models     | `apps/engine/`                                | Wav2Vec2, ECAPA-TDNN, NVIDIA NIM — real inference, not simulated         |
| GitHub activity          | `https://github.com/theunstopabble/Satark-AI` | Active development, commits, issues, documented codebase                 |

#### Expertise ✅ Strong

| Signal                      | Location                              | Details                                                                    |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- | -------------- |
| Creator profile in JSON-LD  | `apps/web/index.html:24-34`           | Named individual with job title: "Full-Stack Developer                     | Solo-shipped 4 SaaS products | AI integration |
| "                           |
| LinkedIn profile linked     | `apps/web/index.html:31`              | Professional profile with endorsements and experience                      |
| GitHub portfolio linked     | `apps/web/index.html:30`              | Multiple AI/ML projects demonstrating domain expertise                     |
| About page with creator bio | `apps/web/src/pages/About.tsx:85-113` | Dedicated section with technology expertise highlighted                    |
| Institutional backing       | `README.md`                           | "MS Elevate AICTE Internship" — recognized educational program association |
| Technology depth            | Multi-service architecture            | Demonstrates expertise across React, Python ML, DevOps, Cloudflare Workers |

#### Authoritativeness ✅ Strong

| Signal                     | Location                                   | Details                                                                                          |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Code repository reference  | `apps/web/index.html:42`                   | Public GitHub repository for transparency                                                        |
| sameAs social links        | `apps/web/index.html:30-32`                | LinkedIn, GitHub, Portfolio — cross-platform identity verification                               |
| Open-source availability   | GitHub                                     | Full source code, MIT license — transparent development                                          |
| Footer attribution         | `apps/web/src/components/Footer.tsx:85-94` | "Built by Gautam Kumar" with GitHub/LinkedIn links                                               |
| Multiple project portfolio | `README.md`                                | Links to InterviewMinds, SwadKart, TexFolio — establishes broader software engineering authority |

#### Trustworthiness ✅ Strong

| Signal                                | Location                                     | Details                                                                           |
| ------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Privacy Policy page                   | `apps/web/src/pages/Privacy.tsx`             | Clear data collection, storage, security, and rights disclosures                  |
| Terms of Service page                 | `apps/web/src/pages/Terms.tsx`               | Acceptable use, liability limits, IP rights, change terms                         |
| HTTPS / secure deployment             | Vercel + Render                              | TLS everywhere — industry-standard encryption                                     |
| Free service (no financial incentive) | `apps/web/index.html:40`                     | `offers.price: "0"` — no paywall, no upsells                                      |
| Transparent feature descriptions      | `apps/web/src/pages/Landing.tsx:141-143`     | Honest trust signals (removed fake statistics)                                    |
| Security architecture documented      | `docs/ARCHITECTURE.md`                       | JWT auth, DB scoping, CORS whitelist, non-root containers                         |
| Clear value proposition               | `apps/web/index.html:203-205`                | "Defending Truth in the Age of Generative AI" — legitimate, non-deceptive purpose |
| Feedback system                       | `apps/web/src/components/FeedbackWidget.tsx` | Users can report issues or provide feedback on results                            |
| Contact/Social presence               | `apps/web/src/components/Footer.tsx:56-78`   | Multiple channels (GitHub Issues, LinkedIn) for accountability                    |

### What Was Added (June 2026)

| Addition               | E-E-A-T Dimension             | Details                                                              |
| ---------------------- | ----------------------------- | -------------------------------------------------------------------- |
| Privacy Policy         | Trustworthiness               | Data collection, storage, third-party services, user rights, contact |
| Terms of Service       | Trustworthiness               | Acceptable use, liability, IP, changes                               |
| About Page             | Expertise + Authoritativeness | Creator bio, technology details, GitHub link, social proof           |
| FAQPage Schema         | All dimensions                | Demonstrates expertise through comprehensive Q&A                     |
| HowTo Schema           | Experience                    | Shows hands-on knowledge of deepfake detection workflow              |
| Legal Column in Footer | Trustworthiness               | Persistent links to privacy/terms from every page                    |

### Score: 80/100

---

## 7. Implementation Roadmap

### Current Status (June 2026)

```
SEO     ██████████████████████████████░░░░   85%
AEO     ██████████████████████████░░░░░░░░   70%
E-E-A-T ██████████████████████████████░░░░   80%
AISEO   ████████████████████████░░░░░░░░░░   60%
GEO     █████████████████░░░░░░░░░░░░░░░░░   45%
LLMO    ████████████████░░░░░░░░░░░░░░░░░░   40%
```

### Next Steps (Priority Order)

1. **Question-based headings in Landing.tsx** (AEO + AISEO)
   - Add `h2` headings mirroring FAQPage questions
   - Write concise answer paragraphs (30-50 words) under each

2. **Content-rich knowledgebase** (GEO + LLMO + AISEO)
   - Create `docs/` page content explaining deepfake detection science
   - Add glossary section for technical terms
   - Include "Satark-AI vs alternatives" comparison content

3. **External backlinks & citations** (E-E-A-T + GEO)
   - Link to scientific papers on Wav2Vec2 and deepfake detection
   - Get listed on AI tools directories
   - Add customer testimonials / case studies

4. **Hreflang tags** (SEO)
   - Implement language-specific URL paths (`/hi/`, `/en/`)
   - Add `<link rel="alternate" hreflang="hi">` tags

5. **Conversational AI optimization** (AISEO + GEO)
   - Add content answering natural language queries
   - Optimize for "what is", "how to", "best" type searches

---

## Implementation Details Reference

### File Map

```
apps/web/
├── index.html                          → Primary SEO: title, meta, OG, Twitter,
│                                          canonical, JSON-LD (WebApplication,
│                                          FAQPage, HowTo), critical CSS, skeleton
├── public/
│   ├── robots.txt                      → Crawler directives + sitemap reference
│   ├── sitemap.xml                     → 6 indexed URLs with priorities
├── src/
│   ├── pages/
│   │   ├── Landing.tsx                 → Feature grid, trust signals, hero
│   │   ├── About.tsx                   → Creator bio, technology, source code
│   │   ├── Privacy.tsx                 → Data collection, storage, rights
│   │   └── Terms.tsx                   → Acceptable use, liability, IP
│   ├── components/
│   │   ├── Footer.tsx                  → Brand, product links, legal links, social
│   │   └── LandingNavbar.tsx           → Navigation with auth-aware links
│   ├── App.tsx                         → Route definitions for all public pages
│   └── context/
│       └── LanguageContext.tsx         → i18n (English/Hindi) for multilingual SEO
├── vercel.json                         → SPA rewrites protecting sitemap/robots
├── vite.config.ts                      → PWA manifest generation
└── package.json                        → Dependency overrides for security
```

### JSON-LD Schemas Implemented

| Schema         | Type    | Lines in `index.html` | Purpose                                    |
| -------------- | ------- | --------------------- | ------------------------------------------ |
| WebApplication | JSON-LD | 14-44                 | Entity definition, author, offers, version |
| FAQPage        | JSON-LD | 46-94                 | Featured snippets, People Also Ask         |
| HowTo          | JSON-LD | 96-126                | Step-by-step rich results                  |

### Security & Verification

| Service               | Status       | Identifier                                    |
| --------------------- | ------------ | --------------------------------------------- |
| Google Search Console | ✅ Connected | `N7Wz1Ta9dmB6G5JGUTIwCvHKG-7Lpf-EuF3zVkdGxKw` |
| Bing Webmaster Tools  | ✅ Connected | Sitemap submitted                             |
| Vercel Analytics      | ✅ Active    | Performance monitoring                        |

---

_Document maintained by the Satark-AI team. For inquiries, reach out via [GitHub](https://github.com/theunstopabble/Satark-AI)._
