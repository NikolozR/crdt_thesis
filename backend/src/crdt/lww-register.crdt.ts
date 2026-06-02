import { ICRDT } from './crdt.interface';
import { LwwLocalOperation } from '../simulation/simulation.types';

export interface LwwSyncPayload {
  readonly kind: 'set';
  readonly value: string;
  readonly timestamp: number;
  readonly actorId: string;
}

export interface LwwRegisterStateView {
  readonly type: 'lww-register';
  readonly value: string | null;
  readonly timestamp: number;
  readonly actorId: string | null;
}

export class LwwRegisterCrdt
  implements ICRDT<LwwLocalOperation, LwwSyncPayload, LwwRegisterStateView>
{
  private value: string | null = null;
  private timestamp = Number.MIN_SAFE_INTEGER;
  private actorId: string | null = null;
  private logicalClock = 0;

  applyLocalOperation(operation: LwwLocalOperation, actorId: string): LwwSyncPayload[] {
    this.logicalClock += 1;
    const payload: LwwSyncPayload = {
      kind: 'set',
      value: operation.value,
      timestamp: this.logicalClock,
      actorId,
    };

    this.merge(payload);
    return [payload];
  }

  merge(payload: LwwSyncPayload): void {
    const isNewerTimestamp = payload.timestamp > this.timestamp;
    const isSameTimeButHigherActor =
      payload.timestamp === this.timestamp &&
      (this.actorId === null || payload.actorId > this.actorId);

    if (isNewerTimestamp || isSameTimeButHigherActor) {
      this.value = payload.value;
      this.timestamp = payload.timestamp;
      this.actorId = payload.actorId;
    }

    if (payload.timestamp > this.logicalClock) {
      this.logicalClock = payload.timestamp;
    }
  }

  getStateView(): LwwRegisterStateView {
    return {
      type: 'lww-register',
      value: this.value,
      timestamp: this.timestamp,
      actorId: this.actorId,
    };
  }
}
