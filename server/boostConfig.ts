export interface BoostPlanConfig {
  maxParallelTasks: number;
  priceUsd: number;
  allowedAgents?: string[];
}

export const BOOST_CONFIG: Record<string, BoostPlanConfig> = {
  "boost-3": { maxParallelTasks: 3, priceUsd: 150 },
  "boost-7": { maxParallelTasks: 7, priceUsd: 300 },
  "boost-accounting": { maxParallelTasks: 3, priceUsd: 200, allowedAgents: ["bookkeeping"] },
  "boost-pro": { maxParallelTasks: 999999, priceUsd: 1750 },
};

export const BOOST_PLAN_IDS = Object.keys(BOOST_CONFIG);
