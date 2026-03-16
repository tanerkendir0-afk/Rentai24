import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";

const RATINGS = [
  { emoji: "😞", value: 2, labelKey: "feedback.chatRating.bad" },
  { emoji: "😐", value: 5, labelKey: "feedback.chatRating.neutral" },
  { emoji: "😊", value: 8, labelKey: "feedback.chatRating.good" },
  { emoji: "🤩", value: 10, labelKey: "feedback.chatRating.excellent" },
];

interface ChatRatingProps {
  agentType: string;
  sessionId: string;
}

export default function ChatRating({ agentType, sessionId }: ChatRatingProps) {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = `chat_rated_${sessionId}`;

  if (dismissed || submitted || localStorage.getItem(storageKey)) return null;

  const submitRating = async (score: number) => {
    try {
      await apiRequest("POST", "/api/feedback", {
        type: "chat_rating",
        score,
        agentType,
        comment: null,
      });
      localStorage.setItem(storageKey, "1");
      setSubmitted(true);
      setTimeout(() => setDismissed(true), 2000);
    } catch {
      toast({ title: t("feedback.chatRating.error"), variant: "destructive" });
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-col items-center py-3"
          data-testid="chat-rating"
        >
          {submitted ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              {t("feedback.chatRating.thankYou")}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">{t("feedback.chatRating.question")}</p>
              <div className="flex gap-3">
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => submitRating(r.value)}
                    className="flex flex-col items-center gap-1 hover:scale-125 transition-transform"
                    title={t(r.labelKey)}
                    data-testid={`button-chat-rating-${r.value}`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{t(r.labelKey)}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="text-[10px] text-muted-foreground mt-2 hover:text-foreground"
                data-testid="button-chat-rating-dismiss"
              >
                {t("feedback.chatRating.dismiss")}
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
