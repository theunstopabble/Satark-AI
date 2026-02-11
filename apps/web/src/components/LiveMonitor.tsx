import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Activity, AlertTriangle, Save } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useApiClient } from "@/api/client";

export function LiveMonitor() {
  const { userId } = useAuth();
  const client = useApiClient();

  const [isListening, setIsListening] = useState(false);
  const [threatLevel, setThreatLevel] = useState(0); // 0-100
  const [status, setStatus] = useState<
    "safe" | "analyzing" | "danger" | "idle"
  >("idle");
  const [lastResult, setLastResult] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();

  // Recording Interval (5 seconds)
  const RECORDING_INTERVAL_MS = 5000;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    if (!userId) {
      alert("Please sign in to use Live Monitor & History.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 1. Setup Visualizer (AudioContext)
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      // 2. Setup Recording (MediaRecorder)
      // Check supported mime types
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // When 5s chunk is finished (stop called or manual cycle)
      recorder.onstop = async () => {
        // This is only called when we explicitly stop,
        // BUT we want periodic checks.
        // Strategy: We will stop/start recorder every 5s OR use timeslice.
        // Better Strategy: Use periodic processing function.
      };

      // Start recording
      recorder.start();
      // We will actually grab data periodically manually?
      // MediaRecorder with timeslice fires ondataavailable periodically.
      // Let's restart the recorder implementation below for robustness.

      setIsListening(true);
      setStatus("analyzing");
      drawVisualizer();

      // 3. Start Analysis Loop
      startAnalysisLoop(stream, mimeType);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required for Live Monitor.");
    }
  };

  const startAnalysisLoop = (stream: MediaStream, mimeType: string) => {
    // We need a separate MediaRecorder for chunks to ensure clean headers for each file

    const processNextChunk = () => {
      if (!isListening && intervalRef.current === null) return; // Stopped

      // Create a new recorder for this 5s chunk
      const chunkRecorder = new MediaRecorder(stream, { mimeType });
      const localChunks: Blob[] = [];

      chunkRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      chunkRecorder.onstop = async () => {
        // Create File from blob
        const blob = new Blob(localChunks, { type: mimeType });
        // If blob is too small, ignore
        if (blob.size < 1000) return;

        const file = new File([blob], `live_segment_${Date.now()}.webm`, {
          type: mimeType,
        });

        // Send to API
        try {
          // console.log("Sending Live Chunk for Analysis...");
          const result = await client.scanUpload(file, userId || "guest-live");
          // console.log("Live Analysis Result:", result);

          // Update UI based on Result
          if (result.isDeepfake) {
            setStatus("danger");
            setThreatLevel(Math.floor(result.confidenceScore));
            setLastResult("Deepfake Detected!");
          } else {
            setStatus("safe");
            setThreatLevel(Math.floor(result.confidenceScore));
            setLastResult("Audio seems Real.");
          }

          // If safe for > 3 seconds, switch back to analyzing visual
          setTimeout(() => {
            // Only revert if we haven't found another danger
            // Simplified logic for demo
          }, 3000);
        } catch (e) {
          console.error("Live Analysis Failed:", e);
        }
      };

      chunkRecorder.start();

      // Stop this recorder after INTERVAL
      setTimeout(() => {
        if (chunkRecorder.state === "recording") {
          chunkRecorder.stop();
        }
        // Loop: Call next content if still listening
        // We use setInterval for the Loop Trigger instead of recursive timeout
        // to prevent drift, but recursive is safer for async.
        // Actually, let's use a single setInterval in the parent.
      }, RECORDING_INTERVAL_MS);
    };

    // Call immediately
    processNextChunk();
    // Set interval
    intervalRef.current = setInterval(
      processNextChunk,
      RECORDING_INTERVAL_MS + 200,
    ); // Buffer
  };

  const stopListening = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop tracks
    if (sourceRef.current?.mediaStream) {
      sourceRef.current.mediaStream.getTracks().forEach((t) => t.stop());
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsListening(false);
    setStatus("idle");
    setThreatLevel(0);
    setLastResult(null);
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
        } else if (status === "safe") {
          ctx.fillStyle = `rgb(50, ${barHeight + 100}, 255)`; // Blue/Safe
        } else {
          ctx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`; // Green/Monitoring
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
        <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
          Live "Satark" Monitor 🎙️
          <span className="text-xs font-normal px-2 py-1 bg-primary/10 rounded-full border border-primary/20 text-primary">
            History Enabled
          </span>
        </h2>
        <p className="text-muted-foreground">
          Real-time audio is analyzed every 5 seconds and saved to History.
        </p>
      </div>

      <div className="relative w-full aspect-video max-h-[400px] bg-black rounded-3xl border-2 border-primary/20 overflow-hidden shadow-2xl flex items-center justify-center">
        {/* Status Overlay */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {status === "danger" ? (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
              <AlertTriangle size={14} /> THREAT DETECTED
            </div>
          ) : status === "safe" ? (
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-500/20">
              <Activity size={14} /> AUDIO VERIFIED REAL
            </div>
          ) : status === "analyzing" ? (
            <div className="bg-green-500/80 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Activity size={14} /> MONITORING...
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

        {/* Live Finding Result Text */}
        {isListening && lastResult && (
          <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white font-mono text-sm border border-white/10"
            >
              Last Scan: {lastResult}{" "}
              <Save className="inline w-3 h-3 ml-1 text-muted-foreground" />
            </motion.div>
          </div>
        )}

        {/* Threat Meter */}
        {isListening && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <motion.div
              className={`h-full ${status === "danger" ? "bg-red-500" : status === "safe" ? "bg-blue-500" : "bg-green-500"}`}
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
          {isListening ? "Processing 5s Chunks..." : "Offline"}
        </div>
        <div className="p-3 bg-secondary rounded border border-border">
          <span className="block font-bold text-foreground">
            Database Saving
          </span>
          {isListening ? "✅ Auto-Saving to History" : "-"}
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
