export type CrdtType = 'or-set' | 'lww-register';

export type NodeId = 'Node-A' | 'Node-B' | 'Node-C';

export interface BaseSyncMessage {
  readonly fromNodeId: NodeId;
  readonly toNodeIds: NodeId[];
  readonly crdtType: CrdtType;
}

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

export type NodeOperation = OrSetLocalOperation | LwwLocalOperation;
