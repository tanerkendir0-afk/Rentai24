import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MessageSquare,
  Mail,
  BarChart3,
  LayoutDashboard,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  Zap,
  Check,
  Bot,
  Send,
  Sparkles,
} from "lucide-react";

interface PlatformGuideProps {
  variant?: "home" | "full";
}

const steps = [
  {
    id: "browse",
    title: "Browse & Hire AI Workers",
    subtitle: "Find the perfect AI agent for your needs",
    icon: Search,
    color: "from-blue-500 to-indigo-500",
    accentColor: "blue",
  },
  {
    id: "chat",
    title: "Chat with Your AI Team",
    subtitle: "Talk to your agents like real team members",
    icon: MessageSquare,
    color: "from-violet-500 to-purple-500",
    accentColor: "violet",
  },
  {
    id: "tasks",
    title: "AI Workers Perform Tasks",
    subtitle: "They handle the heavy lifting automatically",
    icon: Zap,
    color: "from-emerald-500 to-teal-500",
    accentColor: "emerald",
  },
  {
    id: "dashboard",
    title: "Manage Everything in One Place",
    subtitle: "Track usage, performance, and results",
    icon: LayoutDashboard,
    color: "from-amber-500 to-orange-500",
    accentColor: "amber",
  },
];

const agentMini = [
  { name: "Ava", role: "Support", icon: Headphones, color: "from-blue-400 to-blue-600" },
  { name: "Rex", role: "Sales", icon: TrendingUp, color: "from-violet-400 to-purple-600" },
  { name: "Maya", role: "Social", icon: Share2, color: "from-fuchsia-400 to-pink-600" },
  { name: "Finn", role: "Finance", icon: Calculator, color: "from-cyan-400 to-blue-500" },
  { name: "Cal", role: "Schedule", icon: CalendarCheck, color: "from-indigo-400 to-violet-500" },
  { name: "Harper", role: "HR", icon: Users, color: "from-purple-400 to-fuchsia-500" },
];

