import {
  CrdtType,
  NodeId,
  NodeOperation,
  SimulationState,
} from './types';

const BASE = 'http://localhost:3000';

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
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
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
