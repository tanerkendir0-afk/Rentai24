import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { parse as parseUrl } from "url";
// @ts-ignore
import { parse as parseCookie } from "cookie";

interface WSClient {
  ws: WebSocket;
  userId: number | null;
  sessionId: string | null;
  subscribedAgents: Set<string>;
  lastPing: number;
}

const clients: Map<string, WSClient> = new Map();
let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server, sessionStore: any): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const clientId = generateClientId();
    const client: WSClient = {
      ws,
      userId: null,
      sessionId: null,
      subscribedAgents: new Set(),
      lastPing: Date.now(),
    };

    clients.set(clientId, client);

    resolveSession(req, sessionStore).then(userId => {
      client.userId = userId;
      if (userId) {
        sendToClient(ws, { type: "auth", status: "authenticated", userId });
      }
    }).catch(() => {});

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(clientId, client, msg);
      } catch {}
    });

    ws.on("pong", () => {
      client.lastPing = Date.now();
    });

    ws.on("close", () => {
      clients.delete(clientId);
    });

    ws.on("error", () => {
      clients.delete(clientId);
    });

    sendToClient(ws, { type: "connected", clientId });
  });

  const pingInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, client] of clients) {
      if (now - client.lastPing > 60_000) {
        client.ws.terminate();
        clients.delete(id);
      } else if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    }
  }, 30_000);

  wss.on("close", () => clearInterval(pingInterval));

  console.log("[WebSocket] Server initialized on /ws");
  return wss;
}

function handleMessage(clientId: string, client: WSClient, msg: any) {
  switch (msg.type) {
    case "subscribe":
      if (msg.agent) client.subscribedAgents.add(msg.agent);
      break;
    case "unsubscribe":
      if (msg.agent) client.subscribedAgents.delete(msg.agent);
      break;
    case "ping":
      sendToClient(client.ws, { type: "pong", timestamp: Date.now() });
      break;
  }
}

export function broadcastToUser(userId: number, event: any) {
  for (const client of clients.values()) {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      sendToClient(client.ws, event);
    }
  }
}

export function broadcastAgentEvent(agentType: string, event: any) {
  for (const client of clients.values()) {
    if (client.subscribedAgents.has(agentType) && client.ws.readyState === WebSocket.OPEN) {
      sendToClient(client.ws, { ...event, agent: agentType });
    }
  }
}

export function broadcastAll(event: any) {
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      sendToClient(client.ws, event);
    }
  }
}

export function notifyAgentStatus(agentType: string, status: "healthy" | "degraded" | "down") {
  broadcastAll({ type: "agent_status", agent: agentType, status, timestamp: Date.now() });
}

export function notifyNewMessage(userId: number, agentType: string, message: any) {
  broadcastToUser(userId, {
    type: "new_message",
    agent: agentType,
    message,
    timestamp: Date.now(),
  });
}

export function notifyTaskComplete(userId: number, taskType: string, result: any) {
  broadcastToUser(userId, {
    type: "task_complete",
    taskType,
    result,
    timestamp: Date.now(),
  });
}

export function getConnectedClients(): number {
  return clients.size;
}

export function getConnectedUsers(): number {
  const userIds = new Set<number>();
  for (const client of clients.values()) {
    if (client.userId) userIds.add(client.userId);
  }
  return userIds.size;
}

function sendToClient(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function generateClientId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function resolveSession(req: IncomingMessage, sessionStore: any): Promise<number | null> {
  try {
    const cookies = parseCookie(req.headers.cookie || "");
    const sid = cookies["connect.sid"];
    if (!sid) return null;

    const sessionId = decodeURIComponent(sid).replace(/^s:/, "").split(".")[0];

    return new Promise((resolve) => {
      sessionStore.get(sessionId, (err: any, session: any) => {
        if (err || !session?.passport?.user) {
          resolve(null);
        } else {
          resolve(session.passport.user);
        }
      });
    });
  } catch {
    return null;
  }
}

export { wss };
