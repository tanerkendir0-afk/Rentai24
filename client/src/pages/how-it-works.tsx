import { motion } from "framer-motion";
import { Phone, UserCheck, Settings, Plug, TestTube, Rocket, TrendingUp } from "lucide-react";
import SectionCTA from "@/components/section-cta";
import { useTranslation } from "react-i18next";

const stepIcons = [Phone, UserCheck, Settings, Plug, TestTube, Rocket, TrendingUp];
const stepKeys = ["step1", "step2", "step3", "step4", "step5", "step6", "step7"] as const;

export default function HowItWorks() {
  const { t } = useTranslation("pages");

  return (
    <div className="pt-16">
      <section className="py-12 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-100/50 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-12 sm:mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-how-title">
              {t("howItWorks.title")}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-5 sm:left-8 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-violet-500" />

            <div className="space-y-8 sm:space-y-12 md:space-y-16">
              {stepKeys.map((key, i) => {
                const Icon = stepIcons[i];
                return (
                  <motion.div
                    key={i}
                    className={`relative flex items-start gap-4 sm:gap-6 md:gap-12 ${
                      i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                    }`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    data-testid={`step-${i + 1}`}
                  >
                    <div className="relative z-10 shrink-0 flex md:hidden">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center ring-2 ring-background">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>

                    <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                      <div className={`inline-flex items-center gap-2 mb-2 sm:mb-3 ${i % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                          {t("howItWorks.stepLabel", { num: i + 1 })}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3">{t(`howItWorks.steps.${key}.title`)}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-1 sm:mb-2">{t(`howItWorks.steps.${key}.desc`)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground/70 leading-relaxed">{t(`howItWorks.steps.${key}.detail`)}</p>
                    </div>

                    <div className="relative z-10 shrink-0 hidden md:flex">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center ring-4 ring-background">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.div
            className="text-center mt-12 sm:mt-20 p-6 sm:p-8 rounded-md bg-card/50 border border-border/50"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-base sm:text-lg text-foreground font-semibold mb-2">
              {t("howItWorks.avgTimeLabel")}
            </p>
            <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-4">
              {t("howItWorks.avgTimeValue")}
            </p>
          </motion.div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
