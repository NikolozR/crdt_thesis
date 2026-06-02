import { EventEmitter2 } from 'eventemitter2';
import { CrdtFactory } from '../crdt/crdt.factory';
import { NetworkSimulatorService } from '../network/network-simulator.service';
import { NodeFactory } from '../node/node.factory';
import { NodeService, NodeSyncMessage } from '../node/node.service';
import { CrdtType, NodeId, NodeOperation } from '../simulation/simulation.types';

const ALL_NODE_IDS: NodeId[] = ['Node-A', 'Node-B', 'Node-C'];

export class SimulationHarness {
  private readonly network: NetworkSimulatorService;
  private readonly nodes = new Map<NodeId, NodeService>();

  constructor(crdtTypes: readonly CrdtType[]) {
    const emitter = new EventEmitter2();
    this.network = new NetworkSimulatorService();

    emitter.on('sync.message', (msg: NodeSyncMessage) =>
      this.network.onSyncMessage(msg),
    );

    const crdtFactory = new CrdtFactory();
    const nodeFactory = new NodeFactory(emitter as never, crdtFactory);

    for (const nodeId of ALL_NODE_IDS) {
      const node = nodeFactory.create(nodeId, crdtTypes);
      this.nodes.set(nodeId, node);
      this.network.registerNode(node);
    }
  }

  partition(): void {
    this.network.setPartitioned(true);
  }

  reconnect(): void {
    this.network.reconnect();
  }

  operate(nodeId: NodeId, operation: NodeOperation): void {
    const node = this.nodes.get(nodeId);
    if (node === undefined) throw new Error(`Unknown node: ${nodeId}`);
    node.executeLocalOperation(operation, ALL_NODE_IDS);
  }

  snapshot(): Record<NodeId, Record<string, unknown>> {
    const out = {} as Record<NodeId, Record<string, unknown>>;
    for (const [id, node] of this.nodes) {
      out[id] = node.getState();
    }
    return JSON.parse(JSON.stringify(out)) as Record<
      NodeId,
      Record<string, unknown>
    >;
  }

  networkState(): { isPartitioned: boolean; queuedMessages: number } {
    return this.network.getNetworkState();
  }
}
