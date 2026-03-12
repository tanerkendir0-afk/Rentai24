import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Sparkles, Shield, Zap, Users, Globe, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Copy, Info } from "lucide-react";
import SectionCTA from "@/components/section-cta";

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: any;
  active: boolean;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  prices: StripePrice[];
}

const fallbackPlans = [
  {
    name: "Starter",
    price: "$49",
    per: "/mo per worker",
    desc: "Perfect for small businesses getting started with AI",
    featured: false,
    plan: "starter",
    features: [
      "1 AI Worker",
      "Basic integrations (up to 3)",
      "100 messages/month",
      "Email support",
      "Community access",
    ],
  },
  {
    name: "Professional",
    price: "$39",
    per: "/mo per worker",
    desc: "Best value for growing teams scaling with AI",
    featured: true,
    plan: "professional",
    features: [
      "Up to 5 AI Workers",
      "Advanced integrations (unlimited)",
      "500 messages/month per worker",
      "Priority support (chat + email)",
      "Custom fine-tuning",
      "API access",
      "Multilingual support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    desc: "For large-scale operations with custom requirements",
    featured: false,
    plan: "enterprise",
    features: [
      "Unlimited AI Workers",
      "All integrations + custom",
      "5,000 messages/month per worker",
      "24/7 dedicated support",
      "Custom AI training on your data",
      "SLA guarantee",
      "White-label option",
      "Dedicated account manager",
    ],
  },
];

const addons = [
  { icon: Globe, name: "Extra Language Pack", price: "$19/month", desc: "Add additional language support to any worker" },
  { icon: Zap, name: "Custom Integration", price: "$99 one-time", desc: "Connect to any tool or platform" },
  { icon: Users, name: "Priority Onboarding", price: "$199 one-time", desc: "Dedicated onboarding specialist" },
  { icon: Shield, name: "Dedicated Account Manager", price: "$299/month", desc: "Your personal AI workforce advisor" },
];

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const { data: stripeProducts } = useQuery<{ data: StripeProduct[] }>({
    queryKey: ["/api/stripe/products"],
  });

  function getPriceForPlan(planName: string): StripePrice | null {
    if (!stripeProducts?.data) return null;
    const product = stripeProducts.data.find(p =>
      p.metadata?.plan === planName || p.name?.toLowerCase().includes(planName)
    );
    if (!product || !product.prices.length) return null;
    return product.prices[0];
  }

  async function handleCheckout(planName: string) {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const price = getPriceForPlan(planName);
    if (!price) {
      toast({ title: "Not Available", description: "This plan is not yet available for purchase. Please contact sales.", variant: "destructive" });
      return;
    }

    setCheckingOut(planName);
    try {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId: price.id });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to start checkout. Please try again.", variant: "destructive" });
    } finally {
      setCheckingOut(null);
    }
  }

  const plans = fallbackPlans.map(plan => {
    const stripePrice = getPriceForPlan(plan.plan);
    const isEnterprise = plan.plan === 'enterprise';
    return {
      ...plan,
      priceDisplay: isEnterprise ? 'Custom' : (stripePrice ? `$${(stripePrice.unit_amount / 100).toFixed(0)}` : plan.price),
      hasStripePrice: isEnterprise ? false : !!stripePrice,
    };
  });

  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-pricing-title">
              Simple, Transparent{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-4">
              Scale your AI workforce with flexible plans. Cancel anytime.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Cancel Anytime &middot; Secure Checkout &middot; Money-back Guarantee</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} {...stagger} transition={{ duration: 0.5, delay: i * 0.15 }} className="flex">
                <Card
                  className={`p-8 flex flex-col w-full relative ${
                    plan.featured
                      ? "bg-gradient-to-b from-blue-500/10 to-violet-500/10 border-blue-500/30"
                      : "bg-card border-border/50"
                  }`}
                  data-testid={`card-plan-${plan.plan}`}
                >
                  {plan.featured && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  </div>

                  <div className="mb-8">
                    <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                      {plan.priceDisplay}
                    </span>
                    {plan.per && <span className="text-muted-foreground text-sm">{plan.per}</span>}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.plan === "enterprise" ? (
                    <Link href="/contact">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        data-testid={`button-plan-${plan.plan}`}
                      >
                        Contact Sales
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className={`w-full ${
                        plan.featured ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""
                      }`}
                      variant={plan.featured ? "default" : "outline"}
                      size="lg"
                      data-testid={`button-plan-${plan.plan}`}
                      disabled={checkingOut === plan.plan}
                      onClick={() => handleCheckout(plan.plan)}
                    >
                      {checkingOut === plan.plan ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {user ? "Subscribe Now" : "Get Started"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-20 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center" data-testid="text-addons-title">Add-ons</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {addons.map((addon) => (
                <Card key={addon.name} className="p-5 bg-card border-border/50">
                  <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-3">
                    <addon.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{addon.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{addon.desc}</p>
                  <p className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{addon.price}</p>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20" data-testid="card-test-payment">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Test Mode</h3>
                  <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Stripe test mode is active
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-5">
                Use the following test card details to simulate a payment. No real charges will be made.
              </p>

              <div className="space-y-3">
                <TestCardRow label="Card Number" value="4242 4242 4242 4242" />
                <TestCardRow label="Expiry Date" value="12/28" />
                <TestCardRow label="CVC" value="123" />
                <TestCardRow label="ZIP / Postal" value="12345" />
              </div>

              <div className="mt-6 pt-5 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-3">Other test scenarios:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <TestCardRow label="Declined" value="4000 0000 0000 0002" compact />
                  <TestCardRow label="Auth Required" value="4000 0025 0000 3155" compact />
                  <TestCardRow label="Insufficient Funds" value="4000 0000 0000 9995" compact />
                  <TestCardRow label="Expired Card" value="4000 0000 0000 0069" compact />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}

function TestCardRow({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  const { toast } = useToast();

  function copyToClipboard() {
    navigator.clipboard.writeText(value.replace(/\s/g, ""));
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between bg-background/50 rounded-md px-3 py-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-foreground">{value}</code>
          <button onClick={copyToClipboard} className="text-muted-foreground hover:text-foreground transition-colors" data-testid={`button-copy-${label.toLowerCase().replace(/\s/g, '-')}`}>
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-background/50 rounded-lg px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <code className="text-sm font-mono text-foreground tracking-wider">{value}</code>
        <button onClick={copyToClipboard} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-background" data-testid={`button-copy-${label.toLowerCase().replace(/\s/g, '-')}`}>
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
