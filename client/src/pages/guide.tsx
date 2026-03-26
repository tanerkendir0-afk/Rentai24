import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  ArrowRight,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  BarChart3,
  Package,
  Building2,
  MessageSquare,
  Settings,
  Upload,
  Globe,
  Smartphone,
  Shield,
  Check,
  Zap,
  BookOpen,
  Lightbulb,
  Puzzle,
  Target,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Star,
  Layers,
  Terminal,
  FileText,
} from "lucide-react";
import PlatformGuide from "@/components/platform-guide";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const getAgentList = (t: (key: string) => string) => [
  { name: "Ava", role: t("guide.agents.ava.role"), icon: Headphones, desc: t("guide.agents.ava.desc") },
  { name: "Rex", role: t("guide.agents.rex.role"), icon: TrendingUp, desc: t("guide.agents.rex.desc") },
  { name: "Maya", role: t("guide.agents.maya.role"), icon: Share2, desc: t("guide.agents.maya.desc") },
  { name: "Finn", role: t("guide.agents.finn.role"), icon: Calculator, desc: t("guide.agents.finn.desc") },
  { name: "Cal", role: t("guide.agents.cal.role"), icon: CalendarCheck, desc: t("guide.agents.cal.desc") },
  { name: "Harper", role: t("guide.agents.harper.role"), icon: Users, desc: t("guide.agents.harper.desc") },
  { name: "DataBot", role: t("guide.agents.databot.role"), icon: BarChart3, desc: t("guide.agents.databot.desc") },
  { name: "ShopBot", role: t("guide.agents.shopbot.role"), icon: Package, desc: t("guide.agents.shopbot.desc") },
  { name: "Reno", role: t("guide.agents.reno.role"), icon: Building2, desc: t("guide.agents.reno.desc") },
];

const features = [
  { icon: MessageSquare, titleKey: "aiChat", descKey: "aiChatDesc" },
  { icon: Settings, titleKey: "smartIntegrations", descKey: "smartIntegrationsDesc" },
  { icon: Upload, titleKey: "fileSupport", descKey: "fileSupportDesc" },
  { icon: Globe, titleKey: "multilingual", descKey: "multilingualDesc" },
  { icon: Smartphone, titleKey: "mobileReady", descKey: "mobileReadyDesc" },
  { icon: Shield, titleKey: "security", descKey: "securityDesc" },
];

