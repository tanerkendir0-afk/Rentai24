import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Sparkles, Shield, Zap, Users, Globe } from "lucide-react";
import SectionCTA from "@/components/section-cta";

const plans = [
  {
    name: "Starter",
    price: "$49",
    per: "/mo per worker",
    desc: "Perfect for small businesses getting started with AI",
    featured: false,
    features: [
      "1 AI Worker",
      "Basic integrations (up to 3)",
      "Weekly performance reports",
      "Email support",
      "Community access",
    ],
    cta: "Start Free Trial",
    ctaLink: "/contact",
  },
  {
    name: "Professional",
    price: "$39",
    per: "/mo per worker",
    desc: "Best value for growing teams scaling with AI",
    featured: true,
    features: [
      "Up to 5 AI Workers",
      "Advanced integrations (unlimited)",
      "Daily performance reports",
      "Priority support (chat + email)",
      "Custom fine-tuning",
      "API access",
      "Multilingual support",
    ],
    cta: "Start Free Trial",
    ctaLink: "/contact",
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    desc: "For large-scale operations with custom requirements",
    featured: false,
    features: [
      "Unlimited AI Workers",
      "All integrations + custom",
      "Real-time analytics dashboard",
      "24/7 dedicated support",
      "Custom AI training on your data",
      "SLA guarantee",
      "White-label option",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    ctaLink: "/contact",
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
              Start your 14-day free trial. No credit card required. Cancel anytime.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">14-Day Free Trial &middot; No Credit Card &middot; Money-back Guarantee</span>
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
                  data-testid={`card-plan-${i}`}
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

                  <Link href={plan.ctaLink}>
                    <Button
                      className={`w-full ${
                        plan.featured ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""
                      }`}
                      variant={plan.featured ? "default" : "outline"}
                      size="lg"
                      data-testid={`button-plan-${i}`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
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

      <SectionCTA />
    </div>
  );
}
