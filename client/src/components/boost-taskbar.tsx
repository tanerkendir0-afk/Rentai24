import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import {
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  BarChart3,
  Package,
  Building2,
  BrainCircuit,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Zap,
  X,
  Monitor,
  Plus,
  Maximize2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

const agentIconMap: Record<string, { icon: LucideIcon; color: string; persona: string }> = {
  "customer-support": { icon: Headphones, color: "from-pink-500 to-rose-500", persona: "Ava" },
  "sales-sdr": { icon: TrendingUp, color: "from-blue-500 to-cyan-500", persona: "Rex" },
  "social-media": { icon: Share2, color: "from-violet-500 to-purple-500", persona: "Maya" },
  "bookkeeping": { icon: Calculator, color: "from-emerald-500 to-green-500", persona: "Finn" },
  "scheduling": { icon: CalendarCheck, color: "from-orange-500 to-amber-500", persona: "Cal" },
  "hr-recruiting": { icon: Users, color: "from-teal-500 to-cyan-500", persona: "Harper" },
  "data-analyst": { icon: BarChart3, color: "from-indigo-500 to-blue-500", persona: "DataBot" },
  "ecommerce-ops": { icon: Package, color: "from-amber-500 to-yellow-500", persona: "ShopBot" },
  "real-estate": { icon: Building2, color: "from-rose-500 to-red-500", persona: "Reno" },
  "manager": { icon: BrainCircuit, color: "from-amber-500 to-orange-500", persona: "Manager" },
};

export interface BoostTask {
  id: number;
  visibleId: string;
  agentType: string;
  title: string;
  boostStatus: string;
  createdAt: string;
}

interface BoostTaskBarProps {
  onTaskDelete?: (task: BoostTask) => void;
  selectedPanelIds?: string[];
  onTogglePanel?: (visibleId: string, agentType: string) => void;
  onBringToFront?: (visibleId: string, agentType: string) => void;
  maxPanels?: number;
  onNewChat?: () => void;
  canAddChat?: boolean;
}

export default function BoostTaskBar({ onTaskDelete, selectedPanelIds = [], onTogglePanel, onBringToFront, maxPanels = 3, onNewChat, canAddChat = true }: BoostTaskBarProps) {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const prevTasksRef = useRef<BoostTask[]>([]);

  const { data: boostTasks } = useQuery<{ active: BoostTask[]; all: BoostTask[] }>({
    queryKey: ["/api/boost/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/boost/tasks");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const activeTasks = boostTasks?.active || [];
  const allTasks = boostTasks?.all || [];
  const displayTasks = allTasks.slice(0, 20);

  useEffect(() => {
    if (prevTasksRef.current.length > 0 && allTasks.length > 0) {
      for (const task of allTasks) {
        const prevTask = prevTasksRef.current.find(t => t.id === task.id);
        if (prevTask && prevTask.boostStatus === "running" && task.boostStatus === "completed") {
          const agentInfo = agentIconMap[task.agentType];
          toast({
            title: `${t("boost.taskComplete")}`,
            description: `${agentInfo?.persona || task.agentType}: ${task.title?.slice(0, 50) || t("boost.conversation")}`,
          });
        }
      }
    }
    prevTasksRef.current = allTasks;
  }, [allTasks]);

  if (displayTasks.length === 0 && !canAddChat) return null;

  const totalCount = allTasks.length;
  const selectedCount = selectedPanelIds.length;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[45] pointer-events-none"
      data-testid="boost-taskbar"
    >
      <div className="pointer-events-auto mx-auto max-w-screen-xl px-2 sm:px-4">
        <div className="bg-card/95 backdrop-blur-md border border-border/50 border-b-0 rounded-t-xl shadow-lg">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/30 transition-colors rounded-t-xl"
            data-testid="boost-taskbar-toggle"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-foreground">
                {t("boost.taskbar")}
              </span>
              {totalCount > 0 && (
                <Badge className="h-3.5 px-1 text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {totalCount}
                </Badge>
              )}
              {selectedCount > 0 && (
                <div className="flex items-center gap-1">
                  <Monitor className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] text-blue-400 font-medium">{selectedCount}/{maxPanels}</span>
                </div>
              )}
            </div>
            {collapsed ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
          </button>

          {!collapsed && (
            <div className="px-1.5 pb-1.5 flex gap-1 overflow-x-auto scrollbar-thin items-center" data-testid="boost-taskbar-cards">
              {displayTasks.map((task) => {
                const agentInfo = agentIconMap[task.agentType] || agentIconMap["customer-support"];
                const AgentIcon = agentInfo.icon;
                const isRunning = task.boostStatus === "running";
                const isCompleted = task.boostStatus === "completed";
                const isError = task.boostStatus === "error";
                const isSelected = selectedPanelIds.includes(task.visibleId);
                const canSelect = selectedCount < maxPanels || isSelected;

                return (
                  <div
                    key={task.id}
                    className={`relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all shrink-0 min-w-[130px] max-w-[180px] text-left group cursor-pointer ${
                      isSelected
                        ? "border-amber-400/60 bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                        : "border-border/50 bg-muted/20 hover:bg-muted/40"
                    }`}
                    onClick={() => {
                      if (onTogglePanel && canSelect) {
                        onTogglePanel(task.visibleId, task.agentType);
                      } else if (!canSelect) {
                        toast({ title: t("boost.maxPanels") || "Maximum panels reached", variant: "destructive" });
                      }
                    }}
                    data-testid={`boost-task-card-${task.id}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10">
                        <Monitor className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${agentInfo.color} flex items-center justify-center shrink-0`}>
                      <AgentIcon className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-foreground truncate">
                        {task.title || agentInfo.persona}
                      </p>
                      <p className="text-[8px] text-muted-foreground truncate">
                        {agentInfo.persona}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-0.5">
                      {isRunning && (
                        <span className="relative flex h-2 w-2" data-testid={`boost-task-status-running-${task.id}`}>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                      {isCompleted && (
                        <Check className="w-3 h-3 text-emerald-400" data-testid={`boost-task-status-done-${task.id}`} />
                      )}
                      {isError && (
                        <AlertCircle className="w-3 h-3 text-red-400" data-testid={`boost-task-status-error-${task.id}`} />
                      )}
                      {!isRunning && !isCompleted && !isError && (
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" />
                      )}
                      {onBringToFront && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onBringToFront(task.visibleId, task.agentType); }}
                          className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-500/30 hover:text-blue-400 text-muted-foreground/50 transition-all"
                          title={t("boost.bringToFront", "Bring to Front")}
                          data-testid={`boost-task-front-${task.id}`}
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onTaskDelete?.(task); }}
                        className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/30 hover:text-red-400 text-muted-foreground/50 transition-all"
                        data-testid={`boost-task-delete-${task.id}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {canAddChat && onNewChat && (
                <button
                  onClick={onNewChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all shrink-0 text-amber-400 text-[10px] font-medium"
                  data-testid="boost-taskbar-new-chat"
                >
                  <Plus className="w-3 h-3" />
                  <span className="whitespace-nowrap">{t("boost.newParallelChat")}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
