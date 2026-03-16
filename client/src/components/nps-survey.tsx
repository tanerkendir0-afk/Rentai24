import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NPS_DISMISS_KEY = "rentai_nps_dismissed_at";

export default function NpsSurvey() {
  const { user } = useAuth();
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissed = localStorage.getItem(NPS_DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (dismissedAt > thirtyDaysAgo) return;
    }
    fetch("/api/feedback/nps-status", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.isDue) {
          setTimeout(() => setVisible(true), 3000);
        }
      })
      .catch(() => {});
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(NPS_DISMISS_KEY, new Date().toISOString());
    setVisible(false);
  };

  const submit = async () => {
    if (score === null) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/feedback", {
        type: "nps",
        score,
        comment: comment.trim() || null,
      });
      localStorage.setItem(NPS_DISMISS_KEY, new Date().toISOString());
      toast({ title: t("feedback.nps.thankYou") });
      setVisible(false);
    } catch {
      toast({ title: t("feedback.nps.error"), variant: "destructive" });
    }
    setSubmitting(false);
  };

  const getScoreColor = (s: number) => {
    if (s <= 6) return "bg-red-500/80 hover:bg-red-500";
    if (s <= 8) return "bg-yellow-500/80 hover:bg-yellow-500";
    return "bg-emerald-500/80 hover:bg-emerald-500";
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50 w-[340px]"
          data-testid="nps-survey"
        >
          <Card className="p-4 bg-card border-border shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">{t("feedback.nps.title")}</h4>
              <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" data-testid="button-nps-dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t("feedback.nps.question")}</p>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                    score === i
                      ? `${getScoreColor(i)} text-white scale-110`
                      : "bg-muted hover:bg-muted-foreground/20 text-muted-foreground"
                  }`}
                  data-testid={`button-nps-score-${i}`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
              <span>{t("feedback.nps.notLikely")}</span>
              <span>{t("feedback.nps.veryLikely")}</span>
            </div>
            {score !== null && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <Textarea
                  placeholder={t("feedback.nps.commentPlaceholder")}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="text-sm mb-3 h-16 resize-none"
                  data-testid="textarea-nps-comment"
                />
              </motion.div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={dismiss} data-testid="button-nps-skip">
                {t("feedback.nps.skip")}
              </Button>
              <Button
                size="sm"
                disabled={score === null || submitting}
                onClick={submit}
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                data-testid="button-nps-submit"
              >
                <Send className="w-3 h-3 mr-1" />
                {t("feedback.nps.submit")}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
