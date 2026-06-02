import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NodeId } from '../simulation/simulation.types';
import { NodeService, NodeSyncMessage } from '../node/node.service';

/**
 * Central in-memory router for the simulation.
 *
 * Why this design is useful academically:
 * - It isolates "network behavior" from CRDT behavior.
 * - You can toggle partitions deterministically and observe impact.
 * - The queued-message buffer explicitly models delayed delivery
 *   and replay during a healing/merge phase.
 */
@Injectable()
export class NetworkSimulatorService {
  private readonly nodes = new Map<NodeId, NodeService>();
  private readonly queuedMessages: NodeSyncMessage[] = [];
  private isPartitioned = false;

  registerNode(node: NodeService): void {
    this.nodes.set(node.getId(), node);
  }

  clearNodes(): void {
    this.nodes.clear();
    this.queuedMessages.length = 0;
    this.isPartitioned = false;
  }

  setPartitioned(isPartitioned: boolean): void {
    this.isPartitioned = isPartitioned;
  }

  getNetworkState(): { isPartitioned: boolean; queuedMessages: number } {
    return {
      isPartitioned: this.isPartitioned,
      queuedMessages: this.queuedMessages.length,
    };
  }

  @OnEvent('sync.message')
  onSyncMessage(message: NodeSyncMessage): void {
    if (this.isPartitioned) {
      /**
       * During partition we retain messages in FIFO order.
       * FIFO is not mandatory for CRDT correctness in general, but keeping
       * deterministic replay order makes debugging and thesis demos clearer.
       */
      this.queuedMessages.push(message);
      return;
    }

    this.deliverMessage(message);
  }

  reconnect(): void {
    this.isPartitioned = false;

    while (this.queuedMessages.length > 0) {
      const message = this.queuedMessages.shift();
      if (message !== undefined) {
        this.deliverMessage(message);
      }
    }
  }

  private deliverMessage(message: NodeSyncMessage): void {
    for (const targetNodeId of message.toNodeIds) {
      const targetNode = this.nodes.get(targetNodeId);
      if (targetNode === undefined) {
        throw new NotFoundException(`Target node "${targetNodeId}" is not registered`);
      }

      targetNode.receiveSyncMessage(message);
    }
  }
}
