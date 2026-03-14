import { motion } from "framer-motion";
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
} from "lucide-react";
import PlatformGuide from "@/components/platform-guide";

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
  { icon: MessageSquare, title: "AI Chat", desc: "Natural conversations with your agents. They understand context and remember history." },
  { icon: Settings, title: "Smart Integrations", desc: "Connect Gmail, WhatsApp, social media, shipping providers, and more." },
  { icon: Upload, title: "File & Image Support", desc: "Upload documents, images, and data directly in chat for your agents to process." },
  { icon: Globe, title: "Multilingual", desc: "Agents speak multiple languages and handle global customers effortlessly." },
  { icon: Smartphone, title: "Mobile Ready", desc: "Install as a PWA for quick access from any device, anywhere." },
  { icon: Shield, title: "Enterprise Security", desc: "AES-256 encryption, AI guardrails, and complete data ownership." },
];

export default function GuidePage() {
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
              <Bot className="w-3 h-3 mr-1" /> Platform Guide
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-guide-title">
              How to Use{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                RentAI 24
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              A complete walkthrough of your AI staffing platform. Learn how to hire, chat with, and manage your AI workforce.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-interactive-demo">
              Interactive Demo
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Watch how the platform works — hover to pause, click steps to navigate
            </p>
          </motion.div>
          <PlatformGuide variant="full" />
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-meet-agents">
              Meet Your AI Agents
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              9 specialized agents, each trained for specific business roles
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
              Platform Features
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Everything you need to manage your AI workforce
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="p-5 bg-card border-border/50 h-full hover:border-blue-500/30 transition-colors" data-testid={`guide-feature-${i}`}>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
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
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-xl mx-auto">
              Hire your first AI worker and see the difference in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/workers">
                <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 px-8" data-testid="guide-cta-workers">
                  Browse AI Workers
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="px-8 border-border/30" data-testid="guide-cta-dashboard">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
