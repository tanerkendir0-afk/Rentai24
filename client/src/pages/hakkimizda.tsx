import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Bot, Target, Eye, Users, Zap, Clock, Globe, TrendingUp } from "lucide-react";
import SectionCTA from "@/components/section-cta";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const comparisonData = [
  {
    traditional: "Aylar süren işe alım süreci",
    ai: "Dakikalar içinde aktif",
    icon: Clock,
  },
  {
    traditional: "Hastalık, izin, devamsızlık",
    ai: "7/24 kesintisiz çalışma",
    icon: Zap,
  },
  {
    traditional: "Yüksek eğitim maliyeti",
    ai: "Eğitimi hazır, hemen kullanıma hazır",
    icon: Target,
  },
  {
    traditional: "Tek dil desteği",
    ai: "Çoklu dil desteği",
    icon: Globe,
  },
  {
    traditional: "Sınırlı ölçeklenme",
    ai: "Anında ve sınırsız ölçeklenme",
    icon: TrendingUp,
  },
];

export default function Hakkimizda() {
  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-about-title">
              Hakkımızda
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Türkiye'nin ilk AI İK ajansı olarak işletmelere geleceğin iş gücünü sunuyoruz.
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <Card className="p-8 sm:p-10 bg-card border-border/50 mb-16">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Hikayemiz</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    AI İK Ajansı, geleneksel işe alım süreçlerinin yavaşlığını ve maliyetini çözmek için kuruldu.
                    Geleneksel İK ajansları nasıl şirketlere nitelikli insan çalışanlar yerleştiriyorsa, biz de aynı
                    modelle eğitimi tamamlanmış AI çalışanlar (ajanlar) kiralıyoruz.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Misyonumuz</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Her ölçekteki işletmeye erişilebilir, güvenilir ve verimli AI iş gücü sağlayarak
                      dijital dönüşümlerini hızlandırmak.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Vizyonumuz</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      İnsan ve AI'ın birlikte uyum içinde çalıştığı, iş dünyasının daha verimli
                      ve sürdürülebilir olduğu bir gelecek inşa etmek.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeUp}>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-4" data-testid="text-why-ai">
                Neden AI Çalışan?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Geleneksel İK ile AI İK Ajansı arasındaki farkları keşfedin
              </p>
            </div>

            <div className="hidden sm:block">
              <Card className="bg-card border-border/50 overflow-visible" data-testid="table-comparison">
                <div className="grid grid-cols-[1fr,auto,1fr] gap-0">
                  <div className="px-6 py-4 border-b border-border/50">
                    <h3 className="font-semibold text-foreground text-center">Geleneksel İK</h3>
                  </div>
                  <div className="px-4 py-4 border-b border-border/50 border-x border-border/50 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">vs</span>
                  </div>
                  <div className="px-6 py-4 border-b border-border/50">
                    <h3 className="font-semibold text-center bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                      AI İK Ajansı
                    </h3>
                  </div>

                  {comparisonData.map((row, i) => (
                    <div key={i} className="contents">
                      <div className={`px-6 py-4 ${i < comparisonData.length - 1 ? "border-b border-border/50" : ""} flex items-center`}>
                        <p className="text-sm text-muted-foreground text-center w-full">{row.traditional}</p>
                      </div>
                      <div className={`px-4 py-4 ${i < comparisonData.length - 1 ? "border-b border-border/50" : ""} border-x border-border/50 flex items-center justify-center`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                          <row.icon className="w-4 h-4 text-blue-400" />
                        </div>
                      </div>
                      <div className={`px-6 py-4 ${i < comparisonData.length - 1 ? "border-b border-border/50" : ""} flex items-center`}>
                        <p className="text-sm text-foreground font-medium text-center w-full">{row.ai}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="sm:hidden space-y-4" data-testid="table-comparison-mobile">
              {comparisonData.map((row, i) => (
                <Card key={i} className="p-5 bg-card border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
                      <row.icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Karşılaştırma</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">Eski:</span>
                      <p className="text-sm text-muted-foreground">{row.traditional}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-blue-400 shrink-0 mt-0.5">Yeni:</span>
                      <p className="text-sm text-foreground font-medium">{row.ai}</p>
                    </div>
                  </div>
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
