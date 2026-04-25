import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CrdtType,
  NodeId,
  NodeOperation,
  isRegisterFamilyCrdt,
  isSetFamilyCrdt,
} from '../simulation/simulation.types';
import { SupportedCrdtInstance } from '../crdt/crdt.factory';
import { LwwRegisterStateView } from '../crdt/lww-register.crdt';
import { MvRegisterStateView } from '../crdt/mv-register.crdt';
import { OrSetStateView } from '../crdt/or-set.crdt';
import { TwoPhaseSetStateView } from '../crdt/2p-set.crdt';

export interface NodeSyncMessage {
  readonly fromNodeId: NodeId;
  readonly toNodeIds: NodeId[];
  readonly crdtType: CrdtType;
  readonly payload: unknown;
}

/**
 * Represents one virtual replica in the simulation.
 *
 * Side-by-side engines:
 * - The same user operation (add/remove or set) is applied to every *compatible*
 *   active engine so semantics diverge only inside merge rules.
 * - Sync traffic remains one `sync.message` per engine payload (`crdtType` tags
 *   which replica implementation the payload belongs to). Peers apply a
 *   payload only to the matching engine — wire formats differ per CRDT.
 */
export class NodeService {
  private readonly engines = new Map<CrdtType, SupportedCrdtInstance>();

  constructor(
    private readonly nodeId: NodeId,
    engineTypes: readonly CrdtType[],
    enginesByType: ReadonlyMap<CrdtType, SupportedCrdtInstance>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    for (const t of engineTypes) {
      const instance = enginesByType.get(t);
      if (instance === undefined) {
        throw new Error(`Missing CRDT engine instance for "${t}"`);
      }

      this.engines.set(t, instance);
    }
  }

  getId(): NodeId {
    return this.nodeId;
  }

  getActiveEngineTypes(): CrdtType[] {
    return Array.from(this.engines.keys());
  }

  executeLocalOperation(operation: NodeOperation, allNodeIds: NodeId[]): void {
    const targets = allNodeIds.filter((id) => id !== this.nodeId);

    for (const [engineId, engine] of this.engines) {
      if (!this.engineHandlesOperation(engineId, operation)) {
        continue;
      }

      const generatedPayloads = engine.applyLocalOperation(
        operation as never,
        this.nodeId,
      );

      for (const payload of generatedPayloads) {
        const message: NodeSyncMessage = {
          fromNodeId: this.nodeId,
          toNodeIds: targets,
          crdtType: engineId,
          payload,
        };

        this.eventEmitter.emit('sync.message', message);
      }
    }
  }

  /**
   * Delivers the same bus message to every engine; each engine merges only if
   * `message.crdtType` matches its id (payload schemas are per implementation).
   */
  receiveSyncMessage(message: NodeSyncMessage): void {
    for (const [engineId, engine] of this.engines) {
      if (message.crdtType !== engineId) {
        continue;
      }

      engine.merge(message.payload as never);
    }
  }

  /**
   * Per-engine snapshots for thesis comparison (flattened where helpful).
   */
  getState(): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    for (const [engineId, engine] of this.engines) {
      const view = engine.getStateView() as
        | OrSetStateView
        | TwoPhaseSetStateView
        | LwwRegisterStateView
        | MvRegisterStateView;

      if (engineId === 'or-set' || engineId === '2p-set') {
        out[engineId] = (view as OrSetStateView | TwoPhaseSetStateView).elements;
      } else if (engineId === 'lww-register') {
        const v = view as LwwRegisterStateView;
        out[engineId] = {
          value: v.value,
          timestamp: v.timestamp,
          actorId: v.actorId,
        };
      } else {
        const v = view as MvRegisterStateView;
        out[engineId] = v.values;
      }
    }

    return out;
  }

  private engineHandlesOperation(
    engineId: CrdtType,
    operation: NodeOperation,
  ): boolean {
    if (operation.type === 'set') {
      return isRegisterFamilyCrdt(engineId);
    }

    return isSetFamilyCrdt(engineId);
  }
}
