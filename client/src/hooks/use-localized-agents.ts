import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { agents as agentsData, categories as categoriesData, type Agent } from "@/data/agents";

export function useLocalizedAgents() {
  const { t } = useTranslation("agents");

  const localizedAgents = useMemo((): Agent[] => {
    return agentsData.map((agent) => {
      const metricsKeys: Record<string, string> = {
        "customer-support": "avgResponseTime,resolutionRate,satisfaction,languages",
        "sales-sdr": "leadsMonth,emailOpenRate,meetingBookedRate,languages",
        "social-media": "postsWeek,engagementRate,responseTime,languages",
        "bookkeeping": "accuracyRate,processingTime,reportsMonth,languages",
        "scheduling": "noShowReduction,bookingSpeed,reminderRate,languages",
        "hr-recruiting": "screeningSpeed,matchAccuracy,timeToShortlist,languages",
        "data-analyst": "reportsDay,dataSources,accuracy,languages",
        "ecommerce-ops": "listingUpdates,reviewResponse,priceChecks,languages",
        "real-estate": "listingsScanned,scamDetection,marketCoverage,languages",
      };

      const metricKeyList = (metricsKeys[agent.id] || "").split(",");
      const localizedMetrics = metricKeyList.map((key) => ({
        label: t(`${agent.id}.metrics.${key}.label`, { defaultValue: "" }),
        value: t(`${agent.id}.metrics.${key}.value`, { defaultValue: "" }),
      })).filter(m => m.label);

      const catKey = Object.entries(
        t("categories", { returnObjects: true }) as Record<string, string>
      ).find(([, v]) => v === agent.category)?.[0];

      return {
        ...agent,
        name: t(`${agent.id}.name`, { defaultValue: agent.name }),
        role: t(`${agent.id}.role`, { defaultValue: agent.role }),
        shortDescription: t(`${agent.id}.shortDescription`, { defaultValue: agent.shortDescription }),
        fullDescription: t(`${agent.id}.fullDescription`, { defaultValue: agent.fullDescription }),
        category: catKey ? t(`categories.${catKey}`) : agent.category,
        tag: agent.tag ? t(`${agent.id}.tag`, { defaultValue: agent.tag }) : undefined,
        skills: t(`${agent.id}.skills`, { returnObjects: true, defaultValue: agent.skills }) as string[],
        useCases: t(`${agent.id}.useCases`, { returnObjects: true, defaultValue: agent.useCases }) as string[],
        metrics: localizedMetrics.length > 0 ? localizedMetrics : agent.metrics,
      };
    });
  }, [t]);

  return localizedAgents;
}

export function useLocalizedCategories(): string[] {
  const { t } = useTranslation("agents");
  return useMemo(() => {
    const cats = t("categories", { returnObjects: true }) as Record<string, string>;
    return Object.values(cats);
  }, [t]);
}
