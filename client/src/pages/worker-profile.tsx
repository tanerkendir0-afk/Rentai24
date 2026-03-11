import { useState } from "react";
import { Link, useParams } from "wouter";
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
  ArrowRight,
  Plug,
  Globe,
  BarChart3,
  Package,
  Check,
  Zap,
  Loader2,
} from "lucide-react";
import { agents } from "@/data/agents";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import SectionCTA from "@/components/section-cta";

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

export default function WorkerProfile() {
  const { slug } = useParams<{ slug: string }>();
  const agent = agents.find((a) => a.slug === slug);
  const { user } = useAuth();
  const { toast } = useToast();
  const [renting, setRenting] = useState(false);

  if (!agent) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Worker Not Found</h2>
          <p className="text-muted-foreground mb-6">This AI worker profile doesn't exist.</p>
          <Link href="/workers">
            <Button data-testid="button-back-workers">Browse All Workers</Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = agentIcons[agent.id] || Bot;
  const related = agents.filter((a) => a.id !== agent.id).slice(0, 3);

  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
              <div className="w-20 h-20 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                <Icon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground" data-testid="text-worker-name">
                    {agent.name}
                  </h1>
                  {agent.tag && (
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 no-default-active-elevate">{agent.tag}</Badge>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">Online 24/7</span>
                  </div>
                </div>
                <p className="text-lg text-muted-foreground mb-4">{agent.role}</p>
                <p className="text-muted-foreground leading-relaxed">{agent.fullDescription}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              {user ? (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                  data-testid="button-hire-worker"
                  disabled={renting}
                  onClick={async () => {
                    setRenting(true);
                    try {
                      const res = await fetch("/api/rentals", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ agentType: agent.id, plan: "starter" }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        toast({ title: "Notice", description: data.error, variant: "destructive" });
                      } else {
                        toast({ title: "Worker Rented!", description: `${agent.name} has been added to your dashboard.` });
                        queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
                      }
                    } catch {
                      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
                    } finally {
                      setRenting(false);
                    }
                  }}
                >
                  {renting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Rent This Worker
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Link href="/login">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-hire-worker">
                    Sign In to Rent
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
              <Link href={`/demo?agent=${agent.id}`}>
                <Button size="lg" variant="outline" data-testid="button-try-demo">
                  Try Demo
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {agent.metrics.map((m) => (
                <Card key={m.label} className="p-4 bg-card border-border/50 text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-1">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card className="p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Skills & Capabilities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {agent.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Plug className="w-4 h-4 text-blue-400" />
                  Integrations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {agent.integrations.map((integ) => (
                    <span key={integ} className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
                      <Plug className="w-3 h-3" />
                      {integ}
                    </span>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card className="p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {agent.languages.map((lang) => (
                    <Badge key={lang} variant="secondary">{lang}</Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-card border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Pricing</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">${agent.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Includes all features, integrations, and 24/7 availability. 14-day free trial, no credit card required.
                </p>
              </Card>
            </div>

            <Card className="p-6 bg-card border-border/50 mb-12">
              <h3 className="font-semibold text-foreground mb-4">Use Cases</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agent.useCases.map((uc) => (
                  <li key={uc} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {uc}
                  </li>
                ))}
              </ul>
            </Card>

            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">Related Workers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
    </div>
  );
}
