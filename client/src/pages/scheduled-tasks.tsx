import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

const getAgentTypeOptions = (t: any) => [
  { value: "customer-support", label: t("scheduledTasks.agentAva") },
  { value: "sales-sdr", label: t("scheduledTasks.agentRex") },
  { value: "social-media", label: t("scheduledTasks.agentMaya") },
  { value: "bookkeeping", label: t("scheduledTasks.agentFinn") },
  { value: "scheduling", label: t("scheduledTasks.agentCal") },
  { value: "hr-recruiting", label: t("scheduledTasks.agentHarper") },
  { value: "data-analyst", label: t("scheduledTasks.agentDataBot") },
  { value: "ecommerce-ops", label: t("scheduledTasks.agentShopBot") },
  { value: "real-estate", label: t("scheduledTasks.agentReno") },
  { value: "manager", label: t("scheduledTasks.agentManager") },
];

const getScheduleTypeOptions = (t: any) => [
  { value: "daily", label: t("scheduledTasks.daily") },
  { value: "weekly", label: t("scheduledTasks.weekly") },
  { value: "monthly", label: t("scheduledTasks.monthly") },
  { value: "custom", label: t("scheduledTasks.custom") },
];

function getAgentLabel(agentType: string, t: any): string {
  return getAgentTypeOptions(t).find(o => o.value === agentType)?.label || agentType;
}

function formatCron(cronExpression: string, scheduleType: string, t: any): string {
  const labels: Record<string, string> = {
    daily: t("scheduledTasks.daily"),
    weekly: t("scheduledTasks.weekly"),
    monthly: t("scheduledTasks.monthly"),
    custom: t("scheduledTasks.customShort"),
  };
  return labels[scheduleType] || cronExpression;
}

function formatDate(dateStr: string | null, language: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const locale = language === "tr" ? "tr-TR" : "en-US";
  return date.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}

