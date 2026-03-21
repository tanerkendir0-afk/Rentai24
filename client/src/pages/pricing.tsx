import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ArrowRight, Sparkles, Shield, Zap, Users, Globe, Loader2, CreditCard, Lock, X, Bolt, Calculator, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SectionCTA from "@/components/section-cta";
import { useTranslation } from "react-i18next";

const boostPlans = [
  { id: "boost-3", price: 150, icon: Zap, featured: false },
  { id: "boost-7", price: 300, icon: Bolt, featured: true },
  { id: "boost-accounting", price: 200, icon: Calculator, featured: false },
  { id: "boost-pro", price: 1750, icon: Crown, featured: false },
] as const;

const addonIcons = [Globe, Zap, Users, Shield];
const addonKeys = ["languagePack", "customIntegration", "priorityOnboarding", "accountManager"] as const;

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { t } = useTranslation("pages");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBoostPlan, setSelectedBoostPlan] = useState<string | null>(null);

  const { data: boostStatus } = useQuery<{ active: boolean; plan: string | null }>({
    queryKey: ["/api/boost/status"],
    enabled: !!user,
  });

  const plans = [
    {
      name: t("pricing.plans.standard.name"),
      price: "$300",
      per: t("pricing.plans.standard.per"),
      desc: t("pricing.plans.standard.desc"),
      featured: false,
      plan: "standard",
      features: t("pricing.plans.standard.features", { returnObjects: true }) as string[],
    },
    {
      name: t("pricing.plans.professional.name"),
      price: "$600",
      per: t("pricing.plans.professional.per"),
      desc: t("pricing.plans.professional.desc"),
      featured: true,
      plan: "professional",
      features: t("pricing.plans.professional.features", { returnObjects: true }) as string[],
    },
    {
      name: t("pricing.plans.allInOne.name"),
      price: "$1,200",
      per: t("pricing.plans.allInOne.per"),
      desc: t("pricing.plans.allInOne.desc"),
      featured: false,
      plan: "all-in-one",
      features: t("pricing.plans.allInOne.features", { returnObjects: true }) as string[],
    },
    {
      name: t("pricing.plans.accounting.name"),
      price: "$500",
      per: t("pricing.plans.accounting.per"),
      desc: t("pricing.plans.accounting.desc"),
      featured: false,
      plan: "accounting",
      features: t("pricing.plans.accounting.features", { returnObjects: true }) as string[],
    },
  ];

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
              {t("pricing.title")}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto mb-3 sm:mb-4">
              {t("pricing.subtitle")}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm text-emerald-400 font-medium">{t("pricing.guarantee")}</span>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">{t("pricing.taxNote")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <motion.div key={plan.plan} {...stagger} transition={{ duration: 0.5, delay: i * 0.15 }} className="flex">
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
                      {t("pricing.mostPopular")}
                    </Badge>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  </div>

                  <div className="mb-8">
                    <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                      {plan.price === "custom" ? t("pricingPage.custom") : plan.price}
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

                  <Button
                    className={`w-full min-h-[44px] ${
                      plan.featured ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""
                    }`}
                    variant={plan.featured ? "default" : "outline"}
                    size="lg"
                    data-testid={`button-plan-${plan.plan}`}
                    onClick={() => handleSelectPlan(plan.plan)}
                  >
                    {user ? t("pricing.subscribeNow") : t("pricing.getStarted")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
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
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8 text-center" data-testid="text-addons-title">{t("pricing.addonsTitle")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {addonKeys.map((key, i) => {
                const Icon = addonIcons[i];
                return (
                  <Card key={key} className="p-5 bg-card border-border/50">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{t(`pricing.addons.${key}.name`)}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{t(`pricing.addons.${key}.desc`)}</p>
                    <p className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{t(`pricing.addons.${key}.price`)}</p>
                  </Card>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            className="mt-12 sm:mt-20 max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
                <Bolt className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">{t("pricing.boost.sectionTitle")}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2" data-testid="text-boost-title">
                {t("pricing.boost.sectionTitle")}
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                {t("pricing.boost.sectionSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {boostPlans.map((bp, i) => {
                const BpIcon = bp.icon;
                const features = t(`pricing.boost.plans.${bp.id}.features`, { returnObjects: true }) as string[];
                const isCurrentPlan = boostStatus?.active && boostStatus.plan === bp.id;
                return (
                  <motion.div key={bp.id} {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }} className="flex">
                    <Card
                      className={`p-5 sm:p-6 flex flex-col w-full relative ${
                        bp.featured
                          ? "bg-gradient-to-b from-amber-500/10 to-orange-500/10 border-amber-500/30"
                          : "bg-card border-border/50"
                      } ${isCurrentPlan ? "ring-2 ring-amber-500/50" : ""}`}
                      data-testid={`card-boost-${bp.id}`}
                    >
                      {bp.featured && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {t("pricing.mostPopular")}
                        </Badge>
                      )}
                      {isCurrentPlan && (
                        <Badge className="absolute -top-3 right-4 bg-emerald-500 text-white border-0">
                          {t("pricing.boost.currentPlan")}
                        </Badge>
                      )}

                      <div className="mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-3">
                          <BpIcon className="w-5 h-5 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">
                          {t(`pricing.boost.plans.${bp.id}.name`)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {t(`pricing.boost.plans.${bp.id}.desc`)}
                        </p>
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                          ${bp.price.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-sm">{t("pricing.boost.perMonth")}</span>
                      </div>

                      <ul className="space-y-2 mb-6 flex-1">
                        {features.map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full min-h-[44px] ${
                          bp.featured ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" : ""
                        }`}
                        variant={bp.featured ? "default" : "outline"}
                        size="lg"
                        disabled={isCurrentPlan}
                        data-testid={`button-boost-${bp.id}`}
                        onClick={() => {
                          if (!user) { window.location.href = "/login"; return; }
                          setSelectedBoostPlan(bp.id);
                        }}
                      >
                        {isCurrentPlan ? t("pricing.boost.currentPlan") : t("pricing.boost.buyNow")}
                        {!isCurrentPlan && <Bolt className="w-4 h-4 ml-2" />}
                      </Button>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <SectionCTA />

      <AnimatePresence>
        {selectedBoostPlan && (
          <BoostCheckoutModal
            boostPlan={selectedBoostPlan}
            price={boostPlans.find(b => b.id === selectedBoostPlan)!.price}
            onClose={() => setSelectedBoostPlan(null)}
            onSuccess={() => {
              setSelectedBoostPlan(null);
              queryClient.invalidateQueries({ queryKey: ["/api/boost/status"] });
              navigate("/dashboard?boost=success");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlan && (
          <CheckoutModal
            plan={selectedPlan}
            planData={plans.find(p => p.plan === selectedPlan)!}
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
  planData: { name: string; price: string; per: string };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation("pages");
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
      toast({ title: t("pricing.checkout.invalidCard"), description: t("pricing.checkout.invalidCardDesc"), variant: "destructive" });
      return;
    }
    if (!expiry || expiry.length < 4) {
      toast({ title: t("pricing.checkout.invalidExpiry"), description: t("pricing.checkout.invalidExpiryDesc"), variant: "destructive" });
      return;
    }
    if (!cvc || cvc.length < 3) {
      toast({ title: t("pricing.checkout.invalidCvc"), description: t("pricing.checkout.invalidCvcDesc"), variant: "destructive" });
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
        toast({ title: t("pricing.checkout.paymentSuccess"), description: t("pricing.checkout.paymentSuccessDesc", { plan: planData.name }) });
        onSuccess();
      }
    } catch (error: any) {
      const message = error?.message || t("pricingPage.paymentFailed");
      toast({ title: t("pricing.checkout.paymentFailed"), description: message, variant: "destructive" });
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
                <h3 className="text-lg font-bold text-foreground">{t("pricing.checkout.title")}</h3>
                <p className="text-xs text-muted-foreground">{t("pricing.checkout.planInfo", { name: planData.name, price: planData.price, per: planData.per })}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-checkout">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cardName" className="text-sm text-muted-foreground">{t("pricing.checkout.cardholderName")}</Label>
              <Input
                id="cardName"
                placeholder={t("pricingPage.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 bg-background/50"
                data-testid="input-card-name"
              />
            </div>

            <div>
              <Label htmlFor="cardNumber" className="text-sm text-muted-foreground">{t("pricing.checkout.cardNumber")}</Label>
              <div className="relative mt-1">
                <Input
                  id="cardNumber"
                  placeholder={t("pricingPage.cardPlaceholder")}
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
                <Label htmlFor="expiry" className="text-sm text-muted-foreground">{t("pricing.checkout.expiry")}</Label>
                <Input
                  id="expiry"
                  placeholder={t("pricingPage.expiryPlaceholder")}
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="mt-1 bg-background/50"
                  maxLength={5}
                  data-testid="input-expiry"
                />
              </div>
              <div>
                <Label htmlFor="cvc" className="text-sm text-muted-foreground">{t("pricing.checkout.cvc")}</Label>
                <Input
                  id="cvc"
                  placeholder={t("pricingPage.cvcPlaceholder")}
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
                {processing ? t("pricing.checkout.processing") : t("pricing.checkout.pay", { price: planData.price })}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("pricing.checkout.securePayment")}</span>
            </div>

            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">{t("pricing.checkout.testCard")}: <code className="text-foreground">4242 4242 4242 4242</code></p>
              <p className="text-xs text-muted-foreground">{t("pricing.checkout.testCardHint")}</p>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function BoostCheckoutModal({
  boostPlan,
  price,
  onClose,
  onSuccess,
}: {
  boostPlan: string;
  price: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation("pages");
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const planName = t(`pricing.boost.plans.${boostPlan}.name`);

  function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length < 13) {
      toast({ title: t("pricing.checkout.invalidCard"), description: t("pricing.checkout.invalidCardDesc"), variant: "destructive" });
      return;
    }
    if (!expiry || expiry.length < 4) {
      toast({ title: t("pricing.checkout.invalidExpiry"), description: t("pricing.checkout.invalidExpiryDesc"), variant: "destructive" });
      return;
    }
    if (!cvc || cvc.length < 3) {
      toast({ title: t("pricing.checkout.invalidCvc"), description: t("pricing.checkout.invalidCvcDesc"), variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const res = await apiRequest("POST", "/api/boost/checkout/test", {
        boostPlan,
        cardNumber: cleanCard,
        expiry,
        cvc,
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: t("pricing.boost.checkout.success"),
          description: t("pricing.boost.checkout.successDesc", { plan: planName }),
        });
        onSuccess();
      }
    } catch (error: any) {
      const message = error?.message || t("pricing.boost.checkout.failed");
      if (message.includes("already")) {
        toast({ title: t("pricing.boost.checkout.alreadyActive"), description: t("pricing.boost.checkout.alreadyActiveDesc"), variant: "destructive" });
      } else {
        toast({ title: t("pricing.boost.checkout.failed"), description: message, variant: "destructive" });
      }
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
        <Card className="p-6 bg-card border-border/50 shadow-2xl" data-testid="card-boost-checkout-modal">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Bolt className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{t("pricing.boost.checkout.title")}</h3>
                <p className="text-xs text-muted-foreground">{t("pricing.boost.checkout.planInfo", { name: planName, price: price.toLocaleString() })}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-boost-checkout">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="boostCardNumber" className="text-sm text-muted-foreground">{t("pricing.checkout.cardNumber")}</Label>
              <div className="relative mt-1">
                <Input
                  id="boostCardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="bg-background/50 pr-10"
                  maxLength={19}
                  data-testid="input-boost-card-number"
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="boostExpiry" className="text-sm text-muted-foreground">{t("pricing.checkout.expiry")}</Label>
                <Input
                  id="boostExpiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="mt-1 bg-background/50"
                  maxLength={5}
                  data-testid="input-boost-expiry"
                />
              </div>
              <div>
                <Label htmlFor="boostCvc" className="text-sm text-muted-foreground">{t("pricing.checkout.cvc")}</Label>
                <Input
                  id="boostCvc"
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="mt-1 bg-background/50"
                  maxLength={4}
                  data-testid="input-boost-cvc"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                size="lg"
                disabled={processing}
                data-testid="button-boost-pay"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bolt className="w-4 h-4 mr-2" />
                )}
                {processing ? t("pricing.boost.checkout.processing") : t("pricing.boost.checkout.pay", { price: price.toLocaleString() })}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("pricing.checkout.securePayment")}</span>
            </div>

            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">{t("pricing.checkout.testCard")}: <code className="text-foreground">4242 4242 4242 4242</code></p>
              <p className="text-xs text-muted-foreground">{t("pricing.checkout.testCardHint")}</p>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
