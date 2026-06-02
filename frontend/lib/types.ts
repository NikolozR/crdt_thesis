export type CrdtType = 'or-set' | '2p-set' | 'lww-register' | 'mv-register' | 'pw-set';
export type NodeId = 'Node-A' | 'Node-B' | 'Node-C';
export type CrdtFamily = 'set' | 'register';

export const SET_CRDTS: CrdtType[] = ['or-set', '2p-set'];
export const REGISTER_CRDTS: CrdtType[] = ['lww-register', 'mv-register'];

/**
 * weight is only meaningful for pw-set operations.
 * Other engines receive it as an extra field and ignore it.
 */
export type NodeOperation =
  | { type: 'add'; value: string; weight?: number }
  | { type: 'remove'; value: string; weight?: number }
  | { type: 'set'; value: string };

export interface LwwRegisterState {
  value: string | null;
  timestamp: number;
  actorId: string | null;
}

/** Per-node state keyed by engine id. */
export type NodeState = {
  'or-set'?: string[];
  '2p-set'?: string[];
  'pw-set'?: string[];
  'lww-register'?: LwwRegisterState;
  'mv-register'?: string[];
};

export interface NetworkState {
  isPartitioned: boolean;
  queuedMessages: number;
}

export interface SimulationState {
  compare: CrdtType[] | null;
  network: NetworkState;
  nodes: Record<NodeId, NodeState>;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  kind: 'init' | 'partition' | 'reconnect' | 'operate' | 'error';
  label: string;
}
