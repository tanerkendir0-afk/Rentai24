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

interface SignupFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
}

export function SignupFlowDialog({ open, onOpenChange, agentName }: SignupFlowDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground" data-testid="text-signup-dialog-title">
            Ready to Hire {agentName}?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign up to hire this AI worker. After registration, choose a plan and your agent will be activated instantly in your dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">1. Create your account</p>
              <p className="text-xs text-muted-foreground">Quick signup — takes less than a minute.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">2. Choose a plan & checkout</p>
              <p className="text-xs text-muted-foreground">Pick a plan that fits your needs. Cancel anytime.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">3. Agent activates instantly</p>
              <p className="text-xs text-muted-foreground">Your AI worker goes live in your dashboard, ready to chat and work.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/register" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-signup-dialog">
              Sign Up Now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" data-testid="button-login-dialog">
              Sign In
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
