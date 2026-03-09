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
  Sparkles,
  BarChart3,
  Package,
  Check,
  X,
  Code,
  Megaphone,
} from "lucide-react";
import { agents, testimonials, faqItems, industries } from "@/data/agents";
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

const industryIcons: Record<string, any> = {
  ShoppingCart, UtensilsCrossed, Heart, Scale, Calculator,
  Building2, GraduationCap, Plane, Code, Megaphone,
};

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

  return <span ref={ref}>{count}{suffix}</span>;
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

const comparisonData = [
  { old: "Weeks to hire", new: "Deploy in minutes" },
  { old: "Sick days, vacations, turnover", new: "24/7, never misses a day" },
  { old: "Training costs $$$", new: "Pre-trained & ready" },
  { old: "One language", new: "Multilingual" },
  { old: "Hard to scale", new: "Instant scaling" },
  { old: "$3,000-5,000+/month", new: "From $49/month" },
];

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
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              The World's First AI Staffing Agency
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
            data-testid="text-hero-title"
          >
            Hire AI Workers.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Not Headaches.
            </span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            data-testid="text-hero-subtitle"
          >
            Pre-trained AI agents ready to join your team today. They work 24/7,
            never call in sick, and cost a fraction of traditional hires.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.45 }}
          >
            <Link href="/workers">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 px-8" data-testid="button-hero-browse">
                Browse AI Workers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="px-8" data-testid="button-hero-demo">
                Book a Demo
              </Button>
            </Link>
          </motion.div>

          <motion.p
            className="mt-6 text-sm text-muted-foreground"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }}
          >
            No Setup Fee &middot; Cancel Anytime &middot; 14-Day Free Trial
          </motion.p>
        </div>
      </section>

      <section className="py-12 border-y border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {["Acme Corp", "TechFlow", "NovaPay", "CloudBase", "PixelForge", "DataWave"].map((name) => (
              <span key={name} className="text-muted-foreground/30 font-bold text-xl tracking-wider">{name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-how-title">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to your first AI team member
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Search, step: "01", title: "Tell Us What You Need", desc: "Describe the role. Customer support? Sales? Accounting? We'll match you with the perfect AI worker." },
              { icon: ClipboardCheck, step: "02", title: "Pick Your AI Worker", desc: "Browse our catalog of pre-trained agents, each specialized for specific roles and industries." },
              { icon: Zap, step: "03", title: "Deploy in Minutes", desc: "We handle integration with your existing tools. You just start working. It's that simple." },
            ].map((item, i) => (
              <motion.div key={item.step} {...stagger} transition={{ duration: 0.5, delay: i * 0.15 }}>
                <Card className="relative p-8 bg-card border-border/50 h-full">
                  <div className="text-5xl font-bold text-blue-500/10 absolute top-4 right-6">{item.step}</div>
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
              Meet Your Next Team Members
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Pre-trained, battle-tested, and ready to deploy today
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.slice(0, 6).map((agent, i) => {
              const Icon = agentIcons[agent.id] || Bot;
              return (
                <motion.div key={agent.id} {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }}>
                  <Card className="p-6 bg-card border-border/50 h-full flex flex-col hover-elevate" data-testid={`card-agent-${agent.id}`}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground">{agent.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-emerald-400">Online</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{agent.shortDescription}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {agent.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {agent.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{agent.skills.length - 3}</Badge>
                      )}
                    </div>
                    {agent.tag && (
                      <Badge className="self-start mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs no-default-active-elevate">{agent.tag}</Badge>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-border/50">
                      <div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">${agent.price}</span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                      </div>
                      <Link href={`/workers/${agent.slug}`}>
                        <Button size="sm" variant="secondary" data-testid={`button-profile-${agent.id}`}>
                          View Profile
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
            <Link href="/workers">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-view-all">
                View All AI Workers
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
                { value: 150, suffix: "+", label: "AI Workers Available", color: "text-blue-400" },
                { value: 500, suffix: "+", label: "Businesses Served", color: "text-violet-400" },
                { value: 247, suffix: "", label: "24/7 Uptime, Zero Downtime", color: "text-blue-400", display: "24/7" },
                { value: 40, suffix: "%", label: "Average Cost Savings", color: "text-violet-400" },
              ].map((stat) => (
                <div key={stat.label} className="text-center" data-testid={`stat-${stat.label}`}>
                  <div className={`text-4xl sm:text-5xl font-bold ${stat.color} mb-2`}>
                    {stat.display ? stat.display : <AnimatedCounter target={stat.value} suffix={stat.suffix} />}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative bg-card/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-comparison-title">
              The Old Way vs. The Rent<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">AI</span> Way
            </h2>
          </motion.div>

          <motion.div {...fadeUp}>
            <div className="hidden sm:block">
              <Card className="bg-card border-border/50 overflow-visible">
                <div className="grid grid-cols-[1fr,1fr] gap-0">
                  <div className="px-8 py-4 border-b border-r border-border/50 text-center">
                    <h3 className="font-semibold text-muted-foreground">Traditional Hiring</h3>
                  </div>
                  <div className="px-8 py-4 border-b border-border/50 text-center">
                    <h3 className="font-semibold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">RentAI 24</h3>
                  </div>
                  {comparisonData.map((row, i) => (
                    <div key={i} className="contents">
                      <div className={`px-8 py-4 ${i < comparisonData.length - 1 ? "border-b" : ""} border-r border-border/50 flex items-center gap-3`}>
                        <X className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-sm text-muted-foreground">{row.old}</span>
                      </div>
                      <div className={`px-8 py-4 ${i < comparisonData.length - 1 ? "border-b" : ""} border-border/50 flex items-center gap-3`}>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-sm text-foreground font-medium">{row.new}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="sm:hidden space-y-3">
              {comparisonData.map((row, i) => (
                <Card key={i} className="p-4 bg-card border-border/50">
                  <div className="flex items-start gap-2 mb-2">
                    <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{row.old}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground font-medium">{row.new}</span>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-industries-title">
              AI Workers for Every Industry
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Specialized AI agents trained for your specific sector
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {industries.map((ind, i) => {
              const Icon = industryIcons[ind.icon] || Bot;
              return (
                <motion.div key={ind.name} {...stagger} transition={{ duration: 0.4, delay: i * 0.06 }}>
                  <Card className="p-5 bg-card border-border/50 text-center hover-elevate" data-testid={`card-industry-${i}`}>
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-medium text-foreground text-xs sm:text-sm">{ind.name}</h3>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 relative bg-card/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-testimonials-title">
              What Our Clients Say
            </h2>
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
                    <div className="font-semibold text-foreground">{testimonials[testimonialIdx].name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonials[testimonialIdx].role} at {testimonials[testimonialIdx].company}
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
              <Button size="icon" variant="ghost" aria-label="Previous testimonial" onClick={() => setTestimonialIdx((p) => (p === 0 ? testimonials.length - 1 : p - 1))} data-testid="button-testimonial-prev">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTestimonialIdx(i)} aria-label={`Testimonial ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-colors ${i === testimonialIdx ? "bg-blue-500" : "bg-muted"}`}
                    data-testid={`button-testimonial-dot-${i}`}
                  />
                ))}
              </div>
              <Button size="icon" variant="ghost" aria-label="Next testimonial" onClick={() => setTestimonialIdx((p) => (p === testimonials.length - 1 ? 0 : p + 1))} data-testid="button-testimonial-next">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-faq-title">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border border-border/50 rounded-md px-6 bg-card">
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
