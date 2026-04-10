import { Injectable, NotFoundException } from '@nestjs/common';
import { NodeFactory } from '../node/node.factory';
import { NetworkSimulatorService } from '../network/network-simulator.service';
import { NodeService } from '../node/node.service';
import { CrdtType, NodeId, NodeOperation } from './simulation.types';

@Injectable()
export class SimulationService {
  private readonly nodeIds: NodeId[] = ['Node-A', 'Node-B', 'Node-C'];
  private readonly nodes = new Map<NodeId, NodeService>();
  private crdtType: CrdtType | null = null;

  constructor(
    private readonly nodeFactory: NodeFactory,
    private readonly networkSimulator: NetworkSimulatorService,
  ) {}

  init(crdtType: CrdtType): { nodes: NodeId[]; crdtType: CrdtType } {
    this.nodes.clear();
    this.networkSimulator.clearNodes();
    this.crdtType = crdtType;

    for (const nodeId of this.nodeIds) {
      const node = this.nodeFactory.create(nodeId, crdtType);
      this.nodes.set(nodeId, node);
      this.networkSimulator.registerNode(node);
    }

    return {
      nodes: [...this.nodeIds],
      crdtType,
    };
  }

  executeNodeOperation(nodeId: NodeId, operation: NodeOperation): void {
    const node = this.nodes.get(nodeId);
    if (node === undefined) {
      throw new NotFoundException(
        `Node "${nodeId}" was not initialized. Call /simulation/init first.`,
      );
    }

    node.executeLocalOperation(operation, this.nodeIds);
  }

  getState(): {
    crdtType: CrdtType | null;
    network: { isPartitioned: boolean; queuedMessages: number };
    nodes: Record<string, unknown>;
  } {
    const nodeState: Record<string, unknown> = {};
    for (const [id, node] of this.nodes.entries()) {
      nodeState[id] = node.getState();
    }

    return {
      crdtType: this.crdtType,
      network: this.networkSimulator.getNetworkState(),
      nodes: nodeState,
    };
  }
}
