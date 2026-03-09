import { motion } from "framer-motion";
import { Phone, UserCheck, Settings, Plug, TestTube, Rocket, TrendingUp } from "lucide-react";
import SectionCTA from "@/components/section-cta";

const steps = [
  {
    icon: Phone,
    title: "Free Consultation",
    desc: "Book a 15-min call. We analyze your workflow and identify which roles AI can fill.",
    detail: "Our team walks through your current processes, tools, and pain points to determine where AI workers can deliver the most impact.",
  },
  {
    icon: UserCheck,
    title: "AI Worker Matching",
    desc: "We recommend the best AI agents based on your industry, tools, and goals.",
    detail: "From our catalog of 150+ specialized agents, we match you with workers that fit your exact needs, tech stack, and business objectives.",
  },
  {
    icon: Settings,
    title: "Customization & Fine-Tuning",
    desc: "We tailor the agent to your brand voice, processes, and specific requirements.",
    detail: "Your AI worker learns your products, policies, and communication style. We fine-tune responses to match your brand perfectly.",
  },
  {
    icon: Plug,
    title: "Integration",
    desc: "We connect to your existing stack: CRM, helpdesk, email, messaging, calendars, and more.",
    detail: "Our team handles the entire technical integration. We support 50+ tools including HubSpot, Zendesk, Slack, WhatsApp, and more.",
  },
  {
    icon: TestTube,
    title: "Testing & QA",
    desc: "48-hour test period where we monitor performance and make adjustments.",
    detail: "We run comprehensive tests with real scenarios, monitor response quality, and fine-tune performance before going live.",
  },
  {
    icon: Rocket,
    title: "Go Live",
    desc: "Your AI worker starts handling real tasks. You monitor via your dashboard.",
    detail: "Once testing is complete, your AI worker goes live. You get full visibility into performance metrics and conversation logs.",
  },
  {
    icon: TrendingUp,
    title: "Continuous Improvement",
    desc: "We track performance, gather feedback, and optimize regularly.",
    detail: "Our team monitors your AI worker's performance weekly, implements improvements, and ensures it gets better over time.",
  },
];

export default function HowItWorks() {
  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-how-title">
              How It{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Works
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From signup to deployment in as little as 24 hours
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-8 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-violet-500 hidden sm:block" />

            <div className="space-y-12 sm:space-y-16">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  className={`relative flex flex-col sm:flex-row items-start gap-6 sm:gap-12 ${
                    i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  }`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  data-testid={`step-${i + 1}`}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? "sm:text-right" : "sm:text-left"}`}>
                    <div className={`inline-flex items-center gap-2 mb-3 ${i % 2 === 0 ? "sm:flex-row-reverse" : ""}`}>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">{step.desc}</p>
                    <p className="text-sm text-muted-foreground/70 leading-relaxed">{step.detail}</p>
                  </div>

                  <div className="relative z-10 shrink-0 hidden sm:flex">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center ring-4 ring-background">
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 hidden sm:block" />
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            className="text-center mt-20 p-8 rounded-md bg-card/50 border border-border/50"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-lg text-foreground font-semibold mb-2">
              Average time from signup to deployment:
            </p>
            <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-4">
              24 hours
            </p>
          </motion.div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
