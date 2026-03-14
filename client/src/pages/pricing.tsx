import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ArrowRight, Sparkles, Shield, Zap, Users, Globe, Loader2, CreditCard, Lock, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SectionCTA from "@/components/section-cta";

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
  const [, navigate] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  function handleSelectPlan(planName: string) {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setSelectedPlan(planName);
  }

  return (
    <div className="pt-16">
      <section className="py-12 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-10 sm:mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-pricing-title">
              Simple, Transparent{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Pricing
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto mb-3 sm:mb-4">
              Scale your AI workforce with flexible plans. Cancel anytime.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm text-emerald-400 font-medium">Cancel Anytime &middot; Secure Checkout &middot; Money-back Guarantee</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
            {fallbackPlans.map((plan, i) => (
              <motion.div key={plan.name} {...stagger} transition={{ duration: 0.5, delay: i * 0.15 }} className="flex">
                <Card
                  className={`p-5 sm:p-8 flex flex-col w-full relative ${
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
                      {plan.price}
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
                        className="w-full min-h-[44px]"
                        data-testid={`button-plan-${plan.plan}`}
                      >
                        Contact Sales
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className={`w-full min-h-[44px] ${
                        plan.featured ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""
                      }`}
                      variant={plan.featured ? "default" : "outline"}
                      size="lg"
                      data-testid={`button-plan-${plan.plan}`}
                      onClick={() => handleSelectPlan(plan.plan)}
                    >
                      {user ? "Subscribe Now" : "Get Started"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-12 sm:mt-20 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8 text-center" data-testid="text-addons-title">Add-ons</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

      <SectionCTA />

      <AnimatePresence>
        {selectedPlan && (
          <CheckoutModal
            plan={selectedPlan}
            planData={fallbackPlans.find(p => p.plan === selectedPlan)!}
            onClose={() => setSelectedPlan(null)}
            onSuccess={() => {
              setSelectedPlan(null);
              navigate("/dashboard?checkout=success");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckoutModal({
  plan,
  planData,
  onClose,
  onSuccess,
}: {
  plan: string;
  planData: typeof fallbackPlans[0];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      return digits.slice(0, 2) + "/" + digits.slice(2);
    }
    return digits;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length < 13) {
      toast({ title: "Invalid Card", description: "Please enter a valid card number.", variant: "destructive" });
      return;
    }
    if (!expiry || expiry.length < 4) {
      toast({ title: "Invalid Expiry", description: "Please enter a valid expiry date (MM/YY).", variant: "destructive" });
      return;
    }
    if (!cvc || cvc.length < 3) {
      toast({ title: "Invalid CVC", description: "Please enter a valid CVC.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const res = await apiRequest("POST", "/api/test-checkout", {
        plan,
        cardNumber: cleanCard,
        expiry,
        cvc,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Payment Successful!", description: `Your ${planData.name} plan is now active.` });
        onSuccess();
      }
    } catch (error: any) {
      const message = error?.message || "Payment failed. Please try again.";
      toast({ title: "Payment Failed", description: message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-6 bg-card border-border/50 shadow-2xl" data-testid="card-checkout-modal">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Checkout</h3>
                <p className="text-xs text-muted-foreground">{planData.name} Plan — {planData.price}{planData.per}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-checkout">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cardName" className="text-sm text-muted-foreground">Cardholder Name</Label>
              <Input
                id="cardName"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 bg-background/50"
                data-testid="input-card-name"
              />
            </div>

            <div>
              <Label htmlFor="cardNumber" className="text-sm text-muted-foreground">Card Number</Label>
              <div className="relative mt-1">
                <Input
                  id="cardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="bg-background/50 pr-10"
                  maxLength={19}
                  data-testid="input-card-number"
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry" className="text-sm text-muted-foreground">Expiry</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="mt-1 bg-background/50"
                  maxLength={5}
                  data-testid="input-expiry"
                />
              </div>
              <div>
                <Label htmlFor="cvc" className="text-sm text-muted-foreground">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="mt-1 bg-background/50"
                  maxLength={4}
                  data-testid="input-cvc"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                size="lg"
                disabled={processing}
                data-testid="button-pay"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                {processing ? "Processing..." : `Pay ${planData.price}/mo`}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Secure payment — Test mode active</span>
            </div>

            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Test card: <code className="text-foreground">4242 4242 4242 4242</code></p>
              <p className="text-xs text-muted-foreground">Any future expiry &middot; Any 3-digit CVC</p>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
