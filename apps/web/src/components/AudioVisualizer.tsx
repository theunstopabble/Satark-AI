import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

interface AudioVisualizerProps {
  audioUrl: string;
}

export function AudioVisualizer({ audioUrl }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#4f46e5",
      progressColor: "#818cf8",
      cursorColor: "#c7d2fe",
      barWidth: 2,
      barGap: 1,
      height: 100,
      normalize: true,
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on("finish", () => setIsPlaying(false));

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (wavesurfer.current) {
      if (isPlaying) {
        wavesurfer.current.pause();
      } else {
        wavesurfer.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="bg-card p-4 rounded-lg border shadow-sm mt-4">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <span className="text-sm font-medium text-muted-foreground">
          Audio Waveform
        </span>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
