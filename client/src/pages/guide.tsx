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

const agentList = [
  { name: "Ava", role: "Customer Support", icon: Headphones, desc: "Live chat, email, complaints, order tracking" },
  { name: "Rex", role: "Sales SDR", icon: TrendingUp, desc: "Lead generation, cold outreach, proposals" },
  { name: "Maya", role: "Social Media", icon: Share2, desc: "Content planning, posting, engagement" },
  { name: "Finn", role: "Bookkeeping", icon: Calculator, desc: "Invoices, expenses, financial reports" },
  { name: "Cal", role: "Scheduling", icon: CalendarCheck, desc: "Bookings, reminders, calendar management" },
  { name: "Harper", role: "HR & Recruiting", icon: Users, desc: "Resume screening, interview scheduling" },
  { name: "DataBot", role: "Data Analyst", icon: BarChart3, desc: "Reports, dashboards, KPI tracking" },
  { name: "ShopBot", role: "E-Commerce", icon: Package, desc: "Product listings, inventory, reviews" },
  { name: "Reno", role: "Real Estate", icon: Building2, desc: "Property search, lease review, market reports" },
];

const features = [
  { icon: MessageSquare, titleKey: "aiChat", descKey: "aiChatDesc" },
  { icon: Settings, titleKey: "smartIntegrations", descKey: "smartIntegrationsDesc" },
  { icon: Upload, titleKey: "fileSupport", descKey: "fileSupportDesc" },
  { icon: Globe, titleKey: "multilingual", descKey: "multilingualDesc" },
  { icon: Smartphone, titleKey: "mobileReady", descKey: "mobileReadyDesc" },
  { icon: Shield, titleKey: "security", descKey: "securityDesc" },
];

