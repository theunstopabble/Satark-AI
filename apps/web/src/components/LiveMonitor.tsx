import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Activity, AlertTriangle } from "lucide-react";

export function LiveMonitor() {
  const [isListening, setIsListening] = useState(false);
  const [threatLevel, setThreatLevel] = useState(0); // 0-100
  const [status, setStatus] = useState<
    "safe" | "analyzing" | "danger" | "idle"
  >("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      setIsListening(true);
      setStatus("analyzing");
      drawVisualizer();

      // Simulate analysis loop
      const analysisInterval = setInterval(() => {
        // Randomly simulate threat detection for demo
        // In real app, this would send chunks to API
        const random = Math.random();
        if (random > 0.95) {
          setStatus("danger");
          setThreatLevel(Math.floor(Math.random() * 40) + 60); // 60-100%
          setTimeout(() => setStatus("analyzing"), 2000);
        } else if (random > 0.7) {
          setThreatLevel(Math.floor(Math.random() * 20)); // 0-20%
        }
      }, 1000);

      // Store interval to clear
      (window as any).analysisInterval = analysisInterval;
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required for Live Monitor.");
    }
  };

  const stopListening = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if ((window as any).analysisInterval) {
      clearInterval((window as any).analysisInterval);
    }
    setIsListening(false);
    setStatus("idle");
    setThreatLevel(0);
  };

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgb(10, 10, 10)"; // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        // Dynamic Color based on status
        if (status === "danger") {
          ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        } else {
          ctx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`;
        }

        ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }
    };

    draw();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 flex flex-col items-center gap-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Live "Satark" Monitor 🎙️
        </h2>
        <p className="text-muted-foreground">
          Real-time audio interception and deepfake scanning.
        </p>
      </div>

      <div className="relative w-full aspect-video max-h-[400px] bg-black rounded-3xl border-2 border-primary/20 overflow-hidden shadow-2xl flex items-center justify-center">
        {/* Status Overlay */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {status === "danger" ? (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
              <AlertTriangle size={14} /> THREAT DETECTED
            </div>
          ) : status === "analyzing" ? (
            <div className="bg-green-500/80 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Activity size={14} /> MONITORING ACTIVE
            </div>
          ) : (
            <div className="bg-gray-500/50 text-white px-3 py-1 rounded-full text-xs font-bold">
              STANDBY
            </div>
          )}
        </div>

        {/* Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full opacity-80"
        />

        {/* Center Button if Idle */}
        {!isListening && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
            <button
              onClick={startListening}
              aria-label="Start Microphone"
              title="Start Microphone"
              className="group relative flex items-center justify-center w-24 h-24 bg-primary rounded-full shadow-lg hover:scale-110 transition-all duration-300"
            >
              <div className="absolute animate-ping inline-flex h-full w-full rounded-full bg-primary opacity-20"></div>
              <Mic className="text-primary-foreground w-10 h-10 group-hover:text-white transition-colors" />
            </button>
          </div>
        )}

        {/* Threat Meter */}
        {isListening && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <motion.div
              className={`h-full ${status === "danger" ? "bg-red-500" : "bg-green-500"}`}
              animate={{ width: `${threatLevel}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {isListening && (
          <button
            onClick={stopListening}
            className="px-6 py-2 bg-destructive text-destructive-foreground rounded-full font-bold hover:bg-destructive/90 transition-colors"
          >
            Stop Monitoring
          </button>
        )}
      </div>

      {/* Logs / Info */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-muted-foreground opacity-70">
        <div className="p-3 bg-secondary rounded border border-border">
          <span className="block font-bold text-foreground">
            Scanner Status
          </span>
          {isListening ? "Running..." : "Offline"}
        </div>
        <div className="p-3 bg-secondary rounded border border-border">
          <span className="block font-bold text-foreground">Audio Buffer</span>
          {isListening ? "128kbps Stream" : "-"}
        </div>
        <div className="p-3 bg-secondary rounded border border-border">
          <span className="block font-bold text-foreground">
            Threat Confidence
          </span>
          {threatLevel}%
        </div>
      </div>
    </div>
  );
}
