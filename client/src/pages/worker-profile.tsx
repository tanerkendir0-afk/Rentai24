import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Bot,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  ArrowRight,
  Plug,
  Globe,
  BarChart3,
  Package,
  Building2,
  Check,
  Zap,
  Loader2,
} from "lucide-react";
import { agents } from "@/data/agents";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SectionCTA from "@/components/section-cta";
import { SignupFlowDialog } from "@/components/signup-flow-dialog";
import { useTranslation } from "react-i18next";

const agentIcons: Record<string, any> = {
  "customer-support": Headphones,
  "sales-sdr": TrendingUp,
  "social-media": Share2,
  "bookkeeping": Calculator,
  "scheduling": CalendarCheck,
  "hr-recruiting": Users,
  "data-analyst": BarChart3,
  "ecommerce-ops": Package,
  "real-estate": Building2,
};

export default function WorkerProfile() {
  const { t } = useTranslation("pages");
  const { slug } = useParams<{ slug: string }>();
  const agent = agents.find((a) => a.slug === slug);
  const { user } = useAuth();
  const { toast } = useToast();
  const [renting, setRenting] = useState(false);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("starter");

  if (!agent) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("workerProfile.notFound.title")}</h2>
          <p className="text-muted-foreground mb-6">{t("workerProfile.notFound.description")}</p>
          <Link href="/workers">
            <Button data-testid="button-back-workers">{t("workerProfile.notFound.browseAll")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = agentIcons[agent.id] || Bot;
  const related = agents.filter((a) => a.id !== agent.id).slice(0, 3);

  return (
    <div className="pt-16">
      <section className="py-12 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground" data-testid="text-worker-name">
                    {agent.name}
                  </h1>
                  {agent.tag && (
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 no-default-active-elevate">{agent.tag}</Badge>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">{t("workerProfile.online247")}</span>
                  </div>
                </div>
                <p className="text-base sm:text-lg text-muted-foreground mb-3 sm:mb-4">{agent.role}</p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{agent.fullDescription}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6 sm:mb-8">
              {user ? (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                  data-testid="button-hire-worker"
                  disabled={renting}
                  onClick={() => {
                    setSelectedPlan("starter");
                    setPlanDialogOpen(true);
                  }}
                >
                  {renting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  {t("workerProfile.hireNow")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                  data-testid="button-hire-worker"
                  onClick={() => setSignupDialogOpen(true)}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {t("workerProfile.hireNow")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              <Link href={`/demo?agent=${agent.id}`}>
                <Button size="lg" variant="outline" data-testid="button-try-demo">
                  {t("workerProfile.tryDemo")}
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
              {agent.metrics.map((m) => (
                <Card key={m.label} className="p-3 sm:p-4 bg-card border-border/50 text-center">
                  <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-1">{m.value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{m.label}</div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
              <Card className="p-4 sm:p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  {t("workerProfile.skillsTitle")}
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {agent.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-4 sm:p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                  <Plug className="w-4 h-4 text-blue-400" />
                  {t("workerProfile.integrationsTitle")}
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {agent.integrations.map((integ) => (
                    <span key={integ} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground bg-muted/50 rounded-md px-2 sm:px-3 py-1 sm:py-1.5">
                      <Plug className="w-3 h-3" />
                      {integ}
                    </span>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
              <Card className="p-4 sm:p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  {t("workerProfile.languagesTitle")}
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {agent.languages.map((lang) => (
                    <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-4 sm:p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-3 sm:mb-4">{t("workerProfile.pricingTitle")}</h3>
                <div className="mb-3 sm:mb-4">
                  <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">${agent.price}</span>
                  <span className="text-muted-foreground">{t("workerProfile.perMonth")}</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("workerProfile.pricingDesc")}
                </p>
              </Card>
            </div>

            <Card className="p-4 sm:p-6 bg-card border-border/50 mb-8 sm:mb-12">
              <h3 className="font-semibold text-foreground mb-3 sm:mb-4">{t("workerProfile.useCasesTitle")}</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {agent.useCases.map((uc) => (
                  <li key={uc} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {uc}
                  </li>
                ))}
              </ul>
            </Card>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">{t("workerProfile.relatedWorkers")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {related.map((r) => {
                  const RIcon = agentIcons[r.id] || Bot;
                  return (
                    <Link key={r.id} href={`/workers/${r.slug}`}>
                      <Card className="p-5 bg-card border-border/50 hover-elevate cursor-pointer" data-testid={`card-related-${r.id}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                            <RIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground text-sm">{r.name}</h4>
                            <p className="text-xs text-muted-foreground">${r.price}/mo</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.shortDescription}</p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <SectionCTA />

      <SignupFlowDialog open={signupDialogOpen} onOpenChange={setSignupDialogOpen} agentName={agent.name} />

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground" data-testid="text-plan-dialog-title">
              {t("workerProfile.planDialog.title", { name: agent?.name })}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("workerProfile.planDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { id: "starter", name: t("workers.planDialog.starter"), price: t("workers.planDialog.starterPrice"), msgs: t("workers.planDialog.starterMsgs"), features: [t("workers.planDialog.basicSupport"), t("workers.planDialog.standardResponse")] },
              { id: "professional", name: t("workers.planDialog.professional"), price: t("workers.planDialog.professionalPrice"), msgs: t("workers.planDialog.professionalMsgs"), features: [t("workers.planDialog.prioritySupport"), t("workers.planDialog.fasterResponses"), t("workers.planDialog.allToolsUnlocked")], popular: true },
              { id: "enterprise", name: t("workers.planDialog.enterprise"), price: t("workers.planDialog.enterprisePrice"), msgs: t("workers.planDialog.enterpriseMsgs"), features: [t("workers.planDialog.dedicatedSupport"), t("workers.planDialog.customIntegrations"), t("workers.planDialog.slaGuarantee")] },
            ].map((plan) => (
              <div
                key={plan.id}
                onClick={() => plan.id !== "enterprise" && setSelectedPlan(plan.id)}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-border hover:border-blue-500/30"
                } ${plan.id === "enterprise" ? "opacity-60 cursor-not-allowed" : ""}`}
                data-testid={`plan-option-${plan.id}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 right-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs border-0">
                    {t("workers.planDialog.mostPopular")}
                  </Badge>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? "border-blue-500" : "border-muted-foreground/30"
                    }`}>
                      {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <span className="font-semibold text-foreground">{plan.name}</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-foreground">{plan.price}</span>
                    {plan.id !== "enterprise" && <span className="text-xs text-muted-foreground">{t("workers.perMonth")}</span>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground ml-6 mb-1">{plan.msgs}</p>
                <div className="flex flex-wrap gap-1.5 ml-6">
                  {plan.features.map((f) => (
                    <span key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" /> {f}
                    </span>
                  ))}
                </div>
                {plan.id === "enterprise" && (
                  <p className="text-xs text-muted-foreground ml-6 mt-1 italic">{t("workers.planDialog.contactEnterprise")}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
              disabled={!selectedPlan || selectedPlan === "enterprise" || renting}
              onClick={async () => {
                setPlanDialogOpen(false);
                setRenting(true);
                try {
                  const res = await apiRequest("POST", "/api/test-checkout", {
                    plan: selectedPlan,
                    agentType: agent!.id,
                    cardNumber: "4242424242424242",
                    expiry: "12/28",
                    cvc: "123",
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast({ title: t("workerProfile.toast.workerHired"), description: t("workerProfile.toast.workerHiredDesc", { name: agent!.name, plan: selectedPlan }) });
                    window.location.href = "/dashboard?checkout=success";
                  }
                } catch (error: any) {
                  const msg = error?.message || t("workerProfile.toast.somethingWrong");
                  toast({ title: t("workerProfile.toast.error"), description: msg, variant: "destructive" });
                } finally {
                  setRenting(false);
                }
              }}
              data-testid="button-confirm-hire"
            >
              <Zap className="w-4 h-4 mr-1" />
              {t("workerProfile.planDialog.confirmHire")}
            </Button>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)} data-testid="button-cancel-plan">
              {t("workerProfile.planDialog.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
