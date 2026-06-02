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

export class PwSetCrdt
  implements ICRDT<PwSetLocalOperation, PwSetSyncPayload, PwSetStateView>
{
  private readonly addWeights = new Map<string, number>();
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
      const current = this.addWeights.get(payload.value) ?? Number.NEGATIVE_INFINITY;
      this.addWeights.set(payload.value, Math.max(current, payload.weight));
    } else {
      const current = this.removeWeights.get(payload.value) ?? Number.NEGATIVE_INFINITY;
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
      const addW = this.addWeights.get(value) ?? Number.NEGATIVE_INFINITY;
      const removeW = this.removeWeights.get(value) ?? Number.NEGATIVE_INFINITY;
      if (addW > removeW) {
        elements.push(value);
      }
    }

    return { type: 'pw-set', elements: elements.sort() };
  }
}
