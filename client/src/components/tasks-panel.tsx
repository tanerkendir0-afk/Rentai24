import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Check,
  Circle,
  Clock,
  Trash2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ListTodo,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentTask } from "@shared/schema";

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-blue-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

const STATUS_CONFIG: Record<string, { icon: typeof Circle; labelKey: string; color: string; bgColor: string; borderColor: string }> = {
  todo: { icon: Circle, labelKey: "tasksPanel.toDo", color: "text-muted-foreground", bgColor: "bg-muted/40", borderColor: "border-border/50" },
  "in-progress": { icon: Clock, labelKey: "tasksPanel.inProgress", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  done: { icon: Check, labelKey: "tasksPanel.done", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
};

function MiniCalendar({ selectedDate, onSelect, taskDates, t }: {
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
  taskDates: Set<string>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthNames = [t("tasksPanel.months.jan"), t("tasksPanel.months.feb"), t("tasksPanel.months.mar"), t("tasksPanel.months.apr"), t("tasksPanel.months.may"), t("tasksPanel.months.jun"), t("tasksPanel.months.jul"), t("tasksPanel.months.aug"), t("tasksPanel.months.sep"), t("tasksPanel.months.oct"), t("tasksPanel.months.nov"), t("tasksPanel.months.dec")];
  const dayNames = [t("tasksPanel.days.su"), t("tasksPanel.days.mo"), t("tasksPanel.days.tu"), t("tasksPanel.days.we"), t("tasksPanel.days.th"), t("tasksPanel.days.fr"), t("tasksPanel.days.sa")];

  const prevMonth = () => {
    setViewMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  };
  const nextMonth = () => {
    setViewMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-muted/30 rounded-xl border border-border/50 p-3" data-testid="mini-calendar">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors" data-testid="calendar-prev">
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <span className="text-xs font-medium text-foreground">
          {monthNames[viewMonth.month]} {viewMonth.year}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors" data-testid="calendar-next">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] text-muted-foreground/60 font-medium py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const hasTask = taskDates.has(dateStr);

          return (
            <button
              key={day}
              onClick={() => onSelect(isSelected ? null : dateStr)}
              className={`w-full aspect-square rounded-md text-[11px] flex flex-col items-center justify-center transition-all relative ${
                isSelected
                  ? "bg-blue-500 text-white font-bold"
                  : isToday
                    ? "bg-blue-500/20 text-blue-400 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              data-testid={`calendar-day-${day}`}
            >
              {day}
              {hasTask && !isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-violet-400" />
              )}
            </button>
          );
        })}
      </div>
      {selectedDate && (
        <button
          onClick={() => onSelect(null)}
          className="w-full mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          data-testid="calendar-clear"
        >
          {t("tasksPanel.clearDate")}
        </button>
      )}
    </div>
  );
}

function TimePicker({ selectedDate, selectedTime, onTimeChange, t }: {
  selectedDate: string | null;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (!selectedDate) return null;

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const [selectedHour, selectedMinute] = selectedTime.split(":") as [string, string];

  return (
    <div className="flex items-center gap-2 px-1 py-2" data-testid="time-picker">
      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-[10px] text-muted-foreground shrink-0">{t("tasksPanel.time") || "Saat"}</span>
      <div className="flex items-center gap-1 flex-1">
        <select
          value={selectedHour}
          onChange={e => onTimeChange(`${e.target.value}:${selectedMinute}`)}
          className="flex-1 h-7 text-xs bg-muted/50 border border-border/50 rounded-md px-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          data-testid="select-hour"
        >
          {hours.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">:</span>
        <select
          value={selectedMinute}
          onChange={e => onTimeChange(`${selectedHour}:${e.target.value}`)}
          className="flex-1 h-7 text-xs bg-muted/50 border border-border/50 rounded-md px-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          data-testid="select-minute"
        >
          {minutes.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function TasksPanel({ agentType, agentColor, onClose }: {
  agentType: string;
  agentColor: string;
  onClose: () => void;
}) {
  const { t } = useTranslation("pages");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [project, setProject] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState("09:00");
  const [filter, setFilter] = useState<string>("all");

  const { data: tasks = [], isLoading } = useQuery<AgentTask[]>({
    queryKey: ["/api/agent-tasks", agentType],
    queryFn: async () => {
      const res = await fetch(`/api/agent-tasks?agentType=${agentType}`);
      return res.json();
    },
  });

  const buildDueDateWithTime = (date: string | null, time: string): string | null => {
    if (!date) return null;
    return `${date}T${time}:00`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; agentType: string; priority: string; project: string; dueDate: string | null }) => {
      const res = await apiRequest("POST", "/api/agent-tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-tasks", agentType] });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setProject("");
      setDueDate(null);
      setDueTime("09:00");
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; status?: string }) => {
      const res = await apiRequest("PATCH", `/api/agent-tasks/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-tasks", agentType] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/agent-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-tasks", agentType] });
    },
  });

  const taskDates = new Set(
    tasks
      .filter(t => t.dueDate)
      .map(t => {
        const d = new Date(t.dueDate!);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
  );

  const filteredTasks = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  const statusCycle = (current: string) => {
    if (current === "todo") return "in-progress";
    if (current === "in-progress") return "done";
    return "todo";
  };

  const projects = [...new Set(tasks.map(t => t.project).filter(Boolean))];

  const formatDueDate = (dueDate: string | Date | null | undefined): string | null => {
    if (!dueDate) return null;
    const d = new Date(dueDate);
    const month = d.toLocaleDateString(undefined, { month: "short" });
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const hasTime = hours !== 0 || minutes !== 0;
    if (hasTime) {
      return `${day} ${month} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    return `${day} ${month}`;
  };

  return (
    <div className="flex flex-col bg-background lg:bg-card/50 border-t lg:border-t-0 lg:border-l border-border/50 w-full fixed bottom-0 left-0 right-0 h-[60vh] lg:h-full lg:w-[320px] shrink-0 lg:relative lg:inset-auto z-[60] lg:z-auto rounded-t-2xl lg:rounded-none shadow-2xl lg:shadow-none" data-testid="tasks-panel">
      <div className="p-3 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{t("tasksPanel.projectsTasks")}</h3>
          <Badge variant="secondary" className="text-[10px] h-5">{tasks.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowForm(!showForm)}
            data-testid="button-add-task"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            data-testid="button-close-tasks"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {showForm && (
          <div className="p-3 border-b border-border/50 space-y-2" data-testid="task-form">
            <Input
              placeholder={t("tasksPanel.taskTitle")}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-8 text-xs"
              data-testid="input-task-title"
            />
            <Input
              placeholder={t("tasksPanel.descriptionOptional")}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="h-8 text-xs"
              data-testid="input-task-description"
            />
            <Input
              placeholder={t("tasksPanel.projectOptional")}
              value={project}
              onChange={e => setProject(e.target.value)}
              className="h-8 text-xs"
              data-testid="input-task-project"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{t("tasksPanel.priority")}</span>
              {["low", "medium", "high", "urgent"].map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    priority === p
                      ? "border-blue-500/50 bg-blue-500/10 text-foreground"
                      : "border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`priority-${p}`}
                >
                  {t("tasksPanel.priorities." + p)}
                </button>
              ))}
            </div>

            <MiniCalendar
              selectedDate={dueDate}
              onSelect={setDueDate}
              taskDates={taskDates}
              t={t}
            />

            <TimePicker
              selectedDate={dueDate}
              selectedTime={dueTime}
              onTimeChange={setDueTime}
              t={t}
            />

            <div className="flex gap-1.5">
              <Button
                size="sm"
                className={`flex-1 h-7 text-xs bg-gradient-to-r ${agentColor} text-white`}
                disabled={!title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  title,
                  description,
                  agentType,
                  priority,
                  project,
                  dueDate: buildDueDateWithTime(dueDate, dueTime),
                })}
                data-testid="button-save-task"
              >
                {createMutation.isPending ? t("tasksPanel.saving") : t("tasksPanel.addTask")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setShowForm(false)}
              >
                {t("tasksPanel.cancel")}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 p-2 border-b border-border/50">
          {["all", "todo", "in-progress", "done"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-1 rounded-md transition-all ${
                filter === f
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`filter-${f}`}
            >
              {f === "all" ? t("tasksPanel.all") : f === "todo" ? t("tasksPanel.toDo") : f === "in-progress" ? t("tasksPanel.inProgress") : t("tasksPanel.done")}
            </button>
          ))}
        </div>

        {projects.length > 0 && (
          <div className="px-3 py-1.5 border-b border-border/50 flex flex-wrap gap-1">
            {projects.map(p => (
              <Badge key={p} variant="secondary" className="text-[10px] h-4">{p}</Badge>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">{t("tasksPanel.loading")}</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-6 text-center">
            <ListTodo className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">{t("tasksPanel.noTasks")}</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
              data-testid="button-create-first-task"
            >
              {t("tasksPanel.createFirst")}
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {(filter === "all" ? ["todo", "in-progress", "done"] : [filter]).map(statusKey => {
              const groupTasks = filteredTasks.filter(t => t.status === statusKey);
              if (groupTasks.length === 0 && filter === "all") return null;
              const groupConf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.todo;
              const GroupIcon = groupConf.icon;

              return (
                <div key={statusKey} className="mb-1" data-testid={`task-group-${statusKey}`}>
                  {filter === "all" && (
                    <div className={`flex items-center gap-2 px-3 py-2 ${groupConf.bgColor} border-y ${groupConf.borderColor} sticky top-0 z-10`}>
                      <GroupIcon className={`w-3.5 h-3.5 ${groupConf.color} shrink-0`} />
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${groupConf.color} flex-1`}>{t(groupConf.labelKey)}</span>
                      <span className={`text-[10px] font-semibold ${groupConf.color} opacity-60`}>{groupTasks.length}</span>
                    </div>
                  )}
                  {groupTasks.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-muted-foreground/50 italic">{t("tasksPanel.noTasksInGroup")}</div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {groupTasks.map(task => {
                        const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                        const StatusIcon = statusConf.icon;
                        const dueDateStr = formatDueDate(task.dueDate);
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

                        return (
                          <div key={task.id} className="px-3 py-2.5 hover:bg-muted/20 transition-colors group" data-testid={`task-item-${task.id}`}>
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => updateMutation.mutate({ id: task.id, status: statusCycle(task.status) })}
                                className={`mt-0.5 shrink-0 ${statusConf.color} hover:scale-110 transition-transform`}
                                title={t("tasksPanel.markAs", { status: statusCycle(task.status) })}
                                data-testid={`button-toggle-status-${task.id}`}
                              >
                                <StatusIcon className="w-4 h-4" />
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold leading-tight truncate ${task.status === "done" ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-1 leading-relaxed">{task.description}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {task.project && (
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0 max-w-[80px] truncate">{task.project}</Badge>
                                  )}
                                  <span className={`text-[10px] flex items-center gap-0.5 shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                                    <Flag className="w-2.5 h-2.5" />
                                    {t("tasksPanel.priorities." + task.priority)}
                                  </span>
                                  {dueDateStr && (
                                    <span className={`text-[10px] flex items-center gap-0.5 shrink-0 font-medium ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
                                      <Calendar className="w-2.5 h-2.5" />
                                      {dueDateStr}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteMutation.mutate(task.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all shrink-0 mt-0.5"
                                data-testid={`button-delete-task-${task.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
