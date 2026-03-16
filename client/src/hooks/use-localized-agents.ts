import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { agents as agentsData, categories as categoriesData, type Agent } from "@/data/agents";

const CATEGORY_KEY_MAP: Record<string, string> = {
  "All": "All",
  "Customer Support": "Customer Support",
  "Sales": "Sales",
  "Marketing": "Marketing",
  "Finance": "Finance",
  "HR": "HR",
  "Operations": "Operations",
};

export function useLocalizedAgents() {
  const { t } = useTranslation("agents");

  const localizedAgents = useMemo((): Agent[] => {
    return agentsData.map((agent) => {
      const metricsObj = t(`${agent.id}.metrics`, { returnObjects: true, defaultValue: {} }) as Record<string, { label: string; value: string }>;
      const localizedMetrics = Object.values(metricsObj).filter(m => m && m.label);

      return {
        ...agent,
        name: t(`${agent.id}.name`, { defaultValue: agent.name }),
        role: t(`${agent.id}.role`, { defaultValue: agent.role }),
        shortDescription: t(`${agent.id}.shortDescription`, { defaultValue: agent.shortDescription }),
        fullDescription: t(`${agent.id}.fullDescription`, { defaultValue: agent.fullDescription }),
        tag: agent.tag ? t(`${agent.id}.tag`, { defaultValue: agent.tag }) : undefined,
        skills: t(`${agent.id}.skills`, { returnObjects: true, defaultValue: agent.skills }) as string[],
        useCases: t(`${agent.id}.useCases`, { returnObjects: true, defaultValue: agent.useCases }) as string[],
        metrics: localizedMetrics.length > 0 ? localizedMetrics : agent.metrics,
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
