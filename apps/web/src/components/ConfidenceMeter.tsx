import { motion } from "framer-motion";

interface ConfidenceMeterProps {
  score: number; // 0 to 1
  isDeepfake: boolean;
}

export function ConfidenceMeter({ score, isDeepfake }: ConfidenceMeterProps) {
  const percentage = Math.round(score * 100);
  const color = isDeepfake ? "text-red-500" : "text-green-500";
  const strokeColor = isDeepfake ? "#ef4444" : "#22c55e";

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-lg border shadow-sm">
      <h3 className="text-lg font-bold mb-4">AI Confidence</h3>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="283" // 2 * pi * 45
            strokeDashoffset="283"
            initial={{ strokeDashoffset: 283 }}
            animate={{ strokeDashoffset: 283 - (283 * percentage) / 100 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{percentage}%</span>
          <span className="text-xs text-muted-foreground">Probability</span>
        </div>
      </div>
      <div className={`mt-4 text-xl font-bold ${color}`}>
        {isDeepfake ? "FAKE DETECTED" : "REAL AUDIO"}
      </div>
    </div>
  );
}
