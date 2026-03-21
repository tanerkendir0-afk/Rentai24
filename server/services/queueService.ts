type TaskHandler = (payload: any) => Promise<any>;

interface QueuedTask {
  id: string;
  queue: string;
  payload: any;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retries: number;
  maxRetries: number;
}

interface QueueConfig {
  concurrency: number;
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: QueueConfig = { concurrency: 3, maxRetries: 2, retryDelayMs: 5000 };

const queues: Map<string, QueuedTask[]> = new Map();
const handlers: Map<string, TaskHandler> = new Map();
const configs: Map<string, QueueConfig> = new Map();
const runningCounts: Map<string, number> = new Map();

export function registerQueue(name: string, handler: TaskHandler, config?: Partial<QueueConfig>) {
  handlers.set(name, handler);
  configs.set(name, { ...DEFAULT_CONFIG, ...config });
  queues.set(name, []);
  runningCounts.set(name, 0);
  console.log(`[Queue] Registered queue: ${name}`);
}

export function enqueue(queueName: string, payload: any): string {
  const queue = queues.get(queueName);
  if (!queue) throw new Error(`Queue "${queueName}" not registered`);

  const config = configs.get(queueName)!;
  const task: QueuedTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queue: queueName,
    payload,
    status: "pending",
    createdAt: Date.now(),
    retries: 0,
    maxRetries: config.maxRetries,
  };

  queue.push(task);
  processQueue(queueName);
  return task.id;
}

async function processQueue(queueName: string) {
  const queue = queues.get(queueName);
  const handler = handlers.get(queueName);
  const config = configs.get(queueName);
  if (!queue || !handler || !config) return;

  const running = runningCounts.get(queueName) || 0;
  if (running >= config.concurrency) return;

  const task = queue.find(t => t.status === "pending");
  if (!task) return;

  task.status = "running";
  task.startedAt = Date.now();
  runningCounts.set(queueName, running + 1);

  try {
    task.result = await handler(task.payload);
    task.status = "completed";
    task.completedAt = Date.now();
  } catch (error: any) {
    task.retries++;
    if (task.retries < task.maxRetries) {
      task.status = "pending";
      setTimeout(() => processQueue(queueName), config.retryDelayMs);
    } else {
      task.status = "failed";
      task.error = error.message;
      task.completedAt = Date.now();
    }
  } finally {
    runningCounts.set(queueName, (runningCounts.get(queueName) || 1) - 1);
  }

  processQueue(queueName);
}

export function getQueueStatus(queueName: string): {
  pending: number;
  running: number;
  completed: number;
  failed: number;
} {
  const queue = queues.get(queueName);
  if (!queue) return { pending: 0, running: 0, completed: 0, failed: 0 };

  return {
    pending: queue.filter(t => t.status === "pending").length,
    running: queue.filter(t => t.status === "running").length,
    completed: queue.filter(t => t.status === "completed").length,
    failed: queue.filter(t => t.status === "failed").length,
  };
}

export function getTaskStatus(taskId: string): QueuedTask | null {
  for (const queue of queues.values()) {
    const task = queue.find(t => t.id === taskId);
    if (task) return task;
  }
  return null;
}

export function getAllQueuesStatus(): Record<string, ReturnType<typeof getQueueStatus>> {
  const status: Record<string, ReturnType<typeof getQueueStatus>> = {};
  for (const name of queues.keys()) {
    status[name] = getQueueStatus(name);
  }
  return status;
}

export function cleanupCompletedTasks(maxAgeMs: number = 30 * 60 * 1000) {
  const now = Date.now();
  for (const [name, queue] of queues) {
    queues.set(name, queue.filter(t =>
      t.status === "pending" || t.status === "running" ||
      (t.completedAt && now - t.completedAt < maxAgeMs)
    ));
  }
}

setInterval(() => cleanupCompletedTasks(), 10 * 60 * 1000);
