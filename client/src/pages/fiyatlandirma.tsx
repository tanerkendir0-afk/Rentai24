import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import SectionCTA from "@/components/section-cta";

const plans = [
  {
    name: "Başlangıç Paketi",
    price: "₺4.999",
    period: "/ay",
    desc: "Küçük işletmeler için ideal başlangıç",
    featured: false,
    features: [
      "1 AI Çalışan",
      "Temel entegrasyonlar",
      "Haftalık performans raporu",
      "E-posta destek",
      "Standart yanıt süresi",
    ],
  },
  {
    name: "Profesyonel Paket",
    price: "₺12.999",
    period: "/ay",
    desc: "Büyüyen işletmeler için en popüler seçim",
    featured: true,
    features: [
      "3 AI Çalışan",
      "Gelişmiş entegrasyonlar",
      "Günlük performans raporu",
      "Öncelikli destek",
      "Özel eğitim & ince ayar",
      "Çoklu dil desteği",
      "API erişimi",
    ],
  },
  {
    name: "Kurumsal Paket",
    price: "Bize Ulaşın",
    period: "",
    desc: "Büyük ölçekli operasyonlar için özel çözümler",
    featured: false,
    features: [
      "Sınırsız AI Çalışan",
      "Tüm entegrasyonlar",
      "Gerçek zamanlı dashboard",
      "7/24 öncelikli destek",
      "Özel API erişimi",
      "Dedicated account manager",
      "SLA garantisi",
      "Özel eğitim ve danışmanlık",
    ],
  },
];

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function Fiyatlandirma() {
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
              Basit ve Şeffaf{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Fiyatlandırma
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              İşletmenizin büyüklüğüne uygun paketi seçin. Tüm paketler 14 gün ücretsiz deneme ile başlar.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...stagger}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex"
              >
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
                      Önerilen
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
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/iletisim">
                    <Button
                      className={`w-full ${
                        plan.featured
                          ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                          : ""
                      }`}
                      variant={plan.featured ? "default" : "outline"}
                      size="lg"
                      data-testid={`button-plan-${i}`}
                    >
                      {plan.price === "Bize Ulaşın" ? "İletişime Geç" : "Hemen Başla"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
