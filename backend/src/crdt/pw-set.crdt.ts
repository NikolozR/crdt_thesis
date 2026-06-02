import { ICRDT } from './crdt.interface';
import { PwSetLocalOperation } from '../simulation/simulation.types';

export interface PwSetSyncPayload {
  readonly kind: 'pw-add' | 'pw-remove';
  readonly value: string;
  readonly weight: number;
}

export interface PwSetStateView {
  readonly type: 'pw-set';
  readonly elements: string[];
}

/**
 * Priority-Wins Set (PW-Set) — a custom CRDT that resolves concurrent add/remove
 * conflicts using application-level weights rather than structural causality (OR-Set)
 * or permanent tombstones (2P-Set).
 *
 * Semantics:
 * - Every add and remove carries a numeric `weight` (e.g. admin = 100, user = 10).
 * - Each replica tracks the maximum weight ever observed for an add and for a remove
 *   of each value independently.
 * - An element is present iff its maximum-observed add-weight is strictly greater
 *   than its maximum-observed remove-weight.
 *
 * CRDT correctness:
 * - Merge = max(currentWeight, incomingWeight) for both maps.
 *   max is commutative, associative, and idempotent → all three CRDT properties hold.
 *
 * What this achieves that OR-Set and 2P-Set cannot:
 * - A high-weight (admin) remove beats a low-weight (user) add → content moderation.
 * - A high-weight (admin) add survives a low-weight (user) remove → protected content.
 * - Unlike 2P-Set, removal is NOT permanent: a higher-weight add later can win.
 * - Unlike OR-Set, a low-weight add cannot survive a high-weight remove.
 */
export class PwSetCrdt
  implements ICRDT<PwSetLocalOperation, PwSetSyncPayload, PwSetStateView>
{
  /** Highest add-weight seen per value. */
  private readonly addWeights = new Map<string, number>();
  /** Highest remove-weight seen per value. */
  private readonly removeWeights = new Map<string, number>();

  applyLocalOperation(
    operation: PwSetLocalOperation,
    _actorId: string,
  ): PwSetSyncPayload[] {
    const payload: PwSetSyncPayload = {
      kind: operation.type === 'add' ? 'pw-add' : 'pw-remove',
      value: operation.value,
      weight: operation.weight,
    };
    this.merge(payload);
    return [payload];
  }

  merge(payload: PwSetSyncPayload): void {
    if (payload.kind === 'pw-add') {
      const current = this.addWeights.get(payload.value) ?? 0;
      this.addWeights.set(payload.value, Math.max(current, payload.weight));
    } else {
      const current = this.removeWeights.get(payload.value) ?? 0;
      this.removeWeights.set(payload.value, Math.max(current, payload.weight));
    }
  }

  getStateView(): PwSetStateView {
    const allValues = new Set([
      ...this.addWeights.keys(),
      ...this.removeWeights.keys(),
    ]);

    const elements: string[] = [];
    for (const value of allValues) {
      const addW = this.addWeights.get(value) ?? 0;
      const removeW = this.removeWeights.get(value) ?? 0;
      if (addW > removeW) {
        elements.push(value);
      }
    }

    return { type: 'pw-set', elements: elements.sort() };
  }
}
