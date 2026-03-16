interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

class CircuitBreaker {
  private circuits: Map<string, CircuitState> = new Map();
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

  getStatus(): Record<string, { failures: number; lastFailure: number; isOpen: boolean }> {
    return Object.fromEntries(this.circuits);
  }
}

export const circuitBreaker = new CircuitBreaker();
