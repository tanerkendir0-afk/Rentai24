import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Bot, Target, Eye, Shield, TrendingUp, Users, Globe, Zap } from "lucide-react";
import SectionCTA from "@/components/section-cta";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const valueIcons = [Zap, Users, TrendingUp, Shield];
const valueKeys = ["accessibleAI", "humanAI", "alwaysImproving", "trustTransparency"] as const;
const statKeys = ["founded", "teamMembers", "countries", "deployed"] as const;

export default function About() {
  const { t } = useTranslation("pages");

  return (
    <div className="pt-16">
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-100/50 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-about-title">
              {t("about.title")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.subtitle")}
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <Card className="p-8 sm:p-10 bg-card border-border/50 mb-16">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t("about.storyTitle")}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {t("about.storyP1")}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("about.storyP2")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t("about.missionTitle")}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("about.missionDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t("about.visionTitle")}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("about.visionDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeUp}>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-16">
              {statKeys.map((key) => (
                <Card key={key} className="p-6 bg-card border-border/50 text-center">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-1">
                    {t(`about.stats.${key}Val`)}
                  </div>
                  <p className="text-sm text-muted-foreground">{t(`about.stats.${key}`)}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp}>
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center" data-testid="text-values-title">
              {t("about.valuesTitle")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {valueKeys.map((key, i) => {
                const Icon = valueIcons[i];
                return (
                  <Card key={key} className="p-6 bg-card border-border/50">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{t(`about.values.${key}`)}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{t(`about.values.${key}Desc`)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="mt-16" {...fadeUp}>
            <Card className="p-8 bg-card border-border/50">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  DR
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{t("about.founder.name")}</h3>
                  <p className="text-sm text-blue-400 mb-2">{t("about.founder.role")}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("about.founder.bio")}
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