function StatusBadge({ status, t }: { status: string; t: any }) {
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
  const { t, i18n } = useTranslation("pages");
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [historyTask, setHistoryTask] = useState<ScheduledTask | null>(null);

  const agentTypeOptions = getAgentTypeOptions(t);
  const scheduleTypeOptions = getScheduleTypeOptions(t);

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
      toast({ title: t("scheduledTasks.taskCreated") });
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.error"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/scheduled-tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
      setEditingTask(null);
      setShowForm(false);
      setForm(DEFAULT_FORM);
      toast({ title: t("scheduledTasks.taskUpdated") });
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.error"), description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scheduled-tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
      toast({ title: t("scheduledTasks.taskDeleted") });
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.error"), description: err.message, variant: "destructive" });
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
      toast({ title: t("scheduledTasks.taskStarted"), description: t("scheduledTasks.taskStartedDesc") });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks"] });
        if (historyTask?.id === id) {
          queryClient.invalidateQueries({ queryKey: ["/api/scheduled-tasks", id, "runs"] });
        }
      }, 3000);
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.error"), description: err.message, variant: "destructive" });
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
        toast({ title: t("scheduledTasks.scheduleConverted"), description: data.humanReadable || data.cronExpression });
      }
    },
    onError: (err: any) => {
      toast({ title: t("scheduledTasks.conversionError"), description: err.message, variant: "destructive" });
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
    t("scheduledTasks.exampleMorning9"),
    t("scheduledTasks.exampleMonday10"),
    t("scheduledTasks.exampleFirstOfMonth"),
    t("scheduledTasks.exampleFriday17"),
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Timer className="w-6 h-6 text-blue-400" />
              {t("scheduledTasks.title")}
            </h1>
            <p className="text-gray-400 text-sm mt-1">{t("scheduledTasks.subtitle")}</p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
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
            <Timer className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">{t("scheduledTasks.noTasksYet")}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {t("scheduledTasks.noTasksDesc")}
            </p>
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-first">
              <Plus className="w-4 h-4 mr-2" />
              {t("scheduledTasks.createFirstTask")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card
                key={task.id}
                className="bg-gray-900 border-gray-800"
                data-testid={`card-task-${task.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.isActive ? "bg-green-400" : "bg-gray-600"}`} />
                        <h3 className="font-semibold text-white truncate" data-testid={`text-task-name-${task.id}`}>{task.name}</h3>
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 flex-shrink-0">
                          {formatCron(task.cronExpression, task.scheduleType, t)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-gray-500" />
                          <span>{getAgentLabel(task.agentType, t)}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{task.cronExpression}</span>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <span>{t("scheduledTasks.lastRun")}: {formatDate(task.lastRunAt, i18n.language)}</span>
                        {task.nextRunAt && <span>{t("scheduledTasks.nextRun")}: {formatDate(task.nextRunAt, i18n.language)}</span>}
                        <span>{t("scheduledTasks.totalRuns", { count: task.runCount })}</span>
                        {task.lastRunStatus && (
                          <span className={`font-medium ${task.lastRunStatus === "completed" ? "text-green-600" : task.lastRunStatus === "failed" ? "text-red-600" : "text-yellow-600"}`}>
                            {task.lastRunStatus === "completed" ? `✓ ${t("scheduledTasks.successful")}` : task.lastRunStatus === "failed" ? `✗ ${t("scheduledTasks.statusFailed")}` : `⟳ ${t("scheduledTasks.statusRunning")}`}
                          </span>
                        )}
                        {task.notifyInApp && (
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" /> {t("scheduledTasks.inAppNotif")}
                          </span>
                        )}
                        {task.notifyEmail && (
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" /> {t("scheduledTasks.emailNotif")}
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
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-history-${task.id}`}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => runNowMutation.mutate(task.id)}
                        disabled={runNowMutation.isPending}
                        className="text-gray-400 hover:text-green-400"
                        data-testid={`button-run-now-${task.id}`}
                      >
                        {runNowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(task)}
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-edit-${task.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(t("scheduledTasks.confirmDelete", { name: task.name }))) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-400"
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
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTask ? t("scheduledTasks.editTask") : t("scheduledTasks.newScheduledTask")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">{t("scheduledTasks.taskName")} *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t("scheduledTasks.taskNamePlaceholder")}
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-task-name"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1.5">{t("scheduledTasks.description")}</label>
              <Input
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t("scheduledTasks.descriptionPlaceholder")}
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-task-description"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1.5">{t("scheduledTasks.agent")} *</label>
              <Select
                value={form.agentType}
                onValueChange={(v) => setForm(f => ({ ...f, agentType: v }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-agent-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agentTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1.5">{t("scheduledTasks.taskInstruction")} *</label>
              <Textarea
                value={form.taskPrompt}
                onChange={(e) => setForm(f => ({ ...f, taskPrompt: e.target.value }))}
                placeholder={t("scheduledTasks.taskInstructionPlaceholder")}
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                data-testid="input-task-prompt"
              />
            </div>

            <div className="border border-gray-800 rounded-lg p-4 bg-gray-800/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <label className="text-sm text-gray-300 font-medium">{t("scheduledTasks.naturalLanguageScheduling")}</label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={form.naturalLanguage}
                  onChange={(e) => setForm(f => ({ ...f, naturalLanguage: e.target.value }))}
                  placeholder={t("scheduledTasks.naturalLanguagePlaceholder")}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-natural-language"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => form.naturalLanguage && parseNLMutation.mutate(form.naturalLanguage)}
                  disabled={!form.naturalLanguage || parseNLMutation.isPending}
                  className="border-gray-700 text-gray-300 hover:text-white flex-shrink-0"
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
                <label className="text-sm text-gray-400 block mb-1.5">{t("scheduledTasks.scheduleType")}</label>
                <Select
                  value={form.scheduleType}
                  onValueChange={(v) => setForm(f => ({ ...f, scheduleType: v }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-schedule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">{t("scheduledTasks.cronExpression")} *</label>
                <Input
                  value={form.cronExpression}
                  onChange={(e) => setForm(f => ({ ...f, cronExpression: e.target.value }))}
                  placeholder="0 9 * * *"
                  className="bg-gray-800 border-gray-700 text-white font-mono"
                  data-testid="input-cron"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 font-mono bg-gray-800/50 rounded p-2">
              {t("scheduledTasks.cronFormatHelp")}
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, isActive: checked }))}
                  data-testid="switch-is-active"
                />
                <span className="text-sm text-gray-300">{t("scheduledTasks.active")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.notifyInApp}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, notifyInApp: checked }))}
                  data-testid="switch-notify-inapp"
                />
                <span className="text-sm text-gray-300">{t("scheduledTasks.inAppNotification")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={form.notifyEmail}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, notifyEmail: checked }))}
                  data-testid="switch-notify-email"
                />
                <span className="text-sm text-gray-300">{t("scheduledTasks.emailNotification")}</span>
              </label>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-4 mt-2">
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setEditingTask(null); setForm(DEFAULT_FORM); }}
              className="border-gray-700 text-gray-300"
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
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              {t("scheduledTasks.runHistory")}: {historyTask?.name}
            </DialogTitle>
          </DialogHeader>

          {runsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : taskRuns.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Clock className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p>{t("scheduledTasks.noRunsYet")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskRuns.map((run) => (
                <div
                  key={run.id}
                  className="border border-gray-800 rounded-lg p-4 bg-gray-800/30"
                  data-testid={`run-card-${run.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} t={t} />
                      <span className="text-xs text-gray-400">{formatDate(run.startedAt, i18n.language)}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDuration(run.durationMs)}</span>
                  </div>
                  {run.result && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1 font-medium">{t("scheduledTasks.result")}:</p>
                      <p className="text-xs text-gray-300 bg-gray-900 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
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