const agentTutorials = [
  {
    name: "Ava",
    slug: "customer-support-agent",
    role: "Customer Support Agent",
    icon: Headphones,
    color: "from-blue-400 to-blue-600",
    capabilities: [
      "Handle live chat conversations with empathy and speed",
      "Respond to customer emails automatically",
      "Track and resolve complaint tickets",
      "Process refunds and returns",
      "Manage FAQ knowledge base",
    ],
    examplePrompts: [
      "Handle all incoming support tickets for today",
      "Draft a response to this customer complaint about a late delivery",
      "Create a weekly support performance report",
      "Set up auto-responses for common questions about our return policy",
    ],
    integrationTips: [
      "Connect Zendesk or Intercom for seamless ticket management",
      "Link WhatsApp Business for instant customer messaging",
      "Integrate with your order management system for real-time tracking",
    ],
  },
  {
    name: "Rex",
    slug: "sales-development-rep",
    role: "Sales Development Rep",
    icon: TrendingUp,
    color: "from-violet-400 to-purple-600",
    capabilities: [
      "Research and qualify leads from multiple sources",
      "Craft personalized cold outreach emails",
      "Follow up with prospects automatically",
      "Update CRM records with conversation notes",
      "Schedule meetings with qualified leads",
    ],
    examplePrompts: [
      "Find 50 tech CTOs in the Bay Area who might need our product",
      "Draft a cold email sequence for our new SaaS launch",
      "Follow up with all leads who opened our last email but didn't reply",
      "Generate a pipeline report for this quarter",
    ],
    integrationTips: [
      "Connect HubSpot or Salesforce for automatic CRM updates",
      "Link Gmail for email sending and tracking",
      "Integrate Calendly for seamless meeting scheduling",
    ],
  },
  {
    name: "Maya",
    slug: "social-media-manager",
    role: "Social Media Manager",
    icon: Share2,
    color: "from-fuchsia-400 to-pink-600",
    capabilities: [
      "Plan and schedule content across all platforms",
      "Write engaging posts tailored to each network",
      "Monitor and respond to comments and DMs",
      "Research trending hashtags and topics",
      "Generate analytics and engagement reports",
    ],
    examplePrompts: [
      "Create a content calendar for next week across Instagram and Twitter",
      "Write 5 LinkedIn posts about our company culture",
      "Respond to all unanswered comments from the past 24 hours",
      "Analyze our best-performing posts this month and suggest improvements",
    ],
    integrationTips: [
      "Connect Buffer or Hootsuite for multi-platform scheduling",
      "Link your brand assets folder for consistent visuals",
      "Integrate analytics tools for detailed performance tracking",
    ],
  },
  {
    name: "Finn",
    slug: "bookkeeping-assistant",
    role: "Bookkeeping Assistant",
    icon: Calculator,
    color: "from-cyan-400 to-blue-500",
    capabilities: [
      "Process and categorize invoices automatically",
      "Track expenses and flag anomalies",
      "Generate financial statements and reports",
      "Send tax deadline reminders",
      "Reconcile accounts and balances",
    ],
    examplePrompts: [
      "Process all pending invoices from this week",
      "Generate a profit and loss statement for Q3",
      "Categorize last month's credit card expenses",
      "Set up reminders for upcoming tax deadlines",
    ],
    integrationTips: [
      "Connect QuickBooks or Xero for automatic sync",
      "Link Stripe or PayPal for payment tracking",
      "Integrate receipt scanning for paperless expense management",
    ],
  },
  {
    name: "Cal",
    slug: "appointment-scheduling-agent",
    role: "Scheduling Agent",
    icon: CalendarCheck,
    color: "from-indigo-400 to-violet-500",
    capabilities: [
      "Manage online bookings and appointments",
      "Send automated reminders via email and SMS",
      "Handle rescheduling and cancellations",
      "Follow up with no-shows",
      "Manage waitlists and availability",
    ],
    examplePrompts: [
      "Set up recurring weekly meetings with my team",
      "Send reminders for all appointments tomorrow",
      "Reschedule the 3pm meeting to next Tuesday",
      "Show me my availability for next week",
    ],
    integrationTips: [
      "Connect Google Calendar or Outlook for real-time sync",
      "Link Calendly for external booking pages",
      "Integrate SMS providers for text reminders",
    ],
  },
  {
    name: "Harper",
    slug: "hr-recruiting-assistant",
    role: "HR & Recruiting Assistant",
    icon: Users,
    color: "from-purple-400 to-fuchsia-500",
    capabilities: [
      "Screen resumes against your job requirements",
      "Shortlist top candidates automatically",
      "Schedule interviews with candidates",
      "Prepare onboarding documents",
      "Post jobs across multiple platforms",
    ],
    examplePrompts: [
      "Screen these 100 resumes for our Senior Developer position",
      "Schedule interviews with the top 5 candidates next week",
      "Draft an onboarding checklist for new engineering hires",
      "Post our open positions on LinkedIn and Indeed",
    ],
    integrationTips: [
      "Connect LinkedIn Recruiter for direct sourcing",
      "Link Greenhouse or Lever for ATS management",
      "Integrate BambooHR for employee onboarding workflows",
    ],
  },
  {
    name: "DataBot",
    slug: "data-analyst-agent",
    role: "Data Analyst Agent",
    icon: BarChart3,
    color: "from-emerald-400 to-teal-600",
    capabilities: [
      "Clean and normalize data from multiple sources",
      "Generate custom reports and dashboards",
      "Track KPIs and alert on anomalies",
      "Perform trend analysis and forecasting",
      "Create data visualizations",
    ],
    examplePrompts: [
      "Analyze our website traffic data for the past month",
      "Create a dashboard tracking our top 5 KPIs",
      "Compare this quarter's sales with last quarter",
      "Find patterns in our customer churn data",
    ],
    integrationTips: [
      "Connect Google Sheets or Excel for data import",
      "Link Tableau or Looker for advanced visualizations",
      "Integrate with your SQL databases for real-time queries",
    ],
  },
  {
    name: "ShopBot",
    slug: "ecommerce-operations-agent",
    role: "E-Commerce Operations",
    icon: Package,
    color: "from-amber-400 to-orange-500",
    capabilities: [
      "Optimize product listings and descriptions",
      "Monitor inventory levels and send alerts",
      "Track competitor prices in real-time",
      "Respond to product reviews",
      "Manage order tracking and updates",
    ],
    examplePrompts: [
      "Rewrite product descriptions for our top 20 products",
      "Alert me when any item drops below 10 units in stock",
      "Compare our prices with top 3 competitors",
      "Respond to all 1-2 star reviews from the past week",
    ],
    integrationTips: [
      "Connect Shopify or WooCommerce for store management",
      "Link Amazon Seller Central for marketplace operations",
      "Integrate shipping providers for real-time tracking",
    ],
  },
  {
    name: "Reno",
    slug: "real-estate-property-agent",
    role: "Real Estate Agent",
    icon: Building2,
    color: "from-rose-400 to-red-500",
    capabilities: [
      "Search and filter property listings",
      "Evaluate properties against your criteria",
      "Analyze neighborhoods and market trends",
      "Review lease agreements and contracts",
      "Calculate costs of living and ROI",
    ],
    examplePrompts: [
      "Find 2-bedroom apartments in Austin under $2000/month",
      "Analyze the rental market in downtown Chicago",
      "Review this lease agreement and flag potential issues",
      "Compare the cost of living between these 3 neighborhoods",
    ],
    integrationTips: [
      "Connect Zillow or Redfin for listing data",
      "Link Google Maps for neighborhood analysis",
      "Integrate with CRM for client management",
    ],
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

function AgentTutorialCard({ tutorial, index }: { tutorial: typeof agentTutorials[0]; index: number }) {
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
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
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
            {agentTutorials.map((tutorial, i) => (
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
                  key={feature.title}
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
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
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
            {agentList.map((agent, i) => {
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
