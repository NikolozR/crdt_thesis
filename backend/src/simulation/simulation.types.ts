export type CrdtType = 'or-set' | '2p-set' | 'lww-register' | 'mv-register' | 'pw-set';

/** CRDTs that use add/remove local operations (set family). */
export const SET_CRDT_TYPES: readonly CrdtType[] = ['or-set', '2p-set', 'pw-set'];

/** CRDTs that use `set` local operations (register family). */
export const REGISTER_CRDT_TYPES: readonly CrdtType[] = [
  'lww-register',
  'mv-register',
];

export type NodeId = 'Node-A' | 'Node-B' | 'Node-C';

export interface OrSetAddOperation {
  readonly type: 'add';
  readonly value: string;
}

export interface OrSetRemoveOperation {
  readonly type: 'remove';
  readonly value: string;
}

export type OrSetLocalOperation = OrSetAddOperation | OrSetRemoveOperation;

export interface LwwSetOperation {
  readonly type: 'set';
  readonly value: string;
}

export type LwwLocalOperation = LwwSetOperation;

/**
 * Priority-Wins Set operation. The `weight` encodes the authority of the actor
 * (e.g. admin = 100, regular user = 10). Higher weight wins on conflict.
 */
export interface PwSetAddOperation {
  readonly type: 'add';
  readonly value: string;
  readonly weight: number;
}

export interface PwSetRemoveOperation {
  readonly type: 'remove';
  readonly value: string;
  readonly weight: number;
}

export type PwSetLocalOperation = PwSetAddOperation | PwSetRemoveOperation;

export type NodeOperation = OrSetLocalOperation | LwwLocalOperation | PwSetLocalOperation;

export function isSetFamilyCrdt(type: CrdtType): boolean {
  return (SET_CRDT_TYPES as readonly string[]).includes(type);
}

export function isRegisterFamilyCrdt(type: CrdtType): boolean {
  return (REGISTER_CRDT_TYPES as readonly string[]).includes(type);
}
