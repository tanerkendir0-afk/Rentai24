import { useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Bot,
  Search,
  Zap,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  ShoppingCart,
  UtensilsCrossed,
  Heart,
  Scale,
  Building2,
  GraduationCap,
  Plane,
  Star,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Settings,
  Sparkles,
} from "lucide-react";
import { agents, testimonials, faqItems } from "@/data/agents";
import SectionCTA from "@/components/section-cta";

const agentIcons: Record<string, any> = {
  "musteri-hizmetleri": Headphones,
  "satis-pazarlama": TrendingUp,
  "sosyal-medya": Share2,
  "muhasebe": Calculator,
  "randevu-rezervasyon": CalendarCheck,
  "insan-kaynaklari": Users,
};

const sectorIcons: Record<string, any> = {
  "ShoppingCart": ShoppingCart,
  "UtensilsCrossed": UtensilsCrossed,
  "Heart": Heart,
  "Scale": Scale,
  "Calculator": Calculator,
  "Building2": Building2,
  "GraduationCap": GraduationCap,
  "Plane": Plane,
};

const sectorData = [
  { name: "E-Ticaret", icon: "ShoppingCart", desc: "Online mağazalar ve pazar yerleri" },
  { name: "Restoran & Kafe", icon: "UtensilsCrossed", desc: "Yeme-içme sektörü" },
  { name: "Sağlık", icon: "Heart", desc: "Klinik ve hastaneler" },
  { name: "Hukuk", icon: "Scale", desc: "Hukuk büroları" },
  { name: "Muhasebe & Finans", icon: "Calculator", desc: "Mali müşavirlik" },
  { name: "Gayrimenkul", icon: "Building2", desc: "Emlak ve gayrimenkul" },
  { name: "Eğitim", icon: "GraduationCap", desc: "Eğitim kurumları" },
  { name: "Turizm & Otel", icon: "Plane", desc: "Turizm ve konaklama" },
];

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref} data-testid={`counter-${target}`}>
      {count}{suffix}
    </span>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function Home() {
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  return (
    <div>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-blue-950/30" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/5 to-violet-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Türkiye'nin İlk AI İK Ajansı
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            data-testid="text-hero-title"
          >
            İşletmeniz İçin{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Hazır AI Çalışanlar
            </span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            data-testid="text-hero-subtitle"
          >
            Eğitimi tamamlanmış AI ajanlarımızı işletmenize kiralayın. 7/24 çalışan,
            asla yorulmayan, sürekli öğrenen dijital ekip arkadaşları.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            <Link href="/calisanlar">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 px-8"
                data-testid="button-hero-explore"
              >
                AI Çalışanları Keşfet
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="px-8" data-testid="button-hero-demo">
                Ücretsiz Demo Al
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            {[
              { label: "Aktif Ajan", value: "150+" },
              { label: "Mutlu İşletme", value: "500+" },
              { label: "Kesintisiz", value: "7/24" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-bold text-blue-400">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-how-title">
              Nasıl Çalışır?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Üç basit adımda AI çalışanınızı işe alın
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                step: "01",
                title: "İhtiyacınızı Belirleyin",
                desc: "Hangi pozisyon için AI çalışana ihtiyacınız var? İhtiyaç analizinizi birlikte yapalım.",
              },
              {
                icon: ClipboardCheck,
                step: "02",
                title: "AI Çalışanınızı Seçin",
                desc: "Sektörünüze özel eğitilmiş ajanlarımızı inceleyin ve size en uygun olanı seçin.",
              },
              {
                icon: Zap,
                step: "03",
                title: "Hemen Başlayın",
                desc: "Entegrasyon ve kurulum bizden, siz sadece kullanın. Dakikalar içinde aktif.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                {...stagger}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <Card className="relative p-8 bg-card border-border/50 h-full">
                  <div className="text-5xl font-bold text-blue-500/10 absolute top-4 right-6">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-5">
                    <item.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-catalog-title">
              AI Çalışan Kadromuz
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sektörünüze özel eğitilmiş, hemen kullanıma hazır AI çalışanlarımız
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, i) => {
              const Icon = agentIcons[agent.id] || Bot;
              return (
                <motion.div
                  key={agent.id}
                  {...stagger}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Card className="p-6 bg-card border-border/50 h-full flex flex-col hover-elevate" data-testid={`card-agent-${agent.id}`}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.position}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{agent.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {agent.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {agent.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{agent.skills.length - 3}</Badge>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-border/50">
                      <div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                          {agent.price}
                        </span>
                        <span className="text-xs text-muted-foreground">/ay</span>
                      </div>
                      <Link href="/calisanlar">
                        <Button size="sm" variant="secondary" data-testid={`button-detail-${agent.id}`}>
                          Detaylar
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div className="text-center mt-12" {...fadeUp}>
            <Link href="/calisanlar">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                data-testid="button-view-all-agents"
              >
                Tüm AI Çalışanları Gör
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: 150, suffix: "+", label: "Aktif AI Çalışan", color: "text-blue-400" },
                { value: 500, suffix: "+", label: "Mutlu İşletme", color: "text-violet-400" },
                { value: 724, suffix: "", label: "7/24 Kesintisiz Hizmet", color: "text-blue-400", display: "7/24" },
                { value: 40, suffix: "%", label: "Maliyet Tasarrufu", color: "text-violet-400" },
              ].map((stat) => (
                <div key={stat.label} className="text-center" data-testid={`stat-${stat.label}`}>
                  <div className={`text-4xl sm:text-5xl font-bold ${stat.color} mb-2`}>
                    {stat.display ? (
                      stat.display
                    ) : (
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-sectors-title">
              Hizmet Verdiğimiz Sektörler
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Her sektöre özel eğitilmiş AI çalışanlarımızla tanışın
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sectorData.map((sector, i) => {
              const Icon = sectorIcons[sector.icon] || Bot;
              return (
                <motion.div
                  key={sector.name}
                  {...stagger}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="p-6 bg-card border-border/50 text-center hover-elevate" data-testid={`card-sector-${sector.name}`}>
                    <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="font-medium text-foreground text-sm mb-1">{sector.name}</h3>
                    <p className="text-xs text-muted-foreground">{sector.desc}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-testimonials-title">
              Müşterilerimiz Ne Diyor?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              AI çalışanlarımızla tanışan işletmelerin deneyimleri
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <Card className="p-8 sm:p-10 bg-card border-border/50 relative" data-testid="card-testimonial">
              <div className="text-blue-500/20 text-6xl font-serif absolute top-4 left-6">"</div>
              <div className="relative z-10">
                <p className="text-lg text-foreground leading-relaxed mb-6 italic">
                  {testimonials[testimonialIdx].text}
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold">
                    {testimonials[testimonialIdx].name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {testimonials[testimonialIdx].name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonials[testimonialIdx].role} - {testimonials[testimonialIdx].company}
                    </div>
                  </div>
                  <div className="ml-auto flex gap-1">
                    {Array.from({ length: testimonials[testimonialIdx].rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Önceki yorum"
                onClick={() => setTestimonialIdx((p) => (p === 0 ? testimonials.length - 1 : p - 1))}
                data-testid="button-testimonial-prev"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === testimonialIdx ? "bg-blue-500" : "bg-muted"
                    }`}
                    data-testid={`button-testimonial-dot-${i}`}
                  />
                ))}
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Sonraki yorum"
                onClick={() => setTestimonialIdx((p) => (p === testimonials.length - 1 ? 0 : p + 1))}
                data-testid="button-testimonial-next"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative bg-card/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-faq-title">
              Sıkça Sorulan Sorular
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              AI çalışanlar hakkında merak edilenler
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
              {faqItems.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border border-border/50 rounded-md px-6 bg-card"
                >
                  <AccordionTrigger className="text-left text-foreground font-medium py-4" data-testid={`faq-trigger-${i}`}>
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 leading-relaxed" data-testid={`faq-content-${i}`}>
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
