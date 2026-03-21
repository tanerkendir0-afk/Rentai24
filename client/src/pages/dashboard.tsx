import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAnalytics } from "@/lib/analytics";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalizedAgents } from "@/hooks/use-localized-agents";
import {
  Bot,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  BarChart3,
  Package,
  Building2,
  MessageSquare,
  Plus,
  Zap,
  LogOut,
  Loader2,
  Gauge,
  Activity,
  Mail,
  UserPlus,
  Clock,
  Calendar,
  Edit,
  Send,
  FileText,
  Repeat,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle,
  Flame,
  ArrowRight,
  Search,
  Ticket,
  CheckSquare,
  Bell,
  LineChart,
  Hash,
  Receipt,
  DollarSign,
  Briefcase,
  ClipboardList,
  Tag,
  Star,
  Settings,
  Bolt,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Rental {
  id: number;
  agentType: string;
  agentName: string;
  plan: string;
  status: string;
  messagesUsed: number;
  messagesLimit: number;
  startedAt: string;
  expiresAt: string | null;
}

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

const agentPersonas: Record<string, string> = {
  "customer-support": "Ava",
  "sales-sdr": "Rex",
  "social-media": "Maya",
  "bookkeeping": "Finn",
  "scheduling": "Cal",
  "hr-recruiting": "Harper",
  "data-analyst": "DataBot",
  "ecommerce-ops": "ShopBot",
  "real-estate": "Reno",
};

export default function Dashboard() {
  const { t } = useTranslation("pages");
  const allAgents = useLocalizedAgents();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();

  const { data: rentals, isLoading } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
    enabled: !!user,
  });

  const { data: subscriptionData } = useQuery<{ subscription: any }>({
    queryKey: ["/api/stripe/subscription"],
    enabled: !!user,
  });

  const { data: agentActions } = useQuery<any[]>({
    queryKey: ["/api/agent-actions"],
    enabled: !!user,
  });

  const { data: boostStatus } = useQuery<{
    active: boolean;
    plan: string | null;
    maxParallelTasks: number;
    activeTaskCount: number;
  }>({
    queryKey: ["/api/boost/status"],
    enabled: !!user,
  });

  const { data: campaigns } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
    enabled: !!user,
  });

  const activeCampaigns = campaigns?.filter((c: any) => c.status === "active") || [];

  const { data: smartAlerts } = useQuery<any[]>({
    queryKey: ["/api/smart-alerts"],
    enabled: !!user,
  });

  const [installingAgent, setInstallingAgent] = useState<string | null>(null);

  async function handleInstallAgent(agentId: string) {
    setInstallingAgent(agentId);
    try {
      const res = await apiRequest("POST", "/api/test-checkout", {
        plan: "standard",
        agentType: agentId,
        cardNumber: "4242424242424242",
        expiry: "12/28",
        cvc: "123",
      });
      const data = await res.json();
      if (data.success) {
        trackEvent("agent_rented", "agent", { agentType: agentId, plan: "standard" });
        toast({ title: t("dashboard.toast.agentActivated"), description: t("dashboard.toast.agentActivatedDesc") });
        queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      }
    } catch (error: any) {
      const msg = error?.message || t("dashboard.toast.failedToActivate");
      if (msg.includes("already have")) {
        toast({ title: t("dashboard.toast.alreadyActive"), description: t("dashboard.toast.alreadyActiveDesc"), variant: "destructive" });
      } else {
        toast({ title: t("dashboard.toast.error"), description: msg, variant: "destructive" });
      }
    } finally {
      setInstallingAgent(null);
    }
  }

  const hasSalesAgent = rentals?.some(r => r.agentType === "sales-sdr" && r.status === "active");

  const { data: emailStatus } = useQuery<{ provider: string; address: string | null; connected: boolean }>({
    queryKey: ["/api/email-status"],
    enabled: !!user && !!hasSalesAgent,
  });

  const hasSubscription = !!user?.hasSubscription;
  const subscription = subscriptionData?.subscription;
  const planName = subscription?.metadata?.plan
    ? subscription.metadata.plan.charAt(0).toUpperCase() + subscription.metadata.plan.slice(1)
    : null;
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
    : null;

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
      toast({ title: t("dashboard.toast.agentActivated"), description: t("dashboard.toast.newWorkerReady") });
      window.history.replaceState({}, "", "/dashboard");
    }
    if (params.get("boost") === "success") {
      queryClient.invalidateQueries({ queryKey: ["/api/boost/status"] });
      toast({ title: t("dashboard.boost.title"), description: t("dashboard.boost.statusActive") });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || !user) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRentals = rentals?.filter((r) => r.status === "active") || [];
  const totalMessages = activeRentals.reduce((sum, r) => sum + r.messagesUsed, 0);
  const totalLimit = activeRentals.reduce((sum, r) => sum + r.messagesLimit, 0);
  const rentedAgentIds = new Set(activeRentals.map(r => r.agentType));
  const availableAgents = allAgents.filter(a => !rentedAgentIds.has(a.id));

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-dashboard-welcome">
                {t("dashboard.welcome", { name: user.fullName })}
              </h1>
              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2 flex-wrap">
                {t("dashboard.manageSubtitle")}
                {hasSubscription ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30" data-testid="badge-subscription-active">
                    {planName ? t("dashboard.planLabel", { plan: planName }) : t("dashboard.activeSubscription")}
                    {renewalDate ? ` · ${t("dashboard.renewsOn", { date: renewalDate })}` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" data-testid="badge-no-subscription">
                    {t("dashboard.noSubscription")}
                  </span>
                )}
                {emailStatus && hasSalesAgent && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      emailStatus.provider === "gmail"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    }`}
                    data-testid="badge-email-status"
                  >
                    <Mail className="w-3 h-3" />
                    {emailStatus.provider === "gmail"
                      ? t("dashboard.gmailConnected", { address: emailStatus.address || t("dashboard.connected") })
                      : t("dashboard.platformEmail")}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/workers">
                <Button variant="outline" size="sm" data-testid="button-browse-workers">
                  <Plus className="w-4 h-4 mr-1" />
                  {t("dashboard.rentWorker")}
                </Button>
              </Link>
              <Link href="/dashboard/tasks">
                <Button variant="outline" size="sm" data-testid="button-tasks-dashboard">
                  <ClipboardList className="w-4 h-4 mr-1" />
                  Görev Takibi
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm" data-testid="button-settings">
                  <Settings className="w-4 h-4 mr-1" />
                  {t("dashboard.settings")}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-1" />
                {t("dashboard.signOut")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-5 bg-card border-border/50">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-active-workers">
                  {activeRentals.length}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("dashboard.stats.activeWorkers")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5 bg-card border-border/50">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-messages-used">
                  {totalMessages}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("dashboard.stats.messagesUsed")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5 bg-card border-border/50">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-messages-remaining">
                  {totalLimit - totalMessages}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("dashboard.stats.msgsRemaining")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-5 bg-card border-border/50">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <Repeat className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-active-campaigns">
                  {activeCampaigns.length}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("dashboard.stats.activeCampaigns")}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-6 sm:mb-8">
          {boostStatus?.active ? (
            <Card className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/30" data-testid="card-boost-active">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Bolt className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{t("dashboard.boost.title")}</h3>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs" data-testid="badge-boost-plan">
                        {t(`pricing.boost.plans.${boostStatus.plan}.name`, { defaultValue: boostStatus.plan })}
                      </Badge>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">
                        {t("dashboard.boost.statusActive")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-boost-slots">
                      {boostStatus.maxParallelTasks === -1
                        ? t("dashboard.boost.slotsUnlimited", { used: boostStatus.activeTaskCount })
                        : t("dashboard.boost.slotsUsed", { used: boostStatus.activeTaskCount, max: boostStatus.maxParallelTasks })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {boostStatus.maxParallelTasks !== -1 && (
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: Math.min(boostStatus.maxParallelTasks, 7) }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${
                            i < boostStatus.activeTaskCount
                              ? "bg-amber-400"
                              : "bg-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  <Link href="/pricing">
                    <Button size="sm" variant="outline" className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" data-testid="button-boost-manage">
                      {t("dashboard.boost.managePlan")}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 sm:p-5 bg-card border-border/50 border-dashed" data-testid="card-boost-cta">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                    <Bolt className="w-5 h-5 text-amber-400/60" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{t("dashboard.boost.getBoost")}</h3>
                    <p className="text-xs text-muted-foreground">{t("dashboard.boost.getBoostDesc")}</p>
                  </div>
                </div>
                <Link href="/pricing#boost">
                  <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs" data-testid="button-boost-get">
                    <Bolt className="w-3 h-3 mr-1" />
                    {t("dashboard.boost.getBoost")}
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-workers-section">
          {t("dashboard.yourWorkers")}
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeRentals.length === 0 ? (
          <Card className="p-12 bg-card border-border/50 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-no-workers">
              {t("dashboard.noWorkersTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {t("dashboard.noWorkersDesc")}
            </p>
            <Link href="/workers">
              <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-get-started">
                {t("dashboard.browseWorkers")}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRentals.map((rental, i) => {
              const Icon = agentIcons[rental.agentType] || Bot;
              const persona = agentPersonas[rental.agentType] || "";
              const usagePercent = Math.round((rental.messagesUsed / rental.messagesLimit) * 100);

              return (
                <motion.div
                  key={rental.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-5 bg-card border-border/50 hover:border-blue-500/30 transition-colors" data-testid={`card-rental-${rental.agentType}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{persona}</h3>
                          <p className="text-xs text-muted-foreground">{rental.agentName}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-400 border-0">
                        {t("dashboard.active")}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{t("dashboard.usage")}</span>
                        <span>{rental.messagesUsed} / {rental.messagesLimit}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-yellow-500" : "bg-gradient-to-r from-blue-500 to-violet-500"
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground capitalize">
                        {t("dashboard.planLabel", { plan: rental.plan })}
                      </span>
                      <Link href={`/chat?agent=${rental.agentType}`}>
                        <Button size="sm" variant="outline" className="text-xs" data-testid={`button-chat-${rental.agentType}`}>
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {t("dashboard.chat")}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {availableAgents.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-foreground" data-testid="text-available-workers">{t("dashboard.availableWorkers")}</h2>
              <Badge variant="secondary" className="text-xs">{availableAgents.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {availableAgents.map((agent, i) => {
                const Icon = agentIcons[agent.id] || Bot;
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="p-4 bg-card border-border/50 hover:border-violet-500/30 transition-colors" data-testid={`card-available-${agent.id}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">{agent.name}</h4>
                          <p className="text-xs text-muted-foreground">{agent.priceLabel}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.shortDescription}</p>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                        disabled={installingAgent === agent.id}
                        onClick={() => handleInstallAgent(agent.id)}
                        data-testid={`button-install-${agent.id}`}
                      >
                        {installingAgent === agent.id ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t("dashboard.processing")}</>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 mr-1" />
                            {t("dashboard.hireNow")}
                          </>
                        )}
                      </Button>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {smartAlerts && smartAlerts.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base sm:text-lg font-semibold text-foreground" data-testid="text-alerts-title">{t("dashboard.smartAlerts")}</h2>
              <Badge variant="secondary" className="text-xs">{smartAlerts.length}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3" data-testid="smart-alerts-grid">
              {smartAlerts.slice(0, 8).map((alert: any, i: number) => {
                const severityConfig: Record<string, { icon: any; bg: string; text: string; border: string }> = {
                  urgent: { icon: AlertCircle, bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
                  warning: { icon: AlertTriangle, bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
                  info: { icon: Info, bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
                  success: { icon: Flame, bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
                };
                const config = severityConfig[alert.severity] || severityConfig.info;
                const AlertIcon = config.icon;

                const actionLabelMap: Record<string, string> = {
                  stale_new: t("dashboard.alertActions.sendOutreach"),
                  stale_contacted: t("dashboard.alertActions.followUp"),
                  qualified_waiting: t("dashboard.alertActions.createProposal"),
                  proposal_stale: t("dashboard.alertActions.checkIn"),
                  hot_lead: t("dashboard.alertActions.prioritize"),
                };
                const actionLabel = actionLabelMap[alert.type] || null;

                return (
                  <Card key={i} className={`p-3 ${config.bg} border ${config.border}`} data-testid={`smart-alert-${i}`}>
                    <div className="flex items-start gap-3">
                      <AlertIcon className={`w-4 h-4 ${config.text} mt-0.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${config.text}`}>{alert.message}</p>
                        {actionLabel && alert.leadId && (
                          <Link href="/chat?agent=sales-sdr" data-testid={`alert-action-${i}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`mt-2 h-7 px-2 text-xs ${config.text} hover:bg-white/10`}
                            >
                              {actionLabel}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {agentActions && agentActions.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
              <h2 className="text-base sm:text-lg font-semibold text-foreground" data-testid="text-actions-title">{t("dashboard.activityLog")}</h2>
              <Badge variant="secondary" className="text-xs">{agentActions.length}</Badge>
            </div>
            <Card className="bg-card border-border/50 divide-y divide-border/50" data-testid="card-actions-log">
              {agentActions.slice(0, 20).map((action: any, i: number) => {
                const actionIcons: Record<string, any> = {
                  email_sent: Mail,
                  lead_added: UserPlus,
                  lead_updated: Edit,
                  followup_scheduled: Clock,
                  meeting_created: Calendar,
                  bulk_email_sent: Send,
                  template_email_sent: FileText,
                  drip_campaign_started: Repeat,
                  drip_email_sent: Repeat,
                  leads_scored: BarChart3,
                  proposal_created: FileText,
                  proposal_sent: Send,
                  competitor_analysis: Search,
                  ticket_created: Ticket,
                  ticket_updated: Ticket,
                  ticket_closed: CheckSquare,
                  customer_email_sent: Mail,
                  appointment_created: Calendar,
                  reminder_sent: Bell,
                  reminder_scheduled: Clock,
                  report_generated: LineChart,
                  post_created: Share2,
                  content_calendar_created: CalendarCheck,
                  hashtags_generated: Hash,
                  response_drafted: MessageSquare,
                  invoice_created: Receipt,
                  expense_logged: DollarSign,
                  financial_summary: BarChart3,
                  job_posting_created: Briefcase,
                  resume_screened: ClipboardList,
                  interview_kit_created: ClipboardList,
                  candidate_email_sent: Mail,
                  listing_optimized: Tag,
                  price_analysis: DollarSign,
                  review_response_drafted: Star,
                  image_generated: Activity,
                  stock_image_found: Activity,
                };
                const ActionIcon = actionIcons[action.actionType] || Activity;

                return (
                  <div key={action.id} className="flex items-start gap-3 px-4 py-3" data-testid={`action-item-${i}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ActionIcon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{action.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">{agentPersonas[action.agentType] || action.agentType}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{new Date(action.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
