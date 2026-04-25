import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodeFactory } from '../node/node.factory';
import { NetworkSimulatorService } from '../network/network-simulator.service';
import { NodeService } from '../node/node.service';
import {
  CrdtType,
  NodeId,
  NodeOperation,
  isRegisterFamilyCrdt,
  isSetFamilyCrdt,
} from './simulation.types';

@Injectable()
export class SimulationService {
  private readonly nodeIds: NodeId[] = ['Node-A', 'Node-B', 'Node-C'];
  private readonly nodes = new Map<NodeId, NodeService>();
  private compare: readonly CrdtType[] | null = null;

  constructor(
    private readonly nodeFactory: NodeFactory,
    private readonly networkSimulator: NetworkSimulatorService,
  ) {}

  init(compareRaw: unknown): { nodes: NodeId[]; compare: readonly CrdtType[] } {
    const normalized = this.validateCompareList(compareRaw);
    this.nodes.clear();
    this.networkSimulator.clearNodes();
    this.compare = normalized;

    for (const nodeId of this.nodeIds) {
      const node = this.nodeFactory.create(nodeId, normalized);
      this.nodes.set(nodeId, node);
      this.networkSimulator.registerNode(node);
    }

    return {
      nodes: [...this.nodeIds],
      compare: normalized,
    };
  }

  executeNodeOperation(nodeId: NodeId, operation: NodeOperation): void {
    const node = this.nodes.get(nodeId);
    if (node === undefined) {
      throw new NotFoundException(
        `Node "${nodeId}" was not initialized. Call /simulation/init first.`,
      );
    }

    const active = node.getActiveEngineTypes();
    this.assertOperationMatchesCompareFamily(active, operation);

    node.executeLocalOperation(operation, this.nodeIds);
  }

  getState(): {
    compare: readonly CrdtType[] | null;
    network: { isPartitioned: boolean; queuedMessages: number };
    nodes: Record<string, unknown>;
  } {
    const nodeState: Record<string, unknown> = {};
    for (const [id, node] of this.nodes.entries()) {
      nodeState[id] = node.getState();
    }

    return {
      compare: this.compare,
      network: this.networkSimulator.getNetworkState(),
      nodes: nodeState,
    };
  }

  private validateCompareList(compare: unknown): CrdtType[] {
    if (!Array.isArray(compare) || compare.length === 0) {
      throw new BadRequestException(
        'compare must be a non-empty array of CRDT ids, e.g. ["or-set","2p-set"].',
      );
    }

    const allowed: readonly CrdtType[] = [
      'or-set',
      '2p-set',
      'lww-register',
      'mv-register',
    ];
    const seen = new Set<CrdtType>();
    const unique: CrdtType[] = [];

    for (const raw of compare) {
      if (typeof raw !== 'string') {
        throw new BadRequestException('compare must contain only string CRDT ids.');
      }

      if (!allowed.includes(raw as CrdtType)) {
        throw new BadRequestException(
          `Invalid CRDT "${raw}". Allowed: ${allowed.join(', ')}.`,
        );
      }

      const typed = raw as CrdtType;

      if (seen.has(typed)) {
        throw new BadRequestException(`Duplicate CRDT in compare: "${typed}".`);
      }

      seen.add(typed);
      unique.push(typed);
    }

    const first = unique[0];
    const familySet = isSetFamilyCrdt(first);
    const familyReg = isRegisterFamilyCrdt(first);
    if (!familySet && !familyReg) {
      throw new BadRequestException('Invalid compare list.');
    }

    for (const t of unique) {
      if (familySet && !isSetFamilyCrdt(t)) {
        throw new BadRequestException(
          'compare must be either all set CRDTs (or-set, 2p-set) or all register CRDTs (lww-register, mv-register), not mixed.',
        );
      }

      if (familyReg && !isRegisterFamilyCrdt(t)) {
        throw new BadRequestException(
          'compare must be either all set CRDTs (or-set, 2p-set) or all register CRDTs (lww-register, mv-register), not mixed.',
        );
      }
    }

    return unique;
  }

  private assertOperationMatchesCompareFamily(
    activeEngines: CrdtType[],
    operation: NodeOperation,
  ): void {
    if (activeEngines.length === 0) {
      throw new BadRequestException('No active engines on this node.');
    }

    const sample = activeEngines[0];
    const expectSet = isSetFamilyCrdt(sample);

    if (expectSet && operation.type === 'set') {
      throw new BadRequestException(
        'This run compares set CRDTs; use add/remove operations, not set.',
      );
    }

    if (!expectSet && (operation.type === 'add' || operation.type === 'remove')) {
      throw new BadRequestException(
        'This run compares register CRDTs; use set operations, not add/remove.',
      );
    }
  }
}
