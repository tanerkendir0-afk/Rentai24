import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AGENT_NAMES: Record<string, string> = {
  "customer-support": "Ava",
  "sales-sdr": "Rex",
  "social-media": "Maya",
  "bookkeeping": "Finn",
  "scheduling": "Cal",
  "hr-recruiting": "Harper",
  "data-analyst": "DataBot",
  "ecommerce-ops": "ShopBot",
  "real-estate": "Reno",
};

export function AgentStatusBadge({ agentId }: { agentId: string }) {
  const { data: heartbeat } = useQuery({
    queryKey: ["/api/heartbeat"],
    queryFn: async () => {
      const res = await fetch("/api/heartbeat");
      if (!res.ok) return {};
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const status = heartbeat?.[agentId]?.status || "unknown";
  const responseTime = heartbeat?.[agentId]?.responseTimeMs;

  const statusConfig = {
    healthy: { color: "bg-green-500", label: "Online", dotClass: "animate-pulse" },
    degraded: { color: "bg-yellow-500", label: "Degraded", dotClass: "animate-pulse" },
    down: { color: "bg-red-500", label: "Offline", dotClass: "" },
    unknown: { color: "bg-slate-500", label: "Unknown", dotClass: "" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${config.color} ${config.dotClass}`} />
          <span className="text-xs text-slate-400">{config.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-slate-800 border-slate-700 text-white">
        <p className="font-medium">{AGENT_NAMES[agentId] || agentId}</p>
        <p className="text-xs text-slate-400">Status: {config.label}</p>
        {responseTime !== undefined && (
          <p className="text-xs text-slate-400">Response: {responseTime}ms</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function AgentStatusOverview() {
  const { data: heartbeat, isLoading } = useQuery({
    queryKey: ["/api/heartbeat"],
    queryFn: async () => {
      const res = await fetch("/api/heartbeat");
      if (!res.ok) return {};
      return res.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return null;

  const agents = heartbeat ? Object.entries(heartbeat) : [];
  const healthy = agents.filter(([_, s]: [string, any]) => s.status === "healthy").length;
  const total = agents.length;

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex -space-x-1">
        {agents.slice(0, 5).map(([id, status]: [string, any]) => (
          <div
            key={id}
            className={`w-3 h-3 rounded-full border-2 border-slate-800 ${
              status.status === "healthy" ? "bg-green-500" :
              status.status === "degraded" ? "bg-yellow-500" : "bg-red-500"
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-slate-400">
        {healthy}/{total} agents online
      </span>
    </div>
  );
}
