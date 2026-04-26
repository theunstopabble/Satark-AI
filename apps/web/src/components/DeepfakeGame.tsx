import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Trophy,
  RefreshCw,
  Volume2,
  WifiOff,
} from "lucide-react";

// ╔══════════════════════════════════════════════════════════════════╗
// ║  FIX: Game data — replaced external URLs with local assets      ║
// ║  OLD: URLs pointed to www2.cs.uic.edu (external, unreliable)    ║
// ║  Problem: External server may be slow, down, or CORS-blocked   ║
// ║  FIX: Use local audio files in /public/game-audio/              ║
// ║  Action needed: Add these files to apps/web/public/game-audio/  ║
// ╚══════════════════════════════════════════════════════════════════╝
const GAME_ROUNDS = [
  {
    id: 1,
    audioUrl: "/game-audio/round1.mp3",
    isFake: true,
    difficulty: "Easy",
    explanation: {
      en: "Notice the robotic glitch at 0:04.",
      hi: "0:04 पर रोबोटिक आवाज़ पर ध्यान दें।",
    },
  },
  {
    id: 2,
    audioUrl: "/game-audio/round2.mp3",
    isFake: false,
    difficulty: "Medium",
    explanation: {
      en: "Natural breathing patterns and consistent background noise.",
      hi: "सांस लेने का तरीका प्राकृतिक है और शोर एक जैसा है।",
    },
  },
  {
    id: 3,
    audioUrl: "/game-audio/round3.mp3",
    isFake: true,
    difficulty: "Hard",
    explanation: {
      en: "High frequency cutoff detected.",
      hi: "उच्च आवृत्ति में कटौती पाई गई।",
    },
  },
];

export function DeepfakeGame() {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<
    "start" | "playing" | "result" | "end"
  >("start");
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const currentData = GAME_ROUNDS[currentRound];

  // FIX: Track real audio progress instead of hardcoded 10s animation
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration || 0);
      setAudioError(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };

    const handleError = () => {
      setAudioError(true);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // FIX: Update progress based on actual audio currentTime
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current && audioRef.current.duration) {
          setAudioProgress(
            (audioRef.current.currentTime / audioRef.current.duration) * 100,
          );
        }
      }, 100);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // FIX: Reset audio state when round changes
  useEffect(() => {
    setAudioError(false);
    setAudioProgress(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [currentRound]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        // FIX: Handle autoplay policy — play() returns Promise
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Audio playback failed:", err);
        setAudioError(true);
      }
    }
  };

  const handleAnswer = (isFakeVote: boolean) => {
    setSelectedAnswer(isFakeVote);
    const isCorrect = isFakeVote === currentData.isFake;
    if (isCorrect) setScore(score + 100);
    setGameState("result");

    // Stop audio on answer
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const nextRound = () => {
    if (currentRound + 1 < GAME_ROUNDS.length) {
      setCurrentRound(currentRound + 1);
      setGameState("playing");
      setSelectedAnswer(null);
      setIsPlaying(false);
      setAudioProgress(0);
    } else {
      setGameState("end");
    }
  };

  const restartGame = () => {
    setCurrentRound(0);
    setScore(0);
    setGameState("start");
    setSelectedAnswer(null);
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioError(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-12 animate-in fade-in zoom-in duration-500">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
          Spot the Deepfake
        </h2>
        <p className="text-lg text-muted-foreground">
          Test your ears against the AI. Can you tell what's real?
        </p>
      </div>

      <div className="relative bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* START SCREEN */}
        {gameState === "start" && (
          <div className="z-10 text-center space-y-8">
            <Trophy className="w-24 h-24 mx-auto text-yellow-500 drop-shadow-lg mb-4" />
            <h3 className="text-2xl font-bold">Ready to Challenge AI?</h3>
            <button
              onClick={() => setGameState("playing")}
              className="px-10 py-4 bg-primary text-primary-foreground text-xl font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              Start Game
            </button>
          </div>
        )}

        {/* GAME PLAYING */}
        {(gameState === "playing" || gameState === "result") && (
          <div className="z-10 w-full max-w-lg space-y-8">
            <div className="flex justify-between items-center text-sm font-mono text-muted-foreground uppercase tracking-widest">
              <span>
                Round {currentRound + 1}/{GAME_ROUNDS.length}
              </span>
              <span>Score: {score}</span>
            </div>

            {/* Audio Player */}
            <div className="bg-secondary/80 p-6 rounded-2xl border flex items-center gap-6 shadow-inner">
              <button
                onClick={handlePlayPause}
                disabled={audioError}
                className="w-16 h-16 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? (
                  <Pause className="text-white fill-current" />
                ) : (
                  <Play className="text-white fill-current pl-1" />
                )}
              </button>
              <div className="flex-1 space-y-2">
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  {/* FIX: Progress bar synced to actual audio currentTime */}
                  <motion.div
                    className="h-full bg-primary"
                    style={{ width: `${audioProgress}%` }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {audioError ? (
                    <>
                      <WifiOff size={12} /> Audio unavailable
                    </>
                  ) : (
                    <>
                      <Volume2 size={12} />{" "}
                      {isPlaying ? "Listening..." : "Press play"}
                    </>
                  )}
                </p>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={currentData.audioUrl}
              preload="auto"
              className="hidden"
            />

            {/* Choices */}
            {gameState === "playing" && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleAnswer(false)}
                  className="p-6 rounded-2xl border-2 border-green-500/20 bg-green-500/10 hover:bg-green-500/20 hover:border-green-500 transition-all font-bold text-lg text-green-500 flex flex-col items-center gap-2"
                >
                  <CheckCircle size={32} />
                  REAL
                </button>
                <button
                  onClick={() => handleAnswer(true)}
                  className="p-6 rounded-2xl border-2 border-red-500/20 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500 transition-all font-bold text-lg text-red-500 flex flex-col items-center gap-2"
                >
                  <XCircle size={32} />
                  FAKE
                </button>
              </div>
            )}

            {/* Result Feedback */}
            {gameState === "result" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl text-center space-y-4 border-2 ${
                  selectedAnswer === currentData.isFake
                    ? "bg-green-500/10 border-green-500"
                    : "bg-red-500/10 border-red-500"
                }`}
              >
                <h4
                  className={`text-2xl font-extrabold ${
                    selectedAnswer === currentData.isFake
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {selectedAnswer === currentData.isFake
                    ? "CORRECT!"
                    : "WRONG!"}
                </h4>
                <p className="text-muted-foreground">
                  {currentData.explanation.en}
                </p>
                <button
                  onClick={nextRound}
                  className="px-8 py-3 bg-secondary hover:bg-muted text-foreground font-bold rounded-lg transition-colors"
                >
                  Next Round
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* END SCREEN */}
        {gameState === "end" && (
          <div className="z-10 text-center space-y-6">
            <Trophy className="w-32 h-32 mx-auto text-yellow-400 animate-bounce" />
            <h3 className="text-4xl font-extrabold">Game Over!</h3>
            <div className="text-2xl font-mono p-4 bg-secondary/50 rounded-xl border inline-block">
              Final Score: {score}/{GAME_ROUNDS.length * 100}
            </div>
            <div className="flex justify-center">
              <button
                onClick={restartGame}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:shadow-lg transition-all"
              >
                <RefreshCw size={20} /> Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
