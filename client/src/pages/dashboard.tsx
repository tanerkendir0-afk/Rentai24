import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  MessageSquare,
  Plus,
  LogOut,
  Loader2,
  Gauge,
  CreditCard,
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
  Search,
  Ticket,
  CheckSquare,
  Bell,
  LineChart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
};

export default function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  const { data: campaigns } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
    enabled: !!user,
  });

  const activeCampaigns = campaigns?.filter((c: any) => c.status === "active") || [];

  const { data: smartAlerts } = useQuery<any[]>({
    queryKey: ["/api/smart-alerts"],
    enabled: !!user,
  });

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

  const handleManageBilling = async () => {
    try {
      const res = await apiRequest("POST", "/api/stripe/portal", {});
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast({ title: "No billing account", description: "Subscribe to a plan first to manage billing.", variant: "destructive" });
    }
  };

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

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-welcome">
                Welcome, {user.fullName}
              </h1>
              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2 flex-wrap">
                Manage your AI workforce from here
                {hasSubscription ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30" data-testid="badge-subscription-active">
                    {planName ? `${planName} Plan` : 'Active Subscription'}
                    {renewalDate ? ` · Renews ${renewalDate}` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" data-testid="badge-no-subscription">
                    No Subscription
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
                      ? `Gmail: ${emailStatus.address || "Connected"}`
                      : "Platform Email"}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/workers">
                <Button variant="outline" size="sm" data-testid="button-browse-workers">
                  <Plus className="w-4 h-4 mr-1" />
                  Rent AI Worker
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleManageBilling} data-testid="button-manage-billing">
                <CreditCard className="w-4 h-4 mr-1" />
                Manage Billing
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 bg-card border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-active-workers">
                  {activeRentals.length}
                </p>
                <p className="text-xs text-muted-foreground">Active Workers</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-card border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-messages-used">
                  {totalMessages}
                </p>
                <p className="text-xs text-muted-foreground">Messages Used</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-card border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-messages-remaining">
                  {totalLimit - totalMessages}
                </p>
                <p className="text-xs text-muted-foreground">Messages Remaining</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-card border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Repeat className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-active-campaigns">
                  {activeCampaigns.length}
                </p>
                <p className="text-xs text-muted-foreground">Active Campaigns</p>
              </div>
            </div>
          </Card>
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-workers-section">
          Your AI Workers
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
              No AI Workers Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Browse our catalog and rent your first AI worker to get started.
            </p>
            <Link href="/workers">
              <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-get-started">
                Browse AI Workers
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
                        Active
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Usage</span>
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
                        {rental.plan} Plan
                      </span>
                      <Link href={`/demo?agent=${rental.agentType}`}>
                        <Button size="sm" variant="outline" className="text-xs" data-testid={`button-chat-${rental.agentType}`}>
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {smartAlerts && smartAlerts.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-foreground" data-testid="text-alerts-title">Smart Alerts</h2>
              <Badge variant="secondary" className="text-xs">{smartAlerts.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="smart-alerts-grid">
              {smartAlerts.slice(0, 8).map((alert: any, i: number) => {
                const severityConfig: Record<string, { icon: any; bg: string; text: string; border: string }> = {
                  urgent: { icon: AlertCircle, bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
                  warning: { icon: AlertTriangle, bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
                  info: { icon: Info, bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
                  success: { icon: Flame, bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
                };
                const config = severityConfig[alert.severity] || severityConfig.info;
                const AlertIcon = config.icon;

                return (
                  <Card key={i} className={`p-3 ${config.bg} border ${config.border}`} data-testid={`smart-alert-${i}`}>
                    <div className="flex items-start gap-3">
                      <AlertIcon className={`w-4 h-4 ${config.text} mt-0.5 shrink-0`} />
                      <p className={`text-sm ${config.text}`}>{alert.message}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {agentActions && agentActions.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground" data-testid="text-actions-title">Agent Activity Log</h2>
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
                  competitor_analysis: Search,
                  ticket_created: Ticket,
                  ticket_updated: Ticket,
                  ticket_closed: CheckSquare,
                  customer_email_sent: Mail,
                  appointment_created: Calendar,
                  reminder_sent: Bell,
                  reminder_scheduled: Clock,
                  report_generated: LineChart,
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
  );
}
