import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Clock, Plus, Play, Trash2, CheckCircle2, XCircle,
  Loader2, Timer, Bot, Bell, ChevronRight, Sparkles,
  Calendar, History, Edit2, RefreshCw, AlertTriangle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ScheduledTask {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  agentType: string;
  taskPrompt: string;
  cronExpression: string;
  scheduleType: string;
  isActive: boolean;
  notifyEmail: boolean;
  notifyInApp: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  lastRunStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskRun {
  id: number;
  taskId: number;
  userId: number;
  status: string;
  result: string | null;
  error: string | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
}

const AGENT_TYPE_KEYS = [
  "customer-support", "sales-sdr", "social-media", "bookkeeping",
  "scheduling", "hr-recruiting", "data-analyst", "ecommerce-ops",
  "real-estate", "manager",
];

const SCHEDULE_TYPE_KEYS = ["daily", "weekly", "monthly", "custom"] as const;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  if (status === "completed") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">{t("scheduledTasks.statusCompleted")}</Badge>;
  if (status === "failed") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{t("scheduledTasks.statusFailed")}</Badge>;
  if (status === "running") return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs animate-pulse">{t("scheduledTasks.statusRunning")}</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

const DEFAULT_FORM = {
  name: "",
  description: "",
  agentType: "data-analyst",
  taskPrompt: "",
  cronExpression: "0 9 * * *",
  scheduleType: "daily",
  isActive: true,
  notifyEmail: false,
  notifyInApp: true,
  naturalLanguage: "",
};

export default function ScheduledTasksPage() {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [historyTask, setHistoryTask] = useState<ScheduledTask | null>(null);

  const { data: tasks = [], isLoading } = useQuery<ScheduledTask[]>({
    queryKey: ["/api/scheduled-tasks"],
  });

  const { data: taskRuns = [], isLoading: runsLoading } = useQuery<TaskRun[]>({
    queryKey: ["/api/scheduled-tasks", historyTask?.id, "runs"],
    enabled: !!historyTask,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/scheduled-tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
      setShowForm(false);
      setForm(DEFAULT_FORM);
      toast({ title: t("scheduledTasks.toastCreated") });
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.toastError"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/scheduled-tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
      setEditingTask(null);
      setShowForm(false);
      setForm(DEFAULT_FORM);
      toast({ title: t("scheduledTasks.toastUpdated") });
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.toastError"), description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scheduled-tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
      toast({ title: t("scheduledTasks.toastDeleted") });
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.toastError"), description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/scheduled-tasks/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/scheduled-tasks/${id}/run-now`),
    onSuccess: (_, id) => {
      toast({ title: t("scheduledTasks.toastStarted"), description: t("scheduledTasks.toastStartedDesc") });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
        if (historyTask?.id === id) {
          queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks", id, "runs"] });
        }
      }, 3000);
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.toastError"), description: err.message, variant: "destructive" });
    },
  });

  const parseNLMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/scheduled-tasks/parse-natural-language", { text });
      return res.json() as Promise<{ cronExpression?: string; scheduleType?: string; humanReadable?: string }>;
    },
    onSuccess: (data) => {
      if (data.cronExpression) {
        setForm(f => ({
          ...f,
          cronExpression: data.cronExpression!,
          scheduleType: data.scheduleType || "custom",
        }));
        toast({ title: t("scheduledTasks.toastConverted"), description: data.humanReadable || data.cronExpression });
      }
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.toastConvertError"), description: err.message, variant: "destructive" });
    },
  });

  function openCreate() {
    setEditingTask(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(task: ScheduledTask) {
    setEditingTask(task);
    setForm({
      name: task.name,
      description: task.description || "",
      agentType: task.agentType,
      taskPrompt: task.taskPrompt,
      cronExpression: task.cronExpression,
      scheduleType: task.scheduleType,
      isActive: task.isActive,
      notifyEmail: task.notifyEmail,
      notifyInApp: task.notifyInApp,
      naturalLanguage: "",
    });
    setShowForm(true);
  }

  function handleSubmit() {
    const data = {
      name: form.name,
      description: form.description || null,
      agentType: form.agentType,
      taskPrompt: form.taskPrompt,
      cronExpression: form.cronExpression,
      scheduleType: form.scheduleType,
      isActive: form.isActive,
      notifyEmail: form.notifyEmail,
      notifyInApp: form.notifyInApp,
    };

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const openHistory = (task: ScheduledTask) => {
    setHistoryTask(task);
    queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks", task.id, "runs"] });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const scheduleExamples = [
    "her sabah 9'da",
    "her pazartesi saat 10'da",
    "her ayın 1'inde",
    "her cuma 17'de",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Timer className="w-6 h-6 text-blue-400" />
              {t("scheduledTasks.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t("scheduledTasks.subtitle")}</p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-create-task"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("scheduledTasks.newTask")}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <Timer className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">{t("scheduledTasks.noTasks")}</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {t("scheduledTasks.noTasksDesc")}
            </p>
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-first">
              <Plus className="w-4 h-4 mr-2" />
              {t("scheduledTasks.createFirst")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card
                key={task.id}
                className="bg-card border-border"
                data-testid={`card-task-${task.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.isActive ? "bg-green-400" : "bg-muted-foreground"}`} />
                        <h3 className="font-semibold text-foreground truncate" data-testid={`text-task-name-${task.id}`}>{task.name}</h3>
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 flex-shrink-0">
                          {t(`scheduledTasks.scheduleShort.${task.scheduleType}`, { defaultValue: task.cronExpression })}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{t(`scheduledTasks.agentOptions.${task.agentType}`, { defaultValue: task.agentType })}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{task.cronExpression}</span>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>{formatDate(task.lastRunAt)}</span>
                        {task.nextRunAt && <span>{formatDate(task.nextRunAt)}</span>}
                        <span>×{task.runCount}</span>
                        {task.lastRunStatus && (
                          <span className={`font-medium ${task.lastRunStatus === "completed" ? "text-green-600" : task.lastRunStatus === "failed" ? "text-red-600" : "text-yellow-600"}`}>
                            {task.lastRunStatus === "completed" ? t("scheduledTasks.successText") : task.lastRunStatus === "failed" ? t("scheduledTasks.failedText") : t("scheduledTasks.runningText")}
                          </span>
                        )}
                        {task.notifyInApp && (
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" /> {t("scheduledTasks.inApp")}
                          </span>
                        )}
                        {task.notifyEmail && (
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" /> {t("scheduledTasks.email")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={task.isActive}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: task.id, isActive: checked })}
                        data-testid={`switch-active-${task.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openHistory(task)}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid={`button-history-${task.id}`}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => runNowMutation.mutate(task.id)}
                        disabled={runNowMutation.isPending}
                        className="text-muted-foreground hover:text-green-400"
                        data-testid={`button-run-now-${task.id}`}
                      >
                        {runNowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(task)}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid={`button-edit-${task.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`"${task.name}" — ${t("scheduledTasks.deleteConfirm")}`)) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-red-400"
                        data-testid={`button-delete-${task.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingTask(null); setForm(DEFAULT_FORM); } }}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingTask ? t("scheduledTasks.editTask") : t("scheduledTasks.newScheduledTask")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">{t("scheduledTasks.taskName")}</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t("scheduledTasks.taskNamePlaceholder")}
                className="bg-muted border-border text-foreground"
                data-testid="input-task-name"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">{t("scheduledTasks.description")}</label>
              <Input
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t("scheduledTasks.descriptionPlaceholder")}
                className="bg-muted border-border text-foreground"
                data-testid="input-task-description"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">{t("scheduledTasks.agentType")}</label>
              <Select
                value={form.agentType}
                onValueChange={(v) => setForm(f => ({ ...f, agentType: v }))}
              >
                <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-agent-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPE_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>{t(`scheduledTasks.agentOptions.${key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">{t("scheduledTasks.taskPrompt")}</label>
              <Textarea
                value={form.taskPrompt}
                onChange={(e) => setForm(f => ({ ...f, taskPrompt: e.target.value }))}
                placeholder={t("scheduledTasks.taskPromptPlaceholder")}
                className="bg-muted border-border text-foreground min-h-[100px]"
                data-testid="input-task-prompt"
              />
            </div>

            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <label className="text-sm text-muted-foreground font-medium">{t("scheduledTasks.nlScheduling")}</label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={form.naturalLanguage}
                  onChange={(e) => setForm(f => ({ ...f, naturalLanguage: e.target.value }))}
                  placeholder={t("scheduledTasks.nlPlaceholder")}
                  className="bg-muted border-border text-foreground"
                  data-testid="input-natural-language"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => form.naturalLanguage && parseNLMutation.mutate(form.naturalLanguage)}
                  disabled={!form.naturalLanguage || parseNLMutation.isPending}
                  className="border-border text-muted-foreground hover:text-foreground flex-shrink-0"
                  data-testid="button-parse-nl"
                >
                  {parseNLMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {scheduleExamples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setForm(f => ({ ...f, naturalLanguage: ex }));
                      parseNLMutation.mutate(ex);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded px-2 py-0.5 hover:bg-purple-500/10 transition-colors"
                    data-testid={`button-example-${ex}`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">{t("scheduledTasks.scheduleType")}</label>
                <Select
                  value={form.scheduleType}
                  onValueChange={(v) => setForm(f => ({ ...f, scheduleType: v }))}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-schedule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPE_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>{t(`scheduledTasks.scheduleShort.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1.5">{t("scheduledTasks.cronExpression")}</label>
                <Input
                  value={form.cronExpression}
                  onChange={(e) => setForm(f => ({ ...f, cronExpression: e.target.value }))}
                  placeholder="0 9 * * *"
                  className="bg-muted border-border text-foreground font-mono"
                  data-testid="input-cron"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2">
              {t("scheduledTasks.cronHelp")}
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, isActive: checked }))}
                  data-testid="switch-is-active"
                />
                <span className="text-sm text-muted-foreground">{t("scheduledTasks.active")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.notifyInApp}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, notifyInApp: checked }))}
                  data-testid="switch-notify-inapp"
                />
                <span className="text-sm text-muted-foreground">{t("scheduledTasks.inAppNotification")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.notifyEmail}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, notifyEmail: checked }))}
                  data-testid="switch-notify-email"
                />
                <span className="text-sm text-muted-foreground">{t("scheduledTasks.emailNotification")}</span>
              </label>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setEditingTask(null); setForm(DEFAULT_FORM); }}
              className="border-border text-muted-foreground"
              data-testid="button-cancel"
            >
              {t("scheduledTasks.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.taskPrompt || !form.cronExpression || isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingTask ? t("scheduledTasks.save") : t("scheduledTasks.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyTask} onOpenChange={(open) => { if (!open) setHistoryTask(null); }}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              {t("scheduledTasks.runHistory", { name: historyTask?.name })}
            </DialogTitle>
          </DialogHeader>

          {runsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : taskRuns.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>{t("scheduledTasks.noRuns")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskRuns.map((run) => (
                <div
                  key={run.id}
                  className="border border-border rounded-lg p-4 bg-muted/30"
                  data-testid={`run-card-${run.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} t={t} />
                      <span className="text-xs text-muted-foreground">{formatDate(run.startedAt)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDuration(run.durationMs)}</span>
                  </div>
                  {run.result && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">{t("scheduledTasks.result")}</p>
                      <p className="text-xs text-muted-foreground bg-card rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {run.result}
                      </p>
                    </div>
                  )}
                  {run.error && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{run.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
