import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  ArrowRight,
  Search,
  Plug,
  BarChart3,
  Package,
  Building2,
  Loader2,
  Zap,
  Check,
} from "lucide-react";
import { agents, categories } from "@/data/agents";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SectionCTA from "@/components/section-cta";
import { SignupFlowDialog } from "@/components/signup-flow-dialog";

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

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function Workers() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priceFilter, setPriceFilter] = useState("all");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedAgentName, setSelectedAgentName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const { user } = useAuth();
  const { toast } = useToast();

  async function handleHire(agentId: string) {
    if (!user) {
      const agent = agents.find(a => a.id === agentId);
      setSelectedAgentName(agent?.name || "this AI worker");
      setSignupDialogOpen(true);
      return;
    }

    const agent = agents.find(a => a.id === agentId);
    setSelectedAgentId(agentId);
    setSelectedAgentName(agent?.name || "this AI worker");
    setSelectedPlan("starter");
    setPlanDialogOpen(true);
  }

  async function confirmHire() {
    setPlanDialogOpen(false);
    setCheckingOut(selectedAgentId);
    try {
      const res = await apiRequest("POST", "/api/test-checkout", {
        plan: selectedPlan,
        agentType: selectedAgentId,
        cardNumber: "4242424242424242",
        expiry: "12/28",
        cvc: "123",
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Agent Hired!", description: `${selectedAgentName} is now active on the ${selectedPlan} plan.` });
        window.location.href = "/dashboard?checkout=success";
      }
    } catch (error: any) {
      const msg = error?.message || "Failed to hire agent.";
      if (msg.includes("already have")) {
        toast({ title: "Already Active", description: "You already have this agent active.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    } finally {
      setCheckingOut(null);
    }
  }

  const filtered = useMemo(() => {
    return agents.filter((agent) => {
      const matchSearch =
        search === "" ||
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchCategory =
        categoryFilter === "All" || agent.category === categoryFilter;
      const matchPrice =
        priceFilter === "all" ||
        (priceFilter === "low" && agent.price <= 99) ||
        (priceFilter === "mid" && agent.price > 99 && agent.price <= 139) ||
        (priceFilter === "high" && agent.price > 139);
      return matchSearch && matchCategory && matchPrice;
    });
  }, [search, categoryFilter, priceFilter]);

  return (
    <div className="pt-16">
      <section className="py-12 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-8 sm:mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-workers-title">
              Browse Our{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                AI Workforce
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              Every agent is pre-trained, battle-tested, and ready to deploy.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or skill..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" data-testid="input-search" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-price">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="low">$99 and under</SelectItem>
                <SelectItem value="mid">$100 - $139</SelectItem>
                <SelectItem value="high">$140+</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((agent, i) => {
              const Icon = agentIcons[agent.id] || Bot;
              return (
                <motion.div key={agent.id} {...stagger} transition={{ duration: 0.5, delay: i * 0.08 }}>
                  <Card className="p-4 sm:p-6 bg-card border-border/50 h-full flex flex-col hover-elevate" data-testid={`card-agent-${agent.id}`}>
                    <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-emerald-400">24/7</span>
                      </div>
                    </div>

                    <h3 className="font-semibold text-foreground mb-1">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{agent.role}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{agent.shortDescription}</p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {agent.skills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {agent.skills.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{agent.skills.length - 4}</Badge>
                      )}
                    </div>

                    {agent.tag && (
                      <Badge className="self-start mb-3 bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs no-default-active-elevate">{agent.tag}</Badge>
                    )}

                    <div className="text-xs text-muted-foreground mb-4">
                      <Plug className="w-3 h-3 inline mr-1" />
                      {agent.integrations.slice(0, 3).join(", ")}
                      {agent.integrations.length > 3 && ` +${agent.integrations.length - 3}`}
                    </div>

                    <div className="mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">${agent.price}</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/workers/${agent.slug}`} className="flex-1">
                          <Button variant="outline" className="w-full" size="sm" data-testid={`button-profile-${agent.id}`}>
                            View Profile
                          </Button>
                        </Link>
                        <div className="flex-1">
                          <Button
                            className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                            size="sm"
                            disabled={checkingOut === agent.id}
                            onClick={() => handleHire(agent.id)}
                            data-testid={`button-hire-${agent.id}`}
                          >
                            {checkingOut === agent.id ? (
                              <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</>
                            ) : (
                              "Hire Now"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20" data-testid="text-no-results">
              <Bot className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">Try different filters or search terms.</p>
            </div>
          )}
        </div>
      </section>

      <SectionCTA />

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground" data-testid="text-plan-dialog-title">
              Choose a Plan for {selectedAgentName}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select the plan that fits your needs. You can upgrade or change anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { id: "starter", name: "Starter", price: "$49", msgs: "100 messages/mo", features: ["Basic support", "Standard response time"] },
              { id: "professional", name: "Professional", price: "$39", msgs: "500 messages/mo", features: ["Priority support", "Faster responses", "All tools unlocked"], popular: true },
              { id: "enterprise", name: "Enterprise", price: "Custom", msgs: "5,000 messages/mo", features: ["Dedicated support", "Custom integrations", "SLA guarantee"] },
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
                    Most Popular
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
                    {plan.id !== "enterprise" && <span className="text-xs text-muted-foreground">/mo</span>}
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
                  <p className="text-xs text-muted-foreground ml-6 mt-1 italic">Contact us for enterprise pricing</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
              disabled={!selectedPlan || selectedPlan === "enterprise"}
              onClick={confirmHire}
              data-testid="button-confirm-hire"
            >
              <Zap className="w-4 h-4 mr-1" />
              Confirm & Hire
            </Button>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)} data-testid="button-cancel-plan">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SignupFlowDialog open={signupDialogOpen} onOpenChange={setSignupDialogOpen} agentName={selectedAgentName} />
    </div>
  );
}
