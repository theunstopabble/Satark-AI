import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, Activity, AlertTriangle, Save } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useApiClient } from "@/api/client";

export function LiveMonitor() {
  const { userId } = useAuth();
  const client = useApiClient();

  const [isListening, setIsListening] = useState(false);
  const [threatLevel, setThreatLevel] = useState(0);
  const [status, setStatus] = useState<
    "safe" | "analyzing" | "danger" | "idle"
  >("idle");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const isListeningRef = useRef(false);
  const statusRef = useRef<string>("idle");

  const RECORDING_INTERVAL_MS = 5000;
  const MAX_RETRIES = 3;

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // FIX: Sync status to ref so canvas draw loop reads current value
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const startListening = async () => {
    if (!userId) {
      alert("Please sign in to use Live Monitor & History.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      setIsListening(true);
      isListeningRef.current = true;
      setStatus("analyzing");
      setRetryCount(0);
      drawVisualizer();

      processNextChunk(stream);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required for Live Monitor.");
    }
  };

  const processNextChunk = async (stream: MediaStream) => {
    if (!isListeningRef.current) return;

    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();

    let mimeType = "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      mimeType = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
      mimeType = "audio/mp4";
    }

    const localChunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) localChunks.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(localChunks, { type: mimeType });
      if (blob.size < 1000) {
        if (isListeningRef.current) {
          setTimeout(() => processNextChunk(stream), 200);
        }
        return;
      }

      const file = new File([blob], `live_segment_${Date.now()}.webm`, {
        type: mimeType,
      });

      try {
        // ╔══════════════════════════════════════════════════════════╗
        // ║  FIX: scanUpload now takes only 1 argument (file)       ║
        // ║  OLD: client.scanUpload(file, userId ?? "anonymous")    ║
        // ║  Problem: client API updated to not send userId,        ║
        // ║  but LiveMonitor was still passing it → type error      ║
        // ╚══════════════════════════════════════════════════════════╝
        const result = await client.scanUpload(file);
        if (result.isDeepfake) {
          setStatus("danger");
          setThreatLevel(Math.floor(result.confidenceScore * 100));
          setLastResult("Deepfake Detected!");
        } else {
          setStatus("safe");
          setThreatLevel(Math.floor(result.confidenceScore * 100));
          setLastResult("Audio seems Real.");
        }
        setRetryCount(0); // Reset on success

        if (isListeningRef.current) {
          setTimeout(() => processNextChunk(stream), 200);
        }
      } catch (e: any) {
        if (controllerRef.current && e?.name === "AbortError") {
          return;
        }

        console.error("Live Analysis Failed:", e);

        // ╔══════════════════════════════════════════════════════════╗
        // ║  FIX: Auto-retry instead of alert() + stop             ║
        // ║  OLD: alert("Connection dropped...") + stop all tracks  ║
        // ║  Problem: User had to manually restart monitoring       ║
        // ║  FIX: Retry up to MAX_RETRIES, then stop gracefully     ║
        // ╚══════════════════════════════════════════════════════════╝
        setRetryCount((prev) => prev + 1);

        if (retryCount < MAX_RETRIES) {
          setLastResult(
            `Connection issue. Retrying (${retryCount + 1}/${MAX_RETRIES})...`,
          );
          if (isListeningRef.current) {
            setTimeout(() => processNextChunk(stream), 5000);
          }
        } else {
          setLastResult("Connection lost. Monitoring stopped.");
          // Stop gracefully
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
          setIsListening(false);
          isListeningRef.current = false;
          setStatus("idle");
          setThreatLevel(0);
        }
      }
    };

    recorder.start();
    setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, RECORDING_INTERVAL_MS);
  };

  const stopListening = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    isListeningRef.current = false;
    setStatus("idle");
    setThreatLevel(0);
    setLastResult(null);
  };

  // ╔════════════════════════════════════════════════════════════╗
  // ║  FIX: Stale closure in drawVisualizer                     ║
  // ║  OLD: Used `status` directly — captured initial value     ║
  // ║  FIX: Read from `statusRef.current` instead               ║
  // ╚════════════════════════════════════════════════════════════╝
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

      ctx.fillStyle = "rgb(10, 10, 10)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      // FIX: Read from ref, not closure variable
      const currentStatus = statusRef.current;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];

        if (currentStatus === "danger") {
          ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        } else if (currentStatus === "safe") {
          ctx.fillStyle = `rgb(50, ${barHeight + 100}, 255)`;
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
        <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
          Live "Satark" Monitor
          <span className="text-xs font-normal px-2 py-1 bg-primary/10 rounded-full border border-primary/20 text-primary">
            History Enabled
          </span>
        </h2>
        <p className="text-muted-foreground">
          Real-time audio is analyzed every 5 seconds and saved to History.
        </p>
      </div>

      <div className="relative w-full aspect-video max-h-[400px] bg-black rounded-3xl border-2 border-primary/20 overflow-hidden shadow-2xl flex items-center justify-center">
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

        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full opacity-80"
        />

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
          {isListening ? "Auto-Saving to History" : "-"}
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
