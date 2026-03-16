import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserPlus, CreditCard, Zap, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SignupFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
}

export function SignupFlowDialog({ open, onOpenChange, agentName }: SignupFlowDialogProps) {
  const { t } = useTranslation("pages");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground" data-testid="text-signup-dialog-title">
            {t("signupFlow.title", { agentName })}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("signupFlow.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t("signupFlow.step1Title")}</p>
              <p className="text-xs text-muted-foreground">{t("signupFlow.step1Desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t("signupFlow.step2Title")}</p>
              <p className="text-xs text-muted-foreground">{t("signupFlow.step2Desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t("signupFlow.step3Title")}</p>
              <p className="text-xs text-muted-foreground">{t("signupFlow.step3Desc")}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/register" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-signup-dialog">
              {t("signupFlow.signUp")}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" data-testid="button-login-dialog">
              {t("signupFlow.signIn")}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
