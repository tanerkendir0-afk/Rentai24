import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
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
  LayoutDashboard,
  MessageSquare,
  Settings,
  BookOpen,
  Monitor,
  Globe,
  Shield,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { agents, testimonials, faqItems, industries } from "@/data/agents";
import SectionCTA from "@/components/section-cta";
import PlatformGuide from "@/components/platform-guide";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";

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

const heroWorkers = [
  { name: "Ava", roleKey: "customerSupport", icon: Headphones, color: "from-blue-400 to-blue-600", delay: 0 },
  { name: "Rex", roleKey: "salesDevRep", icon: TrendingUp, color: "from-violet-400 to-purple-600", delay: 0.05 },
  { name: "Maya", roleKey: "socialMedia", icon: Share2, color: "from-fuchsia-400 to-pink-600", delay: 0.1 },
  { name: "Finn", roleKey: "bookkeeping", icon: Calculator, color: "from-cyan-400 to-blue-500", delay: 0.15 },
  { name: "Cal", roleKey: "scheduling", icon: CalendarCheck, color: "from-indigo-400 to-violet-500", delay: 0.2 },
  { name: "Harper", roleKey: "hrRecruiting", icon: Users, color: "from-purple-400 to-fuchsia-500", delay: 0.25 },
  { name: "DataBot", roleKey: "dataAnalyst", icon: BarChart3, color: "from-emerald-400 to-teal-600", delay: 0.3 },
  { name: "ShopBot", roleKey: "ecommerceOps", icon: Package, color: "from-amber-400 to-orange-500", delay: 0.35 },
  { name: "Reno", roleKey: "realEstate", icon: Building2, color: "from-rose-400 to-red-500", delay: 0.4 },
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

const comparisonKeys = ["1", "2", "3", "4", "5", "6"];

function HeroCarousel() {
  const { t: ta } = useTranslation("agents");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-card]")?.clientWidth || 200;
    el.scrollBy({ left: direction === "left" ? -(cardWidth + 16) : (cardWidth + 16), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all shadow-lg hidden sm:flex"
          data-testid="button-carousel-left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all shadow-lg hidden sm:flex"
          data-testid="button-carousel-right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {heroWorkers.map((worker) => {
          const Icon = worker.icon;
          return (
            <motion.div
              key={worker.name}
              data-card
              className="group relative p-[1px] rounded-[1.25rem] bg-gradient-to-b from-white/10 to-white/0 hover:from-blue-500/50 hover:to-violet-500/50 transition-all duration-500 z-10 snap-center shrink-0 w-[180px] sm:w-[200px]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + worker.delay }}
              data-testid={`card-hero-worker-${worker.name.toLowerCase()}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-[1.25rem] blur-xl transition-opacity duration-500 opacity-0 group-hover:opacity-100" />

              <div className="relative h-full bg-[#0E1332] hover:bg-[#12183A] backdrop-blur-xl rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center overflow-hidden transition-all duration-500 group-hover:-translate-y-2 shadow-lg group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/20 px-1.5 py-0.5 rounded-full border border-white/5">
                  <div className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                  </div>
                  <span className="text-[8px] uppercase tracking-wider font-bold text-emerald-400/90">Online</span>
                </div>

                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mt-4 mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ease-out">
                  <div className={`absolute inset-0 bg-gradient-to-br ${worker.color} rounded-full opacity-10 group-hover:opacity-30 blur-lg transition-opacity duration-500`} />
                  <div className={`absolute inset-1 bg-gradient-to-br ${worker.color} rounded-full opacity-20 group-hover:opacity-40 blur-md transition-opacity duration-500`} />
                  <div className={`absolute inset-3 bg-gradient-to-br ${worker.color} rounded-full opacity-30 group-hover:opacity-50 blur-sm transition-opacity duration-500`} />
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#1A2250] to-[#0A0E27] border border-white/10 flex items-center justify-center shadow-inner z-10">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white/90 drop-shadow-md" strokeWidth={1.5} />
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mb-1 tracking-tight">{worker.name}</h3>
                <p className="text-[11px] sm:text-xs text-blue-200/60 font-medium leading-relaxed">{ta(`heroRoles.${worker.roleKey}`)}</p>

                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center gap-1.5 mt-3 sm:hidden">
        {heroWorkers.map((w, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
        ))}
      </div>
    </div>
  );
}

const showcaseScenes = [
  { id: "office", titleKey: "office", icon: Monitor, color: "from-blue-500 to-indigo-600", duration: 8000 },
  { id: "agents", titleKey: "agents", icon: Users, color: "from-violet-500 to-purple-600", duration: 8000 },
  { id: "tasks", titleKey: "tasks", icon: Zap, color: "from-emerald-500 to-teal-600", duration: 8000 },
  { id: "results", titleKey: "results", icon: TrendingUp, color: "from-amber-500 to-orange-600", duration: 8000 },
  { id: "scale", titleKey: "scale", icon: Globe, color: "from-rose-500 to-pink-600", duration: 8000 },
];

function OfficeScene({ active }: { active: boolean }) {
  const { t } = useTranslation("pages");
  const officeItems = [
    { icon: Monitor, labelKey: "workspace", color: "text-blue-400" },
    { icon: MessageSquare, labelKey: "liveChat", color: "text-violet-400" },
    { icon: Mail, labelKey: "emails", color: "text-cyan-400" },
    { icon: BarChart3, labelKey: "analytics", color: "text-emerald-400" },
    { icon: CalendarCheck, labelKey: "calendar", color: "text-amber-400" },
    { icon: Shield, labelKey: "security", color: "text-rose-400" },
  ];
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-md">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl"
          animate={active ? { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] } : {}}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="relative grid grid-cols-3 gap-3 p-4">
          {officeItems.map((item, i) => (
            <motion.div
              key={item.labelKey}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={active ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/30"
            >
              <item.icon className={`w-6 h-6 ${item.color}`} />
              <span className="text-[10px] text-muted-foreground font-medium">{t(`home.officeLabels.${item.labelKey}`)}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"
          animate={active ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        </motion.div>
      </div>
    </div>
  );
}

function AgentsScene({ active }: { active: boolean }) {
  const { t: ta } = useTranslation("agents");
  const agentsToShow = heroWorkers.slice(0, 6);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {agentsToShow.map((agent, i) => {
          const Icon = agent.icon;
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 30, rotateY: -30 }}
              animate={active ? { opacity: 1, y: 0, rotateY: 0 } : { opacity: 0, y: 30, rotateY: -30 }}
              transition={{ duration: 0.6, delay: i * 0.12, type: "spring", damping: 15 }}
              className="flex flex-col items-center p-3 rounded-xl bg-card/50 border border-border/30 group"
            >
              <motion.div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center mb-2`}
                animate={active ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              >
                <Icon className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-xs font-semibold text-foreground">{agent.name}</span>
              <span className="text-[9px] text-muted-foreground">{ta(`heroRoles.${agent.roleKey}`)}</span>
              <motion.div
                className="mt-1.5 flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={active ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[8px] text-emerald-400">{ta("heroRoles.ready", "Ready")}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TasksScene({ active }: { active: boolean }) {
  const { t } = useTranslation("pages");
  const tasks = [
    { labelKey: "task1", agent: "Rex", done: false },
    { labelKey: "task2", agent: "Ava", done: false },
    { labelKey: "task3", agent: "Cal", done: false },
    { labelKey: "task4", agent: "DataBot", done: false },
    { labelKey: "task5", agent: "Finn", done: false },
  ];
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

  useEffect(() => {
    if (!active) { setCompletedTasks([]); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    tasks.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setCompletedTasks(prev => [...prev, i]);
      }, 1500 + i * 1200));
    });
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-full max-w-sm space-y-2">
        {tasks.map((task, i) => {
          const isDone = completedTasks.includes(i);
          return (
            <motion.div
              key={task.labelKey}
              initial={{ opacity: 0, x: 40 }}
              animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-500 ${
                isDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-blue-500/20 bg-blue-500/5"
              }`}
            >
              <motion.div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isDone ? "bg-emerald-500/20" : "bg-blue-500/20"
                }`}
                animate={isDone ? {} : { rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                )}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-foreground truncate">{t(`home.taskLabels.${task.labelKey}`)}</div>
                <div className={`text-[9px] ${isDone ? "text-emerald-400" : "text-blue-400/70"}`}>
                  {isDone ? t("home.taskLabels.completed") : t("home.taskLabels.working", { agent: task.agent })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ResultsScene({ active }: { active: boolean }) {
  const { t } = useTranslation("pages");
  const [counts, setCounts] = useState({ revenue: 0, time: 0, satisfaction: 0, tasks: 0 });

  useEffect(() => {
    if (!active) { setCounts({ revenue: 0, time: 0, satisfaction: 0, tasks: 0 }); return; }
    const targets = { revenue: 40, time: 80, satisfaction: 98, tasks: 1250 };
    const start = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / 2500);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounts({
        revenue: Math.round(targets.revenue * eased),
        time: Math.round(targets.time * eased),
        satisfaction: Math.round(targets.satisfaction * eased),
        tasks: Math.round(targets.tasks * eased),
      });
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          { labelKey: "costSavings", value: `${counts.revenue}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { labelKey: "timeSaved", value: `${counts.time}hrs/mo`, icon: CalendarCheck, color: "text-blue-400", bg: "bg-blue-500/10" },
          { labelKey: "satisfaction", value: `${counts.satisfaction}%`, icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
          { labelKey: "tasksDone", value: counts.tasks.toLocaleString(), icon: CheckCircle2, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.labelKey}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, delay: i * 0.15, type: "spring" }}
            className={`p-4 rounded-xl ${stat.bg} border border-border/20 text-center`}
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{t(`home.resultLabels.${stat.labelKey}`)}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ScaleScene({ active }: { active: boolean }) {
  const { t } = useTranslation("pages");
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-full max-w-sm">
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs text-muted-foreground">{t("home.scaleLabels.teamGrowing")}</span>
        </motion.div>
        <div className="flex items-end justify-center gap-2">
          {[1, 3, 5, 7, 9].map((count, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={active ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.6, delay: i * 0.3, type: "spring" }}
              style={{ originY: 1 }}
            >
              <div
                className="w-12 rounded-lg bg-gradient-to-t from-blue-500/30 to-violet-500/30 border border-border/20 flex items-end justify-center pb-1"
                style={{ height: `${20 + count * 12}px` }}
              >
                <span className="text-xs font-bold text-foreground">{count}</span>
              </div>
              <span className="text-[8px] text-muted-foreground">
                {[t("home.scaleLabels.week1"), t("home.scaleLabels.month1"), t("home.scaleLabels.month3"), t("home.scaleLabels.month6"), t("home.scaleLabels.year1")][i]}
              </span>
            </motion.div>
          ))}
        </div>
        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          <Badge className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-400 border-blue-500/20">
            {t("home.scaleLabels.scaleInstantly")}
          </Badge>
        </motion.div>
      </div>
    </div>
  );
}

const sceneComponents: Record<string, (props: { active: boolean }) => JSX.Element> = {
  office: OfficeScene,
  agents: AgentsScene,
  tasks: TasksScene,
  results: ResultsScene,
  scale: ScaleScene,
};

function AnimatedShowcase() {
  const { t } = useTranslation("pages");
  const [activeScene, setActiveScene] = useState(0);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  useEffect(() => {
    if (!isInView) return;
    const timer = setInterval(() => {
      setActiveScene(prev => (prev + 1) % showcaseScenes.length);
    }, showcaseScenes[activeScene].duration);
    return () => clearInterval(timer);
  }, [isInView, activeScene]);

  const scene = showcaseScenes[activeScene];
  const SceneComponent = sceneComponents[scene.id];

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden" data-testid="section-showcase">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-[20%] left-[15%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, delay: 3 }}
        />
      </div>

      <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div className="text-center mb-10 sm:mb-14" {...fadeUp}>
          <Badge className="mb-4 bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-400 border-blue-500/20" data-testid="badge-showcase">
            <Sparkles className="w-3 h-3 mr-1" /> {t("home.showcase.badge")}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-showcase-title">
            {t("home.showcase.title")}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
            {t("home.showcase.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-4">
            {showcaseScenes.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === activeScene;
              return (
                <motion.button
                  key={s.id}
                  onClick={() => setActiveScene(i)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left ${
                    isActive
                      ? "border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/5"
                      : "border-border/30 bg-card/30 hover:border-border/50"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  data-testid={`showcase-scene-${s.id}`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0 ${isActive ? "shadow-lg" : "opacity-60"}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{t(`home.showcaseScenes.${s.titleKey}.title`)}</div>
                    <div className="text-xs text-muted-foreground/70">{t(`home.showcaseScenes.${s.titleKey}.subtitle`)}</div>
                  </div>
                  {isActive && (
                    <motion.div
                      className="w-1.5 h-8 rounded-full bg-gradient-to-b from-blue-500 to-violet-500"
                      layoutId="showcase-indicator"
                    />
                  )}
                </motion.button>
              );
            })}

            <div className="flex items-center gap-2 pt-2">
              {showcaseScenes.map((_, i) => (
                <div key={i} className="flex-1 relative h-1 rounded-full bg-border/30 overflow-hidden">
                  {i === activeScene && (
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: showcaseScenes[activeScene].duration / 1000, ease: "linear" }}
                      key={`progress-${activeScene}-${Date.now()}`}
                    />
                  )}
                  {i < activeScene && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[300px] sm:min-h-[350px]">
            <div className="absolute inset-0 bg-gradient-to-br from-card/50 to-card/30 rounded-2xl border border-border/30 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
              <div className="p-4 sm:p-6 h-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScene}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full"
                  >
                    <SceneComponent active={true} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const quickActions = [
  { icon: LayoutDashboard, labelKey: "dashboard", descKey: "dashboardDesc", href: "/dashboard", color: "from-blue-500 to-indigo-500" },
  { icon: MessageSquare, labelKey: "chat", descKey: "chatDesc", href: "/chat", color: "from-violet-500 to-purple-500" },
  { icon: Users, labelKey: "aiWorkers", descKey: "aiWorkersDesc", href: "/workers", color: "from-fuchsia-500 to-pink-500" },
  { icon: Settings, labelKey: "settings", descKey: "settingsDesc", href: "/settings", color: "from-amber-500 to-orange-500" },
  { icon: BookOpen, labelKey: "guide", descKey: "guideDesc", href: "/guide", color: "from-emerald-500 to-teal-500" },
];

function LoggedInHome({ userName }: { userName: string }) {
  const { t } = useTranslation("pages");
  const firstName = userName.split(" ")[0];

  return (
    <div className="overflow-x-hidden">
      <section className="relative min-h-[60vh] flex items-center overflow-hidden pt-16" data-testid="section-welcome">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/15 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-violet-600/15 rounded-full blur-[120px] mix-blend-screen" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 py-12 sm:py-20">
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-sm font-medium text-white/90">{t("home.loggedIn.teamOnline")}</span>
            </motion.div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight" data-testid="text-welcome-title">
              {t("home.loggedIn.welcomeBack", { name: firstName })}
            </h1>

            <p className="text-base sm:text-lg text-white/50 max-w-lg mx-auto" data-testid="text-welcome-subtitle">
              {t("home.loggedIn.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-10 sm:py-16 relative" data-testid="section-quick-actions">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8"
            {...fadeUp}
            data-testid="text-quick-actions"
          >
            {t("home.loggedIn.quickActions")}
          </motion.h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.labelKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link href={action.href}>
                    <Card
                      className="p-4 sm:p-5 bg-card border-border/50 hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center group"
                      data-testid={`quick-action-${action.labelKey}`}
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm mb-0.5">{t(`home.loggedIn.${action.labelKey}`)}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{t(`home.loggedIn.${action.descKey}`)}</p>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-16 relative bg-card/30" data-testid="section-active-agents">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="flex items-center justify-between mb-6 sm:mb-8" {...fadeUp}>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-active-agents">
              {t("home.loggedIn.yourTeam")}
            </h2>
            <Link href="/workers">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" data-testid="link-view-all-agents">
                {t("home.loggedIn.viewAll")} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.slice(0, 6).map((agent, i) => {
              const Icon = agentIcons[agent.id] || Bot;
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Card className="p-4 bg-card border-border/50 hover:border-blue-500/30 transition-all duration-300" data-testid={`agent-summary-${agent.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground text-sm truncate">{agent.name}</h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[9px] text-emerald-400">{t("home.loggedIn.active")}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                      </div>
                      <Link href={`/workers/${agent.slug}`}>
                        <Button size="sm" variant="ghost" className="text-xs shrink-0 h-8" data-testid={`button-agent-${agent.id}`}>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-16 relative" data-testid="section-recent-activity">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8"
            {...fadeUp}
            data-testid="text-recent-activity"
          >
            {t("home.loggedIn.recentActivity")}
          </motion.h2>
          <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-recent-activity">
            <div className="space-y-4">
              {[
                { icon: Mail, textKey: "activity1", timeKey: "time2h", color: "text-violet-400", bg: "bg-violet-500/10" },
                { icon: MessageSquare, textKey: "activity2", timeKey: "time4h", color: "text-blue-400", bg: "bg-blue-500/10" },
                { icon: BarChart3, textKey: "activity3", timeKey: "time6h", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                { icon: CalendarCheck, textKey: "activity4", timeKey: "timeYesterday", color: "text-amber-400", bg: "bg-amber-500/10" },
                { icon: Share2, textKey: "activity5", timeKey: "timeYesterday", color: "text-pink-400", bg: "bg-pink-500/10" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  data-testid={`activity-item-${i}`}
                >
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{t(`home.loggedIn.${item.textKey}`)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(`home.loggedIn.${item.timeKey}`)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="py-10 sm:py-16 bg-card/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3" data-testid="text-explore-more">
              {t("home.loggedIn.exploreMore")}
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              {t("home.loggedIn.exploreSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/guide">
                <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 px-6" data-testid="button-explore-guide">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t("home.loggedIn.platformGuide")}
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button variant="outline" className="px-6 border-border/30" data-testid="button-explore-how">
                  {t("home.loggedIn.howItWorks")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation("pages");
  const { user, isLoading } = useAuth();
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const comparisonRef = useRef(null);
  const industriesRef = useRef(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const { scrollYProgress: statsProgress } = useScroll({
    target: statsRef,
    offset: ["start end", "end start"],
  });

  const { scrollYProgress: comparisonProgress } = useScroll({
    target: comparisonRef,
    offset: ["start end", "end start"],
  });

  const { scrollYProgress: industriesProgress } = useScroll({
    target: industriesRef,
    offset: ["start end", "end start"],
  });

  const heroBlob1Y = useTransform(heroProgress, [0, 1], [0, 150]);
  const heroBlob2Y = useTransform(heroProgress, [0, 1], [0, -100]);
  const heroBlob3Y = useTransform(heroProgress, [0, 1], [0, 80]);
  const statsY = useTransform(statsProgress, [0, 1], [60, -30]);
  const comparisonY = useTransform(comparisonProgress, [0, 1], [40, -20]);
  const industriesY = useTransform(industriesProgress, [0, 1], [50, -25]);

  useEffect(() => {
    if (user) return;
    const timer = setInterval(() => {
      setTestimonialIdx((p) => (p === testimonials.length - 1 ? 0 : p + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (user) {
    return <LoggedInHome userName={user.fullName || user.username} />;
  }

  return (
    <div className="overflow-x-hidden">
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden pt-16" data-testid="section-hero">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-[10%] left-[20%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"
            style={{ y: heroBlob1Y }}
          />
          <motion.div
            className="absolute bottom-[10%] right-[10%] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-violet-600/20 rounded-full blur-[150px] mix-blend-screen"
            style={{ y: heroBlob2Y }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] h-[250px] sm:h-[400px] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen"
            style={{ y: heroBlob3Y }}
          />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />

        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-12 relative z-10 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            <motion.div
              className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 sm:space-y-8 relative"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                <span className="text-sm font-medium text-white/90 tracking-wide">{t("home.hero.agentsStandingBy")}</span>
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]"
                data-testid="text-hero-title"
              >
                {t("home.hero.titleLine1")} <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 drop-shadow-sm">
                  {t("home.hero.titleLine2")}
                </span>
              </h1>

              <p
                className="text-base sm:text-lg text-white/60 leading-relaxed max-w-md font-medium"
                data-testid="text-hero-subtitle"
              >
                {t("home.hero.subtitle")}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link href="/workers">
                  <button
                    className="group relative w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)] active:scale-[0.98]"
                    data-testid="button-hero-browse"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    <span className="relative flex items-center justify-center gap-2 text-sm sm:text-base">
                      {t("home.hero.startFree")}
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </Link>

                <Link href="/workers">
                  <button
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#12183A] hover:bg-[#1A2250] border border-white/10 hover:border-white/20 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm"
                    data-testid="button-hero-demo"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                    {t("home.hero.viewRoster")}
                  </button>
                </Link>
              </div>
            </motion.div>

            <div className="lg:col-span-8 relative">
              <HeroCarousel />
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12 border-y border-border/30 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8">{t("home.trustedBy")}</p>
          <div className="flex items-center justify-center gap-6 sm:gap-12 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: "none" }}>
            {["Synthera", "VoltAI", "NeuralPath", "Cerulean Labs", "Stratosphere", "Apex Dynamics"].map((name) => (
              <span key={name} className="text-muted-foreground/30 font-bold text-base sm:text-xl tracking-wider whitespace-nowrap shrink-0">{name}</span>
            ))}
          </div>
        </div>
      </section>

      <AnimatedShowcase />

      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-how-title">
              {t("home.howItWorks.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              {t("home.howItWorks.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: Search, step: "01", titleKey: "step1Title", descKey: "step1Desc" },
              { icon: ClipboardCheck, step: "02", titleKey: "step2Title", descKey: "step2Desc" },
              { icon: Zap, step: "03", titleKey: "step3Title", descKey: "step3Desc" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <Card className="relative p-6 sm:p-8 bg-card border-border/50 h-full hover:border-blue-500/30 transition-colors duration-300">
                  <div className="text-4xl sm:text-5xl font-bold text-blue-500/10 absolute top-4 right-6">{item.step}</div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-4 sm:mb-5">
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">{t(`home.howItWorks.${item.titleKey}`)}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{t(`home.howItWorks.${item.descKey}`)}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 relative bg-card/30" data-testid="section-platform-demo">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-demo-title">
              {t("home.demo.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              {t("home.demo.subtitle")}
            </p>
          </motion.div>
          <PlatformGuide variant="home" />
        </div>
      </section>

      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-catalog-title">
              {t("home.catalog.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              {t("home.catalog.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {agents.map((agent, i) => {
              const Icon = agentIcons[agent.id] || Bot;
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <Card className="p-5 sm:p-6 bg-card border-border/50 h-full flex flex-col hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300" data-testid={`card-agent-${agent.id}`}>
                    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{agent.name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">{agent.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-emerald-400">{t("home.catalog.online")}</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4">{agent.shortDescription}</p>
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                      {agent.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] sm:text-xs">{skill}</Badge>
                      ))}
                      {agent.skills.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">+{agent.skills.length - 3}</Badge>
                      )}
                    </div>
                    {agent.tag && (
                      <Badge className="self-start mb-3 sm:mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] sm:text-xs no-default-active-elevate">{agent.tag}</Badge>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3 sm:pt-4 border-t border-border/50">
                      <div>
                        <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">${agent.price}</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">/mo</span>
                      </div>
                      <Link href={`/workers/${agent.slug}`}>
                        <Button size="sm" variant="secondary" className="text-xs sm:text-sm" data-testid={`button-profile-${agent.id}`}>
                          {t("home.catalog.viewProfile")}
                          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div className="text-center mt-8 sm:mt-12" {...fadeUp}>
            <Link href="/workers">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 text-sm sm:text-base" data-testid="button-view-all">
                {t("home.catalog.viewAll")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section ref={statsRef} className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div style={{ y: statsY }}>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-8">
              {[
                { value: 150, suffix: "+", labelKey: "aiWorkers", color: "text-blue-400" },
                { value: 500, suffix: "+", labelKey: "businesses", color: "text-violet-400" },
                { value: 247, suffix: "", labelKey: "uptime", color: "text-blue-400", display: "24/7" },
                { value: 40, suffix: "%", labelKey: "savings", color: "text-violet-400" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.labelKey}
                  className="text-center p-4 sm:p-6 rounded-2xl bg-card/50 border border-border/30 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  data-testid={`stat-${stat.labelKey}`}
                >
                  <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${stat.color} mb-1 sm:mb-2`}>
                    {stat.display ? stat.display : <AnimatedCounter target={stat.value} suffix={stat.suffix} />}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t(`home.stats.${stat.labelKey}`)}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section ref={comparisonRef} className="py-16 sm:py-24 relative bg-card/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-comparison-title">
              {t("home.comparison.title")}
            </h2>
          </motion.div>

          <motion.div style={{ y: comparisonY }}>
            <div className="hidden sm:block">
              <Card className="bg-card border-border/50 overflow-visible">
                <div className="grid grid-cols-[1fr,1fr] gap-0">
                  <div className="px-6 sm:px-8 py-3 sm:py-4 border-b border-r border-border/50 text-center">
                    <h3 className="font-semibold text-muted-foreground text-sm sm:text-base">{t("home.comparison.traditional")}</h3>
                  </div>
                  <div className="px-6 sm:px-8 py-3 sm:py-4 border-b border-border/50 text-center">
                    <h3 className="font-semibold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent text-sm sm:text-base">{t("home.comparison.rentai")}</h3>
                  </div>
                  {comparisonKeys.map((k, i) => (
                    <div key={i} className="contents">
                      <div className={`px-6 sm:px-8 py-3 sm:py-4 ${i < comparisonKeys.length - 1 ? "border-b" : ""} border-r border-border/50 flex items-center gap-2 sm:gap-3`}>
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 shrink-0" />
                        <span className="text-xs sm:text-sm text-muted-foreground">{t(`home.comparison.old${k}`)}</span>
                      </div>
                      <div className={`px-6 sm:px-8 py-3 sm:py-4 ${i < comparisonKeys.length - 1 ? "border-b" : ""} border-border/50 flex items-center gap-2 sm:gap-3`}>
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs sm:text-sm text-foreground font-medium">{t(`home.comparison.new${k}`)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="sm:hidden space-y-2.5">
              {comparisonKeys.map((k, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="p-3.5 bg-card border-border/50">
                    <div className="flex items-start gap-2 mb-1.5">
                      <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-muted-foreground">{t(`home.comparison.old${k}`)}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground font-medium">{t(`home.comparison.new${k}`)}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section ref={industriesRef} className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-industries-title">
              {t("home.industries.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              {t("home.industries.subtitle")}
            </p>
          </motion.div>

          <motion.div style={{ y: industriesY }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {industries.map((ind, i) => {
              const Icon = industryIcons[ind.icon] || Bot;
              return (
                <motion.div
                  key={ind.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Card className="p-4 sm:p-5 bg-card border-border/50 text-center hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300" data-testid={`card-industry-${i}`}>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    </div>
                    <h3 className="font-medium text-foreground text-[10px] sm:text-xs md:text-sm leading-tight">{ind.name}</h3>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="py-16 sm:py-24 relative bg-card/30 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-testimonials-title">
              {t("home.testimonials.title")}
            </h2>
          </motion.div>

          <motion.div {...fadeUp}>
            <Card
              className="p-6 sm:p-8 md:p-10 bg-card border-border/50 relative touch-pan-y"
              data-testid="card-testimonial"
              onTouchStart={(e) => setDragStartX(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (dragStartX === null) return;
                const diff = e.changedTouches[0].clientX - dragStartX;
                if (Math.abs(diff) > 50) {
                  if (diff < 0) setTestimonialIdx((p) => (p === testimonials.length - 1 ? 0 : p + 1));
                  else setTestimonialIdx((p) => (p === 0 ? testimonials.length - 1 : p - 1));
                }
                setDragStartX(null);
              }}
            >
              <div className="text-blue-500/20 text-5xl sm:text-6xl font-serif absolute top-3 sm:top-4 left-4 sm:left-6">"</div>
              <div className="relative z-10">
                <p className="text-sm sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6 italic">
                  {testimonials[testimonialIdx].text}
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm sm:text-base">
                      {testimonials[testimonialIdx].name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm sm:text-base">{testimonials[testimonialIdx].name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {testimonials[testimonialIdx].role} at {testimonials[testimonialIdx].company}
                      </div>
                    </div>
                  </div>
                  <div className="sm:ml-auto flex gap-1">
                    {Array.from({ length: testimonials[testimonialIdx].rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-6">
              <Button size="icon" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9" aria-label="Previous testimonial" onClick={() => setTestimonialIdx((p) => (p === 0 ? testimonials.length - 1 : p - 1))} data-testid="button-testimonial-prev">
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTestimonialIdx(i)} aria-label={`Testimonial ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i === testimonialIdx ? "bg-blue-500 scale-125" : "bg-muted hover:bg-muted-foreground/30"}`}
                    data-testid={`button-testimonial-dot-${i}`}
                  />
                ))}
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9" aria-label="Next testimonial" onClick={() => setTestimonialIdx((p) => (p === testimonials.length - 1 ? 0 : p + 1))} data-testid="button-testimonial-next">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 sm:py-24 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10 sm:mb-16" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-faq-title">
              {t("home.faq.title")}
            </h2>
          </motion.div>

          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="space-y-2 sm:space-y-3" data-testid="faq-accordion">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border border-border/50 rounded-md px-4 sm:px-6 bg-card">
                  <AccordionTrigger className="text-left text-foreground font-medium py-3 sm:py-4 text-sm sm:text-base" data-testid={`faq-trigger-${i}`}>
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-3 sm:pb-4 leading-relaxed text-xs sm:text-sm" data-testid={`faq-content-${i}`}>
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
