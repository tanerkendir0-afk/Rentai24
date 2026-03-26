import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Scale } from "lucide-react";
import SectionCTA from "@/components/section-cta";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Terms() {
  const { t } = useTranslation("pages");
  const sections = [
    "agreement",
    "description",
    "userAccounts",
    "billing",
    "acceptableUse",
    "aiLimitations",
    "intellectualProperty",
    "serviceAvailability",
    "liability",
    "termination",
    "changes",
    "contact",
  ] as const;

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
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto mb-6">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-terms-title">
              {t("terms.title")}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t("terms.lastUpdated")}
            </p>
          </motion.div>

          <motion.div {...fadeUp}>
            <Card className="p-8 sm:p-10 bg-card border-border/50 prose prose-invert max-w-none">
              <div className="space-y-8 text-muted-foreground leading-relaxed">
                {sections.map((section) => {
                  const title = t(`terms.sections.${section}.title`);
                  const content = t(`terms.sections.${section}.content`, { defaultValue: "" });
                  const intro = t(`terms.sections.${section}.intro`, { defaultValue: "" });
                  const rawItems = t(`terms.sections.${section}.items`, { returnObjects: true, defaultValue: [] });
                  const items = Array.isArray(rawItems) ? (rawItems as string[]) : [];

                  return (
                    <div key={section}>
                      <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
                      {content && section !== "contact" && <p>{content}</p>}
                      {intro && <p className="mb-3">{intro}</p>}
                      {items.length > 0 && (
                        <ul className="list-disc pl-6 space-y-2">
                          {items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {section === "contact" && (
                        <p>
                          {content}{" "}
                          <a href="mailto:hello@rentai24.com" className="text-blue-400 hover:underline">hello@rentai24.com</a>.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <SectionCTA />
    </div>
  );
}
