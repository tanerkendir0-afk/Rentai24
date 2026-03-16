import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { agentMetadata, categories as categoriesData, type Agent } from "@/data/agents";

export function useLocalizedAgents() {
  const { t } = useTranslation("agents");

  const localizedAgents = useMemo((): Agent[] => {
    return agentMetadata.map((meta) => {
      const metricsObj = t(`${meta.id}.metrics`, { returnObjects: true }) as Record<string, { label: string; value: string }>;
      const localizedMetrics = Object.values(metricsObj).filter(m => m && m.label);

      return {
        ...meta,
        name: t(`${meta.id}.name`),
        role: t(`${meta.id}.role`),
        shortDescription: t(`${meta.id}.shortDescription`),
        fullDescription: t(`${meta.id}.fullDescription`),
        priceLabel: t(`${meta.id}.priceLabel`),
        tag: t(`${meta.id}.tag`, { defaultValue: "" }) || undefined,
        responseTime: t(`${meta.id}.responseTime`, { defaultValue: "" }) || undefined,
        skills: t(`${meta.id}.skills`, { returnObjects: true }) as string[],
        useCases: t(`${meta.id}.useCases`, { returnObjects: true }) as string[],
        metrics: localizedMetrics,
      };
    });
  }, [t]);

  return localizedAgents;
}

export function useLocalizedCategories(): Array<{ key: string; label: string }> {
  const { t } = useTranslation("agents");
  return useMemo(() => {
    const cats = t("categories", { returnObjects: true }) as Record<string, string>;
    return categoriesData.map(cat => ({
      key: cat,
      label: cats[cat] || cat,
    }));
  }, [t]);
}

export interface LocalizedTestimonial {
  name: string;
  company: string;
  role: string;
  text: string;
  rating: number;
}

export function useLocalizedTestimonials(): LocalizedTestimonial[] {
  const { t } = useTranslation("agents");
  return useMemo(() => {
    const items = t("testimonials", { returnObjects: true }) as LocalizedTestimonial[];
    return Array.isArray(items) ? items : [];
  }, [t]);
}

export interface LocalizedFaqItem {
  question: string;
  answer: string;
}

export function useLocalizedFaqItems(): LocalizedFaqItem[] {
  const { t } = useTranslation("agents");
  return useMemo(() => {
    const items = t("faqItems", { returnObjects: true }) as LocalizedFaqItem[];
    return Array.isArray(items) ? items : [];
  }, [t]);
}

export interface LocalizedIndustry {
  name: string;
  icon: string;
}

export function useLocalizedIndustries(): LocalizedIndustry[] {
  const { t } = useTranslation("agents");
  return useMemo(() => {
    const items = t("industries", { returnObjects: true }) as LocalizedIndustry[];
    return Array.isArray(items) ? items : [];
  }, [t]);
}
