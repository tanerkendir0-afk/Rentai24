import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquarePlus, Send, Loader2 } from "lucide-react";

export function FeedbackButton() {
  const { t } = useTranslation("pages");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-4 left-4 z-40 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          title={t("feedback.general.title")}
          data-testid="button-feedback-open"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-feedback">
        <DialogHeader>
          <DialogTitle>{t("feedback.general.title")}</DialogTitle>
        </DialogHeader>
        <FeedbackForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackForm({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/feedback", {
        type: "general",
        category: category || "general",
        comment: comment.trim(),
      });
      toast({ title: t("feedback.general.thankYou") });
      setComment("");
      setCategory("");
      onSuccess?.();
    } catch {
      toast({ title: t("feedback.general.error"), variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("feedback.general.description")}</p>
      <div>
        <Label className="text-sm">{t("feedback.general.category")}</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="mt-1.5" data-testid="select-feedback-category">
            <SelectValue placeholder={t("feedback.general.selectCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bug_report">{t("feedback.general.categories.bugReport")}</SelectItem>
            <SelectItem value="feature_request">{t("feedback.general.categories.featureRequest")}</SelectItem>
            <SelectItem value="general">{t("feedback.general.categories.general")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-sm">{t("feedback.general.comment")}</Label>
        <Textarea
          placeholder={t("feedback.general.commentPlaceholder")}
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="mt-1.5 h-24 resize-none"
          data-testid="textarea-feedback-comment"
        />
      </div>
      <Button
        onClick={submit}
        disabled={!comment.trim() || submitting}
        className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
        data-testid="button-feedback-submit"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{t("feedback.general.sending")}</>
        ) : (
          <><Send className="w-4 h-4 mr-1.5" />{t("feedback.general.send")}</>
        )}
      </Button>
    </div>
  );
}