const getAgentTutorials = (t: (key: string) => string) => [
  {
    name: "Ava",
    slug: "customer-support-agent",
    role: t("guide.agents.ava.tutorialRole"),
    icon: Headphones,
    color: "from-blue-400 to-blue-600",
    capabilities: [t("guide.agents.ava.cap1"), t("guide.agents.ava.cap2"), t("guide.agents.ava.cap3"), t("guide.agents.ava.cap4"), t("guide.agents.ava.cap5")],
    examplePrompts: [t("guide.agents.ava.prompt1"), t("guide.agents.ava.prompt2"), t("guide.agents.ava.prompt3"), t("guide.agents.ava.prompt4")],
    integrationTips: [t("guide.agents.ava.tip1"), t("guide.agents.ava.tip2"), t("guide.agents.ava.tip3")],
  },
  {
    name: "Rex",
    slug: "sales-development-rep",
    role: t("guide.agents.rex.tutorialRole"),
    icon: TrendingUp,
    color: "from-violet-400 to-purple-600",
    capabilities: [t("guide.agents.rex.cap1"), t("guide.agents.rex.cap2"), t("guide.agents.rex.cap3"), t("guide.agents.rex.cap4"), t("guide.agents.rex.cap5")],
    examplePrompts: [t("guide.agents.rex.prompt1"), t("guide.agents.rex.prompt2"), t("guide.agents.rex.prompt3"), t("guide.agents.rex.prompt4")],
    integrationTips: [t("guide.agents.rex.tip1"), t("guide.agents.rex.tip2"), t("guide.agents.rex.tip3")],
  },
  {
    name: "Maya",
    slug: "social-media-manager",
    role: t("guide.agents.maya.tutorialRole"),
    icon: Share2,
    color: "from-fuchsia-400 to-pink-600",
    capabilities: [t("guide.agents.maya.cap1"), t("guide.agents.maya.cap2"), t("guide.agents.maya.cap3"), t("guide.agents.maya.cap4"), t("guide.agents.maya.cap5")],
    examplePrompts: [t("guide.agents.maya.prompt1"), t("guide.agents.maya.prompt2"), t("guide.agents.maya.prompt3"), t("guide.agents.maya.prompt4")],
    integrationTips: [t("guide.agents.maya.tip1"), t("guide.agents.maya.tip2"), t("guide.agents.maya.tip3")],
  },
  {
    name: "Finn",
    slug: "bookkeeping-assistant",
    role: t("guide.agents.finn.tutorialRole"),
    icon: Calculator,
    color: "from-cyan-400 to-blue-500",
    capabilities: [t("guide.agents.finn.cap1"), t("guide.agents.finn.cap2"), t("guide.agents.finn.cap3"), t("guide.agents.finn.cap4"), t("guide.agents.finn.cap5")],
    examplePrompts: [t("guide.agents.finn.prompt1"), t("guide.agents.finn.prompt2"), t("guide.agents.finn.prompt3"), t("guide.agents.finn.prompt4")],
    integrationTips: [t("guide.agents.finn.tip1"), t("guide.agents.finn.tip2"), t("guide.agents.finn.tip3")],
  },
  {
    name: "Cal",
    slug: "appointment-scheduling-agent",
    role: t("guide.agents.cal.tutorialRole"),
    icon: CalendarCheck,
    color: "from-indigo-400 to-violet-500",
    capabilities: [t("guide.agents.cal.cap1"), t("guide.agents.cal.cap2"), t("guide.agents.cal.cap3"), t("guide.agents.cal.cap4"), t("guide.agents.cal.cap5")],
    examplePrompts: [t("guide.agents.cal.prompt1"), t("guide.agents.cal.prompt2"), t("guide.agents.cal.prompt3"), t("guide.agents.cal.prompt4")],
    integrationTips: [t("guide.agents.cal.tip1"), t("guide.agents.cal.tip2"), t("guide.agents.cal.tip3")],
  },
  {
    name: "Harper",
    slug: "hr-recruiting-assistant",
    role: t("guide.agents.harper.tutorialRole"),
    icon: Users,
    color: "from-purple-400 to-fuchsia-500",
    capabilities: [t("guide.agents.harper.cap1"), t("guide.agents.harper.cap2"), t("guide.agents.harper.cap3"), t("guide.agents.harper.cap4"), t("guide.agents.harper.cap5")],
    examplePrompts: [t("guide.agents.harper.prompt1"), t("guide.agents.harper.prompt2"), t("guide.agents.harper.prompt3"), t("guide.agents.harper.prompt4")],
    integrationTips: [t("guide.agents.harper.tip1"), t("guide.agents.harper.tip2"), t("guide.agents.harper.tip3")],
  },
  {
    name: "DataBot",
    slug: "data-analyst-agent",
    role: t("guide.agents.databot.tutorialRole"),
    icon: BarChart3,
    color: "from-emerald-400 to-teal-600",
    capabilities: [t("guide.agents.databot.cap1"), t("guide.agents.databot.cap2"), t("guide.agents.databot.cap3"), t("guide.agents.databot.cap4"), t("guide.agents.databot.cap5")],
    examplePrompts: [t("guide.agents.databot.prompt1"), t("guide.agents.databot.prompt2"), t("guide.agents.databot.prompt3"), t("guide.agents.databot.prompt4")],
    integrationTips: [t("guide.agents.databot.tip1"), t("guide.agents.databot.tip2"), t("guide.agents.databot.tip3")],
  },
  {
    name: "ShopBot",
    slug: "ecommerce-operations-agent",
    role: t("guide.agents.shopbot.tutorialRole"),
    icon: Package,
    color: "from-amber-400 to-orange-500",
    capabilities: [t("guide.agents.shopbot.cap1"), t("guide.agents.shopbot.cap2"), t("guide.agents.shopbot.cap3"), t("guide.agents.shopbot.cap4"), t("guide.agents.shopbot.cap5")],
    examplePrompts: [t("guide.agents.shopbot.prompt1"), t("guide.agents.shopbot.prompt2"), t("guide.agents.shopbot.prompt3"), t("guide.agents.shopbot.prompt4")],
    integrationTips: [t("guide.agents.shopbot.tip1"), t("guide.agents.shopbot.tip2"), t("guide.agents.shopbot.tip3")],
  },
  {
    name: "Reno",
    slug: "real-estate-property-agent",
    role: t("guide.agents.reno.tutorialRole"),
    icon: Building2,
    color: "from-rose-400 to-red-500",
    capabilities: [t("guide.agents.reno.cap1"), t("guide.agents.reno.cap2"), t("guide.agents.reno.cap3"), t("guide.agents.reno.cap4"), t("guide.agents.reno.cap5")],
    examplePrompts: [t("guide.agents.reno.prompt1"), t("guide.agents.reno.prompt2"), t("guide.agents.reno.prompt3"), t("guide.agents.reno.prompt4")],
    integrationTips: [t("guide.agents.reno.tip1"), t("guide.agents.reno.tip2"), t("guide.agents.reno.tip3")],
  },
];

