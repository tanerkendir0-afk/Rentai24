interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

interface HeartbeatInfo {
  status: "healthy" | "degraded" | "down";
  lastCheck: number;
  responseTimeMs: number;
}

interface AgentStatus {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  heartbeat?: HeartbeatInfo;
}

class CircuitBreaker {
  private circuits: Map<string, CircuitState> = new Map();
  private heartbeats: Map<string, HeartbeatInfo> = new Map();
  private readonly maxFailures = 3;
  private readonly resetTimeout = 5 * 60 * 1000;

  recordFailure(agentId: string): void {
    const state = this.circuits.get(agentId) || { failures: 0, lastFailure: 0, isOpen: false };
    state.failures++;
    state.lastFailure = Date.now();
    if (state.failures >= this.maxFailures) {
      state.isOpen = true;
      console.warn(`[CIRCUIT BREAKER] ${agentId} devre dışı bırakıldı (${state.failures} ardışık hata)`);
    }
    this.circuits.set(agentId, state);
  }

  recordSuccess(agentId: string): void {
    this.circuits.set(agentId, { failures: 0, lastFailure: 0, isOpen: false });
  }

  isAvailable(agentId: string): boolean {
    const state = this.circuits.get(agentId);
    if (!state || !state.isOpen) return true;
    if (Date.now() - state.lastFailure > this.resetTimeout) {
      state.isOpen = false;
      state.failures = 0;
      return true;
    }
    return false;
  }

  setHeartbeatStatus(agentId: string, status: HeartbeatInfo["status"], responseTimeMs: number): void {
    this.heartbeats.set(agentId, {
      status,
      lastCheck: Date.now(),
      responseTimeMs,
    });
  }

  getStatus(): Record<string, AgentStatus> {
    const result: Record<string, AgentStatus> = {};
    const allKeys = new Set([...this.circuits.keys(), ...this.heartbeats.keys()]);
    for (const key of allKeys) {
      const circuit = this.circuits.get(key) || { failures: 0, lastFailure: 0, isOpen: false };
      const heartbeat = this.heartbeats.get(key);
      result[key] = {
        ...circuit,
        ...(heartbeat ? { heartbeat } : {}),
      };
    }
    return result;
  }
}

export const circuitBreaker = new CircuitBreaker();
