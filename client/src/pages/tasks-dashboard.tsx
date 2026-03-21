import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Search,
  ArrowLeft,
  Circle,
  Clock,
  Check,
  Flag,
  Calendar,
  ArrowRightLeft,
  Loader2,
  ClipboardList,
  Zap,
  Trash2,
  ChevronRight,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AgentTask } from "@shared/schema";

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  "sales-sdr": "Rex",
  "customer-support": "Ava",
  "social-media": "Maya",
  "bookkeeping": "Finn",
  "scheduling": "Cal",
  "hr-recruiting": "Harper",
  "data-analyst": "DataBot",
  "ecommerce-ops": "ShopBot",
  "real-estate": "Reno",
  "manager": "Manager",
};



const PRIORITY_BG: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_CONFIG: Record<string, {
  icon: typeof Circle;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  headerBg: string;
}> = {
  todo: {
    icon: Circle,
    label: "Yapılacak",
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    borderColor: "border-border/50",
    headerBg: "bg-muted/50",
  },
  "in-progress": {
    icon: Clock,
    label: "Devam Eden",
    color: "text-blue-400",
    bgColor: "bg-blue-500/5",
    borderColor: "border-blue-500/20",
    headerBg: "bg-blue-500/10",
  },
  done: {
    icon: Check,
    label: "Tamamlanan",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/5",
    borderColor: "border-emerald-500/20",
    headerBg: "bg-emerald-500/10",
  },
};

function formatDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  const month = d.toLocaleDateString("tr-TR", { month: "short" });
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hasTime = hours !== 0 || minutes !== 0;
  if (hasTime) {
    return `${day} ${month} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  return `${day} ${month}`;
}

function formatRelative(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function KanbanCard({
  task,
  onDelete,
  onStatusChange,
}: {
  task: AgentTask;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}) {
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
  const dueDateStr = formatDate(task.dueDate);

  const nextStatus =
    task.status === "todo"
      ? "in-progress"
      : task.status === "in-progress"
      ? "done"
      : "todo";

  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;

  return (
    <Card
      className="p-3 bg-card border-border/50 hover:border-blue-500/20 transition-colors group"
      data-testid={`kanban-card-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <button
          onClick={() => onStatusChange(task.id, nextStatus)}
          className={`mt-0.5 shrink-0 ${STATUS_CONFIG[task.status]?.color || "text-muted-foreground"} hover:scale-110 transition-transform`}
          data-testid={`button-toggle-status-${task.id}`}
          title={`${nextStatus} olarak işaretle`}
        >
          <StatusIcon className="w-4 h-4" />
        </button>
        <p
          className={`flex-1 text-sm font-medium leading-tight ${
            task.status === "done" ? "line-through text-muted-foreground/60" : "text-foreground"
          }`}
        >
          {task.title}
        </p>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all shrink-0"
          data-testid={`button-delete-task-${task.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground/70 mb-2 line-clamp-2 leading-relaxed pl-6">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 pl-6">
        {task.project && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 max-w-[100px] truncate">
            {task.project}
          </Badge>
        )}
        <Badge
          variant="secondary"
          className={`text-[10px] h-4 px-1.5 border ${PRIORITY_BG[task.priority] || PRIORITY_BG.medium}`}
          data-testid={`priority-badge-${task.id}`}
        >
          <Flag className="w-2.5 h-2.5 mr-0.5" />
          {task.priority === "low"
            ? "Düşük"
            : task.priority === "medium"
            ? "Orta"
            : task.priority === "high"
            ? "Yüksek"
            : "Acil"}
        </Badge>
        <Badge
          variant="secondary"
          className="text-[10px] h-4 px-1.5 bg-violet-500/10 text-violet-400 border-violet-500/20 border"
          data-testid={`agent-badge-${task.id}`}
        >
          <Bot className="w-2.5 h-2.5 mr-0.5" />
          {AGENT_DISPLAY_NAMES[task.agentType] || task.agentType}
        </Badge>
        {dueDateStr && (
          <span
            className={`text-[10px] flex items-center gap-0.5 font-medium ${
              isOverdue ? "text-red-400" : "text-muted-foreground"
            }`}
            data-testid={`due-date-${task.id}`}
          >
            <Calendar className="w-2.5 h-2.5" />
            {dueDateStr}
          </span>
        )}
        {task.sourceAgentType && (
          <span
            className="text-[10px] flex items-center gap-0.5 text-violet-400 font-medium"
            data-testid={`delegation-from-${task.id}`}
          >
            <ArrowRightLeft className="w-2.5 h-2.5" />
            {AGENT_DISPLAY_NAMES[task.sourceAgentType] || task.sourceAgentType}
          </span>
        )}
        {task.delegationStatus && (
          <Badge
            variant="secondary"
            className={`text-[10px] h-4 px-1.5 border ${
              task.delegationStatus === "completed"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : task.delegationStatus === "pending"
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
            data-testid={`delegation-status-${task.id}`}
          >
            {task.delegationStatus === "completed"
              ? "Tamamlandı"
              : task.delegationStatus === "pending"
              ? "Bekliyor"
              : task.delegationStatus}
          </Badge>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/50 pl-6 mt-1.5">
        {formatRelative(task.createdAt?.toString())}
      </p>
    </Card>
  );
}

function KanbanColumn({
  status,
  tasks,
  onDelete,
  onStatusChange,
}: {
  status: string;
  tasks: AgentTask[];
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col rounded-xl border ${config.borderColor} ${config.bgColor} min-h-[400px]`}
      data-testid={`kanban-column-${status}`}
    >
      <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl ${config.headerBg}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <h3 className={`text-sm font-bold ${config.color}`}>{config.label}</h3>
        <Badge
          variant="secondary"
          className={`ml-auto text-xs h-5 ${config.headerBg} ${config.color} border-0`}
          data-testid={`column-count-${status}`}
        >
          {tasks.length}
        </Badge>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground/50">Görev yok</p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface AutomationWorkflow {
  id: number;
  name: string;
  triggerType: string;
  isActive: boolean;
  lastRunAt: string | null;
  runCount: number;
}


export default function TasksDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"kanban" | "delegation" | "scheduled">("kanban");

  const { data: allTasks = [], isLoading } = useQuery<AgentTask[]>({
    queryKey: ["/api/agent-tasks"],
    enabled: !!user,
  });

  const { data: automations = [] } = useQuery<AutomationWorkflow[]>({
    queryKey: ["/api/automations"],
    enabled: !!user && activeTab === "scheduled",
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/agent-tasks/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-tasks"] });
    },
    onError: () => {
      toast({ title: "Hata", description: "Görev güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/agent-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-tasks"] });
      toast({ title: "Silindi", description: "Görev silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Görev silinemedi", variant: "destructive" });
    },
  });

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesSearch =
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAgent = agentFilter === "all" || task.agentType === agentFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesAgent && matchesPriority;
    });
  }, [allTasks, searchQuery, agentFilter, priorityFilter]);

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in-progress");
  const doneTasks = filteredTasks.filter((t) => t.status === "done");

  const delegationTasks = useMemo(() => {
    return allTasks.filter((t) => t.sourceAgentType || t.targetAgentType);
  }, [allTasks]);

  const agentsUsed = useMemo(() => {
    const set = new Set(allTasks.map((t) => t.agentType));
    return Array.from(set);
  }, [allTasks]);

  const statsTotal = allTasks.length;
  const statsDone = allTasks.filter((t) => t.status === "done").length;
  const statsInProgress = allTasks.filter((t) => t.status === "in-progress").length;
  const statsOverdue = allTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
  ).length;

  if (authLoading || !user) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
              </Link>
              <div className="h-4 w-px bg-border/50" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
                  <ClipboardList className="w-6 h-6 text-blue-400" />
                  Görev Kontrol Merkezi
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Tüm ajan görevleri, delegasyonlar ve otomasyon durumları
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="p-4 bg-card border-border/50" data-testid="stat-total">
            <p className="text-2xl font-bold text-foreground">{statsTotal}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Toplam Görev</p>
          </Card>
          <Card className="p-4 bg-card border-border/50" data-testid="stat-in-progress">
            <p className="text-2xl font-bold text-blue-400">{statsInProgress}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Devam Eden</p>
          </Card>
          <Card className="p-4 bg-card border-border/50" data-testid="stat-done">
            <p className="text-2xl font-bold text-emerald-400">{statsDone}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tamamlanan</p>
          </Card>
          <Card className="p-4 bg-card border-border/50" data-testid="stat-overdue">
            <p className={`text-2xl font-bold ${statsOverdue > 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {statsOverdue}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Gecikmiş</p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Görev, proje veya açıklama ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
              data-testid="input-search"
            />
          </div>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="h-9 w-full sm:w-44" data-testid="select-agent-filter">
              <Bot className="w-4 h-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Ajan filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Ajanlar</SelectItem>
              {agentsUsed.map((agentType) => (
                <SelectItem key={agentType} value={agentType}>
                  {AGENT_DISPLAY_NAMES[agentType] || agentType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-full sm:w-40" data-testid="select-priority-filter">
              <Flag className="w-4 h-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Öncelik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Öncelikler</SelectItem>
              <SelectItem value="urgent">Acil</SelectItem>
              <SelectItem value="high">Yüksek</SelectItem>
              <SelectItem value="medium">Orta</SelectItem>
              <SelectItem value="low">Düşük</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1 mb-5 border-b border-border/50">
          {(
            [
              { key: "kanban", label: "Kanban Board", icon: ClipboardList },
              { key: "delegation", label: "Delegasyon Akışı", icon: ArrowRightLeft },
              { key: "scheduled", label: "Zamanlanmış Görevler", icon: Zap },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "kanban" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KanbanColumn
                  status="todo"
                  tasks={todoTasks}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
                />
                <KanbanColumn
                  status="in-progress"
                  tasks={inProgressTasks}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
                />
                <KanbanColumn
                  status="done"
                  tasks={doneTasks}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
                />
              </div>
            )}
          </>
        )}

        {activeTab === "delegation" && (
          <DelegationView tasks={delegationTasks} isLoading={isLoading} />
        )}

        {activeTab === "scheduled" && (
          <ScheduledTasksView automations={automations} />
        )}
      </div>
    </div>
  );
}

function DelegationView({ tasks, isLoading }: { tasks: AgentTask[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ArrowRightLeft className="w-12 h-12 text-muted-foreground/20 mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Delegasyon Yok</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Ajanlar arasında devredilen görevler burada görünecek.
        </p>
      </div>
    );
  }

  const chains = tasks.reduce<Record<string, AgentTask[]>>((acc, task) => {
    const key = task.sourceAgentType || task.agentType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-4" data-testid="delegation-view">
      {Object.entries(chains).map(([sourceAgent, chainTasks]) => (
        <Card key={sourceAgent} className="p-4 bg-card border-border/50" data-testid={`delegation-chain-${sourceAgent}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {AGENT_DISPLAY_NAMES[sourceAgent] || sourceAgent}
              </p>
              <p className="text-xs text-muted-foreground">
                {chainTasks.length} devredilen görev
              </p>
            </div>
          </div>
          <div className="space-y-2 pl-4 border-l-2 border-violet-500/20">
            {chainTasks.map((task) => {
              const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
              const StatusIcon = statusConf.icon;
              const isOverdue =
                task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/30"
                  data-testid={`delegation-task-${task.id}`}
                >
                  <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${statusConf.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {task.targetAgentType && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ChevronRight className="w-3 h-3" />
                          <span className="text-violet-400 font-medium">
                            {AGENT_DISPLAY_NAMES[task.targetAgentType] || task.targetAgentType}
                          </span>
                          <span className="text-muted-foreground">tarafından alındı</span>
                        </span>
                      )}
                      {task.sourceAgentType && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowRightLeft className="w-3 h-3 text-violet-400" />
                          <span className="text-violet-400 font-medium">
                            {AGENT_DISPLAY_NAMES[task.sourceAgentType] || task.sourceAgentType}
                          </span>
                          <span className="text-muted-foreground">tarafından devredildi</span>
                        </span>
                      )}
                      {task.delegationStatus && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-4 px-1.5 border ${
                            task.delegationStatus === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : task.delegationStatus === "pending"
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {task.delegationStatus === "completed"
                            ? "Tamamlandı"
                            : task.delegationStatus === "pending"
                            ? "Bekliyor"
                            : task.delegationStatus}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {task.delegationResult && (
                      <p className="text-xs text-muted-foreground/60 mt-1 italic">
                        {task.delegationResult}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] h-5 px-1.5 border shrink-0 ${statusConf.bgColor.replace("bg-", "bg-")} ${statusConf.color} border-current/20`}
                  >
                    {statusConf.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ScheduledTasksView({ automations }: { automations: AutomationWorkflow[] }) {
  if (automations.length > 0 && automations[0] === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Zap className="w-12 h-12 text-muted-foreground/20 mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Otomasyon Yok</h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">
          Zamanlanmış görevler ve otomasyon geçmişi burada görünecek.
        </p>
        <Link href="/automations">
          <Button variant="outline" size="sm" data-testid="button-create-automation">
            <Zap className="w-4 h-4 mr-1.5" />
            Otomasyon Oluştur
          </Button>
        </Link>
      </div>
    );
  }

  const triggerLabels: Record<string, string> = {
    agent_tool_complete: "Ajan Aksiyonu",
    webhook: "Webhook",
    schedule: "Zamanlı",
    manual: "Manuel",
    threshold: "Eşik Değer",
    email_received: "E-posta Alındı",
  };

  return (
    <div className="space-y-4" data-testid="scheduled-tasks-view">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card className="p-4 bg-card border-border/50">
          <p className="text-2xl font-bold text-foreground">{automations.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Toplam Otomasyon</p>
        </Card>
        <Card className="p-4 bg-card border-border/50">
          <p className="text-2xl font-bold text-emerald-400">
            {automations.filter((a) => a.isActive).length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Aktif</p>
        </Card>
        <Card className="p-4 bg-card border-border/50">
          <p className="text-2xl font-bold text-violet-400">
            {automations.reduce((sum, a) => sum + (a.runCount || 0), 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Toplam Çalışma</p>
        </Card>
      </div>

      <div className="space-y-3">
        {automations.map((automation) => (
          <Card
            key={automation.id}
            className="p-4 bg-card border-border/50 hover:border-blue-500/20 transition-colors"
            data-testid={`automation-row-${automation.id}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  automation.isActive
                    ? "bg-emerald-500/10"
                    : "bg-muted/50"
                }`}
              >
                <Activity
                  className={`w-4 h-4 ${
                    automation.isActive ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {automation.name}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] h-4 px-1.5 border shrink-0 ${
                      automation.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-muted/50 text-muted-foreground border-border/50"
                    }`}
                    data-testid={`automation-status-${automation.id}`}
                  >
                    {automation.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1.5 bg-blue-500/10 text-blue-400 border-blue-500/20 border shrink-0"
                  >
                    {triggerLabels[automation.triggerType] || automation.triggerType}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Son çalışma: {automation.lastRunAt ? formatRelative(automation.lastRunAt) : "Hiç çalışmadı"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {automation.runCount || 0} kez çalıştı
                  </span>
                </div>
              </div>
              <Link href="/automations">
                <Button variant="ghost" size="sm" className="h-8 shrink-0" data-testid={`button-view-automation-${automation.id}`}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
