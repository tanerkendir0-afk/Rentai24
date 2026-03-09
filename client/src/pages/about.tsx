import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Bot, Target, Eye, Shield, TrendingUp, Users, Globe, Zap } from "lucide-react";
import SectionCTA from "@/components/section-cta";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const values = [
  {
    icon: Zap,
    title: "Accessible AI",
    desc: "Enterprise-grade AI at startup-friendly prices. We believe every business, from solopreneurs to enterprises, deserves access to intelligent automation.",
  },
  {
    icon: Users,
    title: "Human + AI",
    desc: "We augment teams, not replace them. Our AI workers handle the repetitive work so your human team can focus on what they do best.",
  },
  {
    icon: TrendingUp,
    title: "Always Improving",
    desc: "Our agents learn and get better over time. Continuous optimization ensures your AI workforce delivers increasing value every month.",
  },
  {
    icon: Shield,
    title: "Trust & Transparency",
    desc: "Your data stays yours. Always. We're SOC 2 compliant, GDPR compliant, and fully transparent about how our AI works.",
  },
];

const stats = [
  { label: "Founded", value: "2023" },
  { label: "Team Members", value: "45+" },
  { label: "Countries Served", value: "30+" },
  { label: "AI Workers Deployed", value: "2,500+" },
];

export default function About() {
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
              We're Building the{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Future of Work
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              RentAI 24 is the world's first AI staffing agency. We believe every business deserves access to intelligent, tireless, and affordable team members.
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <Card className="p-8 sm:p-10 bg-card border-border/50 mb-16">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Our Story</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    RentAI 24 was born from a simple observation: businesses of all sizes struggle with hiring, training, and retaining talent for roles that AI can handle better, faster, and more affordably.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Just like traditional staffing agencies place qualified human workers at companies, we place pre-trained AI agents. Our mission is to make AI workforce accessible to every business — from solo founders running a side project to enterprises managing thousands of customers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Our Mission</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      To democratize access to AI workforce, enabling businesses of all sizes to operate more efficiently, serve customers better, and scale without traditional hiring constraints.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Our Vision</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A world where every business has an AI-augmented team, where humans and AI work together to achieve more than either could alone.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeUp}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {stats.map((stat) => (
                <Card key={stat.label} className="p-6 bg-card border-border/50 text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp}>
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center" data-testid="text-values-title">
              Our Values
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {values.map((value) => (
                <Card key={value.title} className="p-6 bg-card border-border/50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
                      <value.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{value.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div className="mt-16" {...fadeUp}>
            <Card className="p-8 bg-card border-border/50">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  AK
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Alex Kim</h3>
                  <p className="text-sm text-blue-400 mb-2">Founder & CEO</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Former Head of AI at a Fortune 500 company, Alex founded RentAI 24 with the vision of making enterprise AI accessible to every business. With 15+ years in AI and machine learning, he's passionate about building tools that augment human potential.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
