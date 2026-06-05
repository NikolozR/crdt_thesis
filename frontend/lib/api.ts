import {
  CrdtType,
  NodeId,
  NodeOperation,
  SimulationState,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class SimulationResetError extends Error {
  constructor() {
    super('Backend restarted and lost simulation state. Please re-initialize.');
    this.name = 'SimulationResetError';
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404 && body.includes('not initialized')) {
      throw new SimulationResetError();
    }
    throw new Error(`${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  init(compare: CrdtType[]) {
    return request<{ message: string; nodes: NodeId[]; compare: CrdtType[] }>(
      '/simulation/init',
      { method: 'POST', body: JSON.stringify({ compare }) },
    );
  },

  partition() {
    return request<{ message: string }>('/network/partition', {
      method: 'POST',
    });
  },

  reconnect() {
    return request<{ message: string }>('/network/reconnect', {
      method: 'POST',
    });
  },

  operate(nodeId: NodeId, operation: NodeOperation) {
    return request<{ message: string; state: SimulationState }>(
      `/node/${nodeId}/operate`,
      { method: 'POST', body: JSON.stringify({ operation }) },
    );
  },

  getState() {
    return request<SimulationState>('/simulation/state');
  },
};