const gettingStartedChecklist = [
  { labelKey: "createAccount", done: true },
  { labelKey: "browseAgents", done: false, href: "/workers" },
  { labelKey: "hireFirst", done: false, href: "/workers" },
  { labelKey: "startChat", done: false, href: "/chat" },
  { labelKey: "connectIntegrations", done: false, href: "/settings" },
  { labelKey: "reviewDashboard", done: false, href: "/dashboard" },
];

const advancedFeatures = [
  { icon: Layers, titleKey: "multiAgent", descKey: "multiAgentDesc" },
  { icon: Terminal, titleKey: "customPrompts", descKey: "customPromptsDesc" },
  { icon: Puzzle, titleKey: "apiWebhook", descKey: "apiWebhookDesc" },
  { icon: Target, titleKey: "benchmarks", descKey: "benchmarksDesc" },
  { icon: FileText, titleKey: "templates", descKey: "templatesDesc" },
  { icon: Shield, titleKey: "accessControls", descKey: "accessControlsDesc" },
];

function AgentTutorialCard({ tutorial, index }: { tutorial: ReturnType<typeof getAgentTutorials>[0]; index: number }) {
  const { t } = useTranslation("pages");
  const [expanded, setExpanded] = useState(false);
  const Icon = tutorial.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Card
        className={`bg-card border-border/50 overflow-hidden transition-all duration-300 ${expanded ? "border-blue-500/30" : "hover:border-blue-500/20"}`}
        data-testid={`tutorial-agent-${tutorial.name.toLowerCase()}`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left"
          data-testid={`button-expand-${tutorial.name.toLowerCase()}`}
        >
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tutorial.color} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground text-sm">{tutorial.name}</div>
            <div className="text-xs text-muted-foreground">{tutorial.role}</div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-400" /> {t("guide.agentTutorials.capabilities")}
                  </h4>
                  <ul className="space-y-1.5">
                    {tutorial.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-violet-400" /> {t("guide.agentTutorials.examplePrompts")}
                  </h4>
                  <div className="space-y-1.5">
                    {tutorial.examplePrompts.map((prompt, i) => (
                      <div key={i} className="text-xs text-muted-foreground bg-background/50 rounded-lg px-3 py-2 border border-border/20 italic">
                        "{prompt}"
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Puzzle className="w-3.5 h-3.5 text-amber-400" /> {t("guide.agentTutorials.integrationTips")}
                  </h4>
                  <ul className="space-y-1.5">
                    {tutorial.integrationTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Lightbulb className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link href={`/workers/${tutorial.slug}`}>
                  <Button size="sm" variant="secondary" className="text-xs w-full mt-2" data-testid={`button-view-${tutorial.name.toLowerCase()}`}>
                    {t("guide.agentTutorials.viewFullProfile")} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function LoggedInGuide() {
  const { t } = useTranslation("pages");
  const tips = t("guide.tipsTricks.tips", { returnObjects: true }) as Array<{ tip: string; detail: string }>;
  return (
    <div className="pt-16 overflow-x-hidden">
      <section className="py-12 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-100/50 to-transparent" />
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20" data-testid="badge-guide">
              <BookOpen className="w-3 h-3 mr-1" /> {t("guide.badgeLoggedIn")}
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-guide-title">
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                {t("guide.titleLoggedIn")}
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              {t("guide.subtitleLoggedIn")}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-10 sm:py-16 bg-card/30" data-testid="section-getting-started">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="mb-8" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-getting-started">
              {t("guide.gettingStarted.title")}
            </h2>
            <p className="text-muted-foreground text-sm">{t("guide.gettingStarted.subtitle")}</p>
          </motion.div>

          <div className="space-y-3">
            {gettingStartedChecklist.map((item, i) => (
              <motion.div
                key={item.labelKey}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
              >
                <Card className={`p-4 flex items-center gap-3 ${item.done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border/50 hover:border-blue-500/20"} transition-colors`} data-testid={`checklist-item-${i}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-emerald-500/20" : "bg-border/30"}`}>
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm flex-1 ${item.done ? "text-emerald-400 line-through" : "text-foreground"}`}>
                    {t(`guide.gettingStarted.items.${item.labelKey}`)}
                  </span>
                  {!item.done && item.href && (
                    <Link href={item.href}>
                      <Button size="sm" variant="ghost" className="text-xs h-7" data-testid={`checklist-action-${i}`}>
                        {t("guide.gettingStarted.go")} <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-interactive-demo">
              {t("guide.interactiveDemo.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("guide.interactiveDemo.subtitle")}
            </p>
          </motion.div>
          <PlatformGuide variant="full" />
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-card/30" data-testid="section-agent-tutorials">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-agent-tutorials">
              {t("guide.agentTutorials.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("guide.agentTutorials.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {getAgentTutorials(t).map((tutorial, i) => (
              <AgentTutorialCard key={tutorial.name} tutorial={tutorial} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20" data-testid="section-advanced-features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-advanced-features">
              {t("guide.advancedFeatures.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("guide.advancedFeatures.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {advancedFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.titleKey}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="p-5 bg-card border-border/50 h-full hover:border-blue-500/30 transition-colors" data-testid={`advanced-feature-${i}`}>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{t(`guide.advancedFeatures.${feature.titleKey}`)}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`guide.advancedFeatures.${feature.descKey}`)}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-card/30" data-testid="section-tips">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-tips-tricks">
              {t("guide.tipsTricks.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("guide.tipsTricks.subtitle")}
            </p>
          </motion.div>

          <div className="space-y-3">
            {tips.map((item, i) => (
              <motion.div
                key={item.tip}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <Card className="p-4 bg-card border-border/50" data-testid={`tip-${i}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">{item.tip}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-features">
              {t("guide.features.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("guide.features.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.titleKey}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="p-5 bg-card border-border/50 h-full hover:border-blue-500/30 transition-colors" data-testid={`guide-feature-${i}`}>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{t(`guide.features.${feature.titleKey}`)}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`guide.features.${feature.descKey}`)}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-card/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4" data-testid="text-guide-cta">
              {t("guide.ctaTitle")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-xl mx-auto">
              {t("guide.ctaSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/chat">
                <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 px-8" data-testid="guide-cta-chat">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t("guide.startChatting")}
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="px-8 border-border/30" data-testid="guide-cta-dashboard">
                  {t("guide.goToDashboard")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default function GuidePage() {
  const { t } = useTranslation("pages");
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <motion.div
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (user) {
    return <LoggedInGuide />;
  }

  return (
    <div className="pt-16 overflow-x-hidden">
      <section className="py-12 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-100/50 to-transparent" />
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20" data-testid="badge-guide">
              <Bot className="w-3 h-3 mr-1" /> {t("guide.badgePublic")}
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-guide-title">
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                {t("guide.titlePublic")}
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              {t("guide.subtitlePublic")}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-interactive-demo">
              {t("guide.interactiveDemo.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("guide.interactiveDemo.subtitle")}
            </p>
          </motion.div>
          <PlatformGuide variant="full" />
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-meet-agents">
              {t("guide.meetAgents")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("guide.meetAgentsDesc")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getAgentList(t).map((agent, i) => {
              const Icon = agent.icon;
              return (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Card className="p-4 bg-card border-border/50 flex items-start gap-3 hover:border-blue-500/30 transition-colors" data-testid={`guide-agent-${agent.name.toLowerCase()}`}>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{agent.name}</div>
                      <div className="text-xs text-muted-foreground mb-1">{agent.role}</div>
                      <div className="text-xs text-muted-foreground/70">{agent.desc}</div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-features">
              {t("guide.features.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("guide.features.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.titleKey}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="p-5 bg-card border-border/50 h-full hover:border-blue-500/30 transition-colors" data-testid={`guide-feature-${i}`}>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{t(`guide.features.${feature.titleKey}`)}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`guide.features.${feature.descKey}`)}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-card/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4" data-testid="text-guide-cta">
              {t("guide.ctaTitle")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-xl mx-auto">
              {t("guide.ctaSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/workers">
                <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 px-8" data-testid="guide-cta-workers">
                  {t("guide.viewWorkers")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="px-8 border-border/30" data-testid="guide-cta-dashboard">
                  {t("guide.goToDashboard")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
