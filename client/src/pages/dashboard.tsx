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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const handleLogout = async () => {
    await logout();
    setLocation("/");
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
              <p className="text-muted-foreground text-sm mt-1">
                Manage your AI workforce from here
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/workers">
                <Button variant="outline" size="sm" data-testid="button-browse-workers">
                  <Plus className="w-4 h-4 mr-1" />
                  Rent AI Worker
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
      </div>
    </div>
  );
}
