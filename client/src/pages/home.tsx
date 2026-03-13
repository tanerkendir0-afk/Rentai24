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
  "real-estate": Building2,
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
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16" data-testid="section-hero">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[150px] mix-blend-screen" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />

        <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 py-20 items-center">
          <motion.div
            className="lg:col-span-4 flex flex-col items-start space-y-8 relative"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
              <span className="text-sm font-medium text-white/90 tracking-wide">Agents standing by</span>
            </div>

            <h1
              className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]"
              data-testid="text-hero-title"
            >
              Meet your new <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 drop-shadow-sm">
                AI workforce.
              </span>
            </h1>

            <p
              className="text-lg text-white/60 leading-relaxed max-w-md font-medium"
              data-testid="text-hero-subtitle"
            >
              Step into the lobby of the future. Rent pre-trained, specialized AI agents that seamlessly integrate into your team from day one.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/workers">
                <button
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)] active:scale-[0.98]"
                  data-testid="button-hero-browse"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  <span className="relative flex items-center justify-center gap-2 text-base">
                    Hire your first agent
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </Link>

              <Link href="/workers">
                <button
                  className="px-8 py-4 bg-[#12183A] hover:bg-[#1A2250] border border-white/10 hover:border-white/20 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-base shadow-sm"
                  data-testid="button-hero-demo"
                >
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  View Roster
                </button>
              </Link>
            </div>
          </motion.div>

          <div className="lg:col-span-8 relative mt-12 lg:mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

              {[
                { name: "Ava", role: "Customer Support Agent", icon: Headphones, offset: "md:translate-y-0", color: "from-blue-400 to-blue-600", delay: 0 },
                { name: "Rex", role: "Sales Development Rep", icon: TrendingUp, offset: "md:translate-y-8", color: "from-violet-400 to-purple-600", delay: 0.1 },
                { name: "Maya", role: "Social Media Manager", icon: Share2, offset: "md:translate-y-16", color: "from-fuchsia-400 to-pink-600", delay: 0.2 },
                { name: "Finn", role: "Bookkeeping Assistant", icon: Calculator, offset: "md:translate-y-0", color: "from-cyan-400 to-blue-500", delay: 0.15 },
                { name: "Cal", role: "Scheduling Coordinator", icon: CalendarCheck, offset: "md:translate-y-8", color: "from-indigo-400 to-violet-500", delay: 0.25 },
                { name: "Harper", role: "HR & Recruiting Agent", icon: Users, offset: "md:translate-y-16", color: "from-purple-400 to-fuchsia-500", delay: 0.35 },
              ].map((worker) => {
                const Icon = worker.icon;
                return (
                  <motion.div
                    key={worker.name}
                    className={`group relative p-[1px] rounded-[1.25rem] bg-gradient-to-b from-white/10 to-white/0 hover:from-blue-500/50 hover:to-violet-500/50 transition-all duration-500 z-10 ${worker.offset}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + worker.delay }}
                    data-testid={`card-hero-worker-${worker.name.toLowerCase()}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-[1.25rem] blur-xl transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>

                    <div className="relative h-full bg-[#0E1332] hover:bg-[#12183A] backdrop-blur-xl rounded-2xl p-6 flex flex-col items-center text-center overflow-hidden transition-all duration-500 group-hover:-translate-y-2 shadow-lg group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/20 px-2 py-1 rounded-full border border-white/5">
                        <div className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400/90">Available</span>
                      </div>

                      <div className="relative w-24 h-24 mt-6 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ease-out">
                        <div className={`absolute inset-0 bg-gradient-to-br ${worker.color} rounded-full opacity-10 group-hover:opacity-30 blur-lg transition-opacity duration-500`}></div>
                        <div className={`absolute inset-1 bg-gradient-to-br ${worker.color} rounded-full opacity-20 group-hover:opacity-40 blur-md transition-opacity duration-500`}></div>
                        <div className={`absolute inset-3 bg-gradient-to-br ${worker.color} rounded-full opacity-30 group-hover:opacity-50 blur-sm transition-opacity duration-500`}></div>

                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-b from-[#1A2250] to-[#0A0E27] border border-white/10 flex items-center justify-center shadow-inner z-10">
                          <Icon className="w-7 h-7 text-white/90 drop-shadow-md" strokeWidth={1.5} />
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-1.5 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-colors">{worker.name}</h3>
                      <p className="text-sm text-blue-200/60 font-medium leading-relaxed">{worker.role}</p>

                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-y border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {["Synthera", "VoltAI", "NeuralPath", "Cerulean Labs", "Stratosphere", "Apex Dynamics"].map((name) => (
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