function BrowseAnimation({ active }: { active: boolean }) {
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [hired, setHired] = useState(false);

  useEffect(() => {
    if (!active) { setSelectedIdx(-1); setHired(false); return; }
    const t1 = setTimeout(() => setSelectedIdx(0), 400);
    const t2 = setTimeout(() => setSelectedIdx(1), 1200);
    const t3 = setTimeout(() => setSelectedIdx(2), 2000);
    const t4 = setTimeout(() => setSelectedIdx(1), 2800);
    const t5 = setTimeout(() => setHired(true), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [active]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="space-y-2">
        {agentMini.slice(0, 3).map((agent, i) => {
          const Icon = agent.icon;
          const isSelected = selectedIdx === i;
          const isHiredAgent = hired && i === 1;
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: active ? 1 : 0,
                x: active ? 0 : -20,
                scale: isSelected ? 1.03 : 1,
              }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                isSelected ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10" :
                isHiredAgent ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/30 bg-card/50"
              }`}>
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">{agent.role}</div>
                </div>
                {isHiredAgent ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                  >
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                      <Check className="w-3 h-3 mr-0.5" /> Hired
                    </Badge>
                  </motion.div>
                ) : isSelected ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  </motion.div>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ChatAnimation({ active }: { active: boolean }) {
  const [messages, setMessages] = useState<Array<{from: string; text: string; typing?: boolean}>>([]);

  useEffect(() => {
    if (!active) { setMessages([]); return; }
    const msgs = [
      { from: "user", text: "Hey Rex, can you draft a cold outreach email for our new product launch?" },
      { from: "agent", text: "", typing: true },
      { from: "agent", text: "Sure! I've drafted a personalized cold email targeting tech CTOs. Shall I send it to your leads list?" },
      { from: "user", text: "Perfect, send it out to the top 50 leads!" },
      { from: "agent", text: "", typing: true },
      { from: "agent", text: "Done! 50 emails sent. I'll track open rates and follow up in 3 days automatically." },
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let delay = 300;
    msgs.forEach((msg, i) => {
      timers.push(setTimeout(() => {
        setMessages(prev => {
          const next = [...prev.filter(m => !m.typing)];
          next.push(msg);
          return next;
        });
      }, delay));
      delay += msg.typing ? 800 : msg.from === "user" ? 1200 : 1500;
    });
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/80">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
            <TrendingUp className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">Rex — Sales SDR</span>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-emerald-400">Online</span>
          </div>
        </div>
        <div className="p-3 space-y-2 min-h-[160px] max-h-[200px] overflow-hidden">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed ${
                  msg.from === "user"
                    ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white"
                    : "bg-card border border-border/30 text-foreground"
                }`}>
                  {msg.typing ? (
                    <div className="flex gap-1 py-1">
                      {[0, 1, 2].map(j => (
                        <motion.div
                          key={j}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: j * 0.2 }}
                        />
                      ))}
                    </div>
                  ) : msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border/30">
          <div className="flex-1 h-7 rounded-full bg-background/50 border border-border/20 px-3 flex items-center">
            <span className="text-[10px] text-muted-foreground/50">Type a message...</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center">
            <Send className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksAnimation({ active }: { active: boolean }) {
  const [tasks, setTasks] = useState<Array<{label: string; icon: any; done: boolean}>>([]);

  useEffect(() => {
    if (!active) { setTasks([]); return; }
    const items = [
      { label: "Sending 50 outreach emails", icon: Mail, done: false },
      { label: "Generating analytics report", icon: BarChart3, done: false },
      { label: "Scheduling 12 appointments", icon: CalendarCheck, done: false },
      { label: "Responding to support tickets", icon: MessageSquare, done: false },
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    items.forEach((item, i) => {
      timers.push(setTimeout(() => {
        setTasks(prev => [...prev, item]);
      }, 400 + i * 600));
      timers.push(setTimeout(() => {
        setTasks(prev => prev.map((t, idx) => idx === i ? {...t, done: true} : t));
      }, 1200 + i * 600));
    });
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="relative w-full max-w-sm mx-auto space-y-2">
      <AnimatePresence>
        {tasks.map((task, i) => {
          const Icon = task.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                task.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-blue-500/30 bg-blue-500/5"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ${
                task.done ? "bg-emerald-500/20" : "bg-blue-500/20"
              }`}>
                {task.done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </motion.div>
                ) : (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Icon className="w-4 h-4 text-blue-400" />
                  </motion.div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{task.label}</div>
                <div className={`text-[10px] ${task.done ? "text-emerald-400" : "text-blue-400"}`}>
                  {task.done ? "Completed" : "In progress..."}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function DashboardAnimation({ active }: { active: boolean }) {
  const [stats, setStats] = useState({ workers: 0, messages: 0, tasks: 0 });

  useEffect(() => {
    if (!active) { setStats({ workers: 0, messages: 0, tasks: 0 }); return; }
    const duration = 2000;
    const targets = { workers: 9, messages: 834, tasks: 156 };
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setStats({
        workers: Math.round(targets.workers * eased),
        messages: Math.round(targets.messages * eased),
        tasks: Math.round(targets.tasks * eased),
      });
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-border/30 bg-card/80">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-foreground">Dashboard</span>
          </div>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Workers", value: stats.workers, color: "text-blue-400" },
              { label: "Messages", value: stats.messages, color: "text-violet-400" },
              { label: "Tasks Done", value: stats.tasks, color: "text-emerald-400" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.8 }}
                transition={{ duration: 0.5 }}
                className="text-center p-2 rounded-lg bg-background/30 border border-border/20"
              >
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[9px] text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
          <div className="space-y-1.5">
            {["Rex completed 50 emails", "Ava resolved 12 tickets", "Maya posted 5 updates"].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: active ? 1 : 0, x: active ? 0 : -10 }}
                transition={{ duration: 0.4, delay: 0.8 + i * 0.3 }}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-background/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-muted-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const stepAnimations: Record<string, React.ComponentType<{active: boolean}>> = {
  browse: BrowseAnimation,
  chat: ChatAnimation,
  tasks: TasksAnimation,
  dashboard: DashboardAnimation,
};

export default function PlatformGuide({ variant = "home" }: PlatformGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  useEffect(() => {
    if (!isInView) return;
    const timer = setInterval(() => {
      setActiveStep(prev => {
        const next = (prev + 1) % steps.length;
        setAnimKey(k => k + 1);
        return next;
      });
    }, 5500);
    return () => clearInterval(timer);
  }, [isInView]);

  const goToStep = (idx: number) => {
    setActiveStep(idx);
    setAnimKey(k => k + 1);
  };

  const currentStep = steps[activeStep];
  const StepIcon = currentStep.icon;
  const AnimComponent = stepAnimations[currentStep.id];

  const isFullPage = variant === "full";

  return (
    <div
      ref={containerRef}
      className="relative"
      data-testid="platform-guide"
    >
      <div className={`max-w-6xl mx-auto ${isFullPage ? "px-4 sm:px-6 lg:px-8" : ""}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              {steps.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(i)}
                  className="flex-1 group"
                  data-testid={`guide-step-${step.id}`}
                >
                  <div className="relative h-1 rounded-full bg-border/30 overflow-hidden mb-2">
                    {i === activeStep && (
                      <motion.div
                        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${step.color} rounded-full`}
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 5.5, ease: "linear" }}
                        key={animKey}
                      />
                    )}
                    {i < activeStep && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${step.color} rounded-full`} />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors ${
                    i === activeStep ? "text-foreground" : "text-muted-foreground/50"
                  }`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center`}>
                    <StepIcon className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border/30">
                    Step {activeStep + 1} of {steps.length}
                  </Badge>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{currentStep.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.subtitle}</p>

                {isFullPage && (
                  <div className="mt-4 space-y-2">
                    {activeStep === 0 && (
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Browse 9 specialized AI agents</li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Filter by role, skill, or industry</li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Hire in seconds with one click</li>
                      </ul>
                    )}
                    {activeStep === 1 && (
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Natural language conversations</li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Agents understand context and history</li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Upload images, files, and data</li>
                      </ul>
                    )}
                    {activeStep === 2 && (
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Send emails, create reports, schedule meetings</li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Integrate with 50+ tools you already use</li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Automatic follow-ups and reminders</li>
                      </ul>
                    )}
                    {activeStep === 3 && (
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Real-time performance metrics</li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Activity log for all agent actions</li>
                        <li className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Usage tracking and billing management</li>
                      </ul>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8"
                onClick={() => goToStep((activeStep - 1 + steps.length) % steps.length)}
                data-testid="guide-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8"
                onClick={() => goToStep((activeStep + 1) % steps.length)}
                data-testid="guide-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${currentStep.color} opacity-5 rounded-2xl blur-3xl transition-all duration-700`} />
            <div className="relative p-6 sm:p-8 rounded-2xl border border-border/20 bg-background/30 backdrop-blur-sm min-h-[300px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentStep.id}-${animKey}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="w-full"
                >
                  <AnimComponent active={isInView} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {variant === "home" && (
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/workers">
              <Button
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 text-sm px-6"
                data-testid="guide-cta-hire"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Hiring AI Workers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/guide">
              <Button variant="outline" className="text-sm px-6 border-border/30" data-testid="guide-cta-full">
                <Bot className="w-4 h-4 mr-2" />
                Full Platform Guide
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
