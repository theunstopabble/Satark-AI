interface Segment {
  start: number;
  end: number;
  score: number;
}

interface FakeHeatmapProps {
  segments: Segment[];
  duration: number;
}

export function FakeHeatmap({ segments, duration }: FakeHeatmapProps) {
  if (!segments || segments.length === 0) return null;

  return (
    <div className="mt-6 p-4 bg-red-500/5 rounded-xl border border-red-500/20">
      <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
        🔍 Deepfake Heatmap (Red Zones = Artificial)
      </h4>

      {/* Timeline Container */}
      <div className="relative h-12 bg-black/40 rounded-md overflow-hidden w-full flex items-center">
        {/* Base line */}
        <div className="absolute w-full h-[2px] bg-white/10 top-1/2 -translate-y-1/2"></div>

        {/* Segments */}
        {segments.map((seg, i) => {
          const leftPct = (seg.start / duration) * 100;
          const widthPct = ((seg.end - seg.start) / duration) * 100;
          const opacity = seg.score; // Higher score = more opaque red

          if (seg.score < 0.2) return null; // Ignore low scores

          return (
            <div
              key={i}
              className="absolute h-full top-0 bg-red-600 transition-all hover:bg-red-500 cursor-help group"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                opacity: opacity,
              }}
            >
              {/* Tooltip */}
              <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s (Fake:{" "}
                {(seg.score * 100).toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>0.0s</span>
        <span>{duration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
