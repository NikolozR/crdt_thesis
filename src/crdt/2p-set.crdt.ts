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

/**
 * Two-Phase Set (2P-Set) with **remove-wins** semantics.
 *
 * Why this contrasts with OR-Set (add-wins):
 * - We keep a permanent tombstone set for removed elements.
 * - If an element was ever removed on this replica (or learned via sync),
 *   subsequent adds of that same element are ignored: **remove wins**, and the
 *   element can never reappear.
 *
 * This is a standard pedagogical CRDT for showing how policy choices (tombstone
 * permanence) change outcomes under the same add/remove operation stream.
 */
export class TwoPhaseSetCrdt
  implements ICRDT<OrSetLocalOperation, TwoPhaseSetSyncPayload, TwoPhaseSetStateView>
{
  /** Elements currently considered present (modulo tombstones). */
  private readonly added = new Set<string>();

  /** Tombstones: once removed, the value cannot be added back. */
  private readonly removed = new Set<string>();

  applyLocalOperation(
    operation: OrSetLocalOperation,
    _actorId: string,
  ): TwoPhaseSetSyncPayload[] {
    if (operation.type === 'add') {
      if (this.removed.has(operation.value)) {
        /**
         * Remove-wins: a prior remove (possibly learned during merge) blocks
         * re-insertion, unlike OR-Set where a fresh unique tag can resurrect.
         */
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
