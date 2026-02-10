import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Trophy,
  RefreshCw,
  Volume2,
} from "lucide-react";

// Sample Game Data (Simulated)
const GAME_ROUNDS = [
  {
    id: 1,
    audioUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav", // Placeholder
    isFake: true,
    difficulty: "Easy",
    explanation: {
      en: "Notice the robotic glitch at 0:04.",
      hi: "0:04 पर रोबोटिक आवाज़ पर ध्यान दें।",
    },
  },
  {
    id: 2,
    audioUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav", // Placeholder
    isFake: false,
    difficulty: "Medium",
    explanation: {
      en: "Natural breathing patterns and consistent background noise.",
      hi: "सांस लेने का तरीका प्राकृतिक है और शोर एक जैसा है।",
    },
  },
  {
    id: 3,
    audioUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav", // Placeholder
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentData = GAME_ROUNDS[currentRound];

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAnswer = (isFakeVote: boolean) => {
    setSelectedAnswer(isFakeVote);
    const isCorrect = isFakeVote === currentData.isFake;
    if (isCorrect) setScore(score + 100);
    setGameState("result");
  };

  const nextRound = () => {
    if (currentRound + 1 < GAME_ROUNDS.length) {
      setCurrentRound(currentRound + 1);
      setGameState("playing");
      setSelectedAnswer(null);
      setIsPlaying(false);
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
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-12 animate-in fade-in zoom-in duration-500">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
          🎮 Spot the Deepfake
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
                className="w-16 h-16 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
              >
                {isPlaying ? (
                  <Pause className="text-white fill-current" />
                ) : (
                  <Play className="text-white fill-current pl-1" />
                )}
              </button>
              <div className="flex-1 space-y-2">
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: isPlaying ? "100%" : "0%" }}
                    transition={{
                      duration: 10,
                      ease: "linear",
                      repeat: isPlaying ? Infinity : 0,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Volume2 size={12} /> Listening...
                </p>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={currentData.audioUrl}
              onEnded={() => setIsPlaying(false)}
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
                className={`p-6 rounded-2xl text-center space-y-4 border-2 ${selectedAnswer === currentData.isFake ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500"}`}
              >
                <h4
                  className={`text-2xl font-extrabold ${selectedAnswer === currentData.isFake ? "text-green-500" : "text-red-500"}`}
                >
                  {selectedAnswer === currentData.isFake
                    ? "CORRECT! 🎉"
                    : "WRONG! ❌"}
                </h4>
                <p className="text-muted-foreground">
                  {/* @ts-ignore */}
                  {currentData.explanation["en"]}{" "}
                  {/* Fix properly with language context later */}
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
              Final Score: {score}
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
