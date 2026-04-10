import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrdtType, NodeId, NodeOperation } from '../simulation/simulation.types';
import { SupportedCrdtInstance } from '../crdt/crdt.factory';

export interface NodeSyncMessage {
  readonly fromNodeId: NodeId;
  readonly toNodeIds: NodeId[];
  readonly crdtType: CrdtType;
  readonly payload: unknown;
}

/**
 * Represents one virtual replica in the simulation.
 *
 * Important architectural choice:
 * - This is intentionally not a singleton Nest provider.
 * - We create one instance per virtual node (A/B/C) so each replica holds
 *   independent local state, mirroring real distributed processes.
 */
export class NodeService {
  constructor(
    private readonly nodeId: NodeId,
    private readonly crdtType: CrdtType,
    private readonly crdt: SupportedCrdtInstance,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getId(): NodeId {
    return this.nodeId;
  }

  executeLocalOperation(operation: NodeOperation, allNodeIds: NodeId[]): void {
    const generatedPayloads = this.crdt.applyLocalOperation(operation as never, this.nodeId);
    const targets = allNodeIds.filter((id) => id !== this.nodeId);

    for (const payload of generatedPayloads) {
      const message: NodeSyncMessage = {
        fromNodeId: this.nodeId,
        toNodeIds: targets,
        crdtType: this.crdtType,
        payload,
      };

      /**
       * We emit and decouple from transport details.
       * The node is unaware whether the network is healthy or partitioned;
       * that concern belongs to NetworkSimulatorService.
       */
      this.eventEmitter.emit('sync.message', message);
    }
  }

  receiveSyncMessage(message: NodeSyncMessage): void {
    this.crdt.merge(message.payload as never);
  }

  getState(): unknown {
    return this.crdt.getStateView();
  }
}
