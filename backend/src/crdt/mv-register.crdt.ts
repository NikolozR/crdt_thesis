import { ICRDT } from './crdt.interface';
import { LwwLocalOperation } from '../simulation/simulation.types';

export interface MvRegisterSyncPayload {
  readonly kind: 'mv-set';
  readonly lamport: number;
  readonly actorId: string;
  readonly value: string;
}

export interface MvRegisterStateView {
  readonly type: 'mv-register';
  readonly values: string[];
  readonly lamport: number;
}

export class MvRegisterCrdt
  implements ICRDT<LwwLocalOperation, MvRegisterSyncPayload, MvRegisterStateView>
{
  private clock = 0;

  private readonly seen = new Set<string>();

  private readonly events: MvRegisterSyncPayload[] = [];

  applyLocalOperation(
    operation: LwwLocalOperation,
    actorId: string,
  ): MvRegisterSyncPayload[] {
    this.clock += 1;
    const payload: MvRegisterSyncPayload = {
      kind: 'mv-set',
      lamport: this.clock,
      actorId,
      value: operation.value,
    };

    this.ingest(payload);
    return [payload];
  }

  merge(payload: MvRegisterSyncPayload): void {
    this.ingest(payload);
  }

  private ingest(payload: MvRegisterSyncPayload): void {
    const key = `${payload.lamport}|${payload.actorId}|${payload.value}`;
    if (this.seen.has(key)) {
      return;
    }

    this.seen.add(key);
    this.events.push(payload);
    this.clock = Math.max(this.clock, payload.lamport);
  }

  getStateView(): MvRegisterStateView {
    if (this.events.length === 0) {
      return { type: 'mv-register', values: [], lamport: 0 };
    }

    const maxLamport = this.events.reduce((m, e) => Math.max(m, e.lamport), 0);
    const atMax = this.events.filter((e) => e.lamport === maxLamport);
    const values = Array.from(new Set(atMax.map((e) => e.value))).sort();

    return {
      type: 'mv-register',
      values,
      lamport: maxLamport,
    };
  }
}
