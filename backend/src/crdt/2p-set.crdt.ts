import { ICRDT } from './crdt.interface';
import { OrSetLocalOperation } from '../simulation/simulation.types';

export interface TwoPhaseSetSyncAdd {
  readonly kind: '2p-add';
  readonly value: string;
}

export interface TwoPhaseSetSyncRemove {
  readonly kind: '2p-remove';
  readonly value: string;
}

export type TwoPhaseSetSyncPayload = TwoPhaseSetSyncAdd | TwoPhaseSetSyncRemove;

export interface TwoPhaseSetStateView {
  readonly type: '2p-set';
  readonly elements: string[];
}

export class TwoPhaseSetCrdt
  implements ICRDT<OrSetLocalOperation, TwoPhaseSetSyncPayload, TwoPhaseSetStateView>
{
  private readonly added = new Set<string>();
  private readonly removed = new Set<string>();

  applyLocalOperation(
    operation: OrSetLocalOperation,
    _actorId: string,
  ): TwoPhaseSetSyncPayload[] {
    if (operation.type === 'add') {
      if (this.removed.has(operation.value)) {
        return [];
      }

      this.added.add(operation.value);
      return [{ kind: '2p-add', value: operation.value }];
    }

    this.removed.add(operation.value);
    this.added.delete(operation.value);
    return [{ kind: '2p-remove', value: operation.value }];
  }

  merge(payload: TwoPhaseSetSyncPayload): void {
    if (payload.kind === '2p-add') {
      if (this.removed.has(payload.value)) {
        return;
      }

      this.added.add(payload.value);
      return;
    }

    this.removed.add(payload.value);
    this.added.delete(payload.value);
  }

  getStateView(): TwoPhaseSetStateView {
    return {
      type: '2p-set',
      elements: Array.from(this.added).sort(),
    };
  }
}
