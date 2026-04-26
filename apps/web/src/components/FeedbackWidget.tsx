import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useApiClient } from "@/api/client";

interface FeedbackWidgetProps {
  scanId: string | number; // FIX: Accept both string and number (DB uses serial/int)
}

export function FeedbackWidget({ scanId }: FeedbackWidgetProps) {
  const { submitFeedback } = useApiClient();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleFeedback = async (type: "thumbsup" | "thumbsdown") => {
    setStatus("loading");
    try {
      // FIX: Convert to string for API call consistency
      await submitFeedback(String(scanId), type);
      setStatus("success");
    } catch (error) {
      console.error("Feedback submission failed:", error);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100 animate-in fade-in">
        <Check size={16} />
        <span className="text-sm font-medium">Thanks for your feedback!</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
        <span className="text-sm font-medium">
          Failed to submit. Please try again.
        </span>
        <button
          onClick={() => setStatus("idle")}
          className="text-xs underline ml-2"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
      <span className="text-sm font-medium text-muted-foreground">
        Was this result accurate?
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => handleFeedback("thumbsup")}
          disabled={status === "loading"}
          className="p-2 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors text-muted-foreground disabled:opacity-50"
          title="Yes, correct"
        >
          <ThumbsUp size={18} />
        </button>
        <button
          onClick={() => handleFeedback("thumbsdown")}
          disabled={status === "loading"}
          className="p-2 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors text-muted-foreground disabled:opacity-50"
          title="No, incorrect"
        >
          <ThumbsDown size={18} />
        </button>
      </div>
    </div>
  );
}
