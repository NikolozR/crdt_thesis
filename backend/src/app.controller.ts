import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NetworkSimulatorService } from './network/network-simulator.service';
import { SimulationService } from './simulation/simulation.service';
import { CrdtType, NodeId, NodeOperation } from './simulation/simulation.types';

class InitSimulationBody {
  /**
   * CRDT engines to run side-by-side on every virtual node (same operations,
   * same sync traffic, different merge semantics).
   */
  @ApiProperty({
    type: [String],
    enum: ['or-set', '2p-set', 'lww-register', 'mv-register'],
    example: ['or-set', '2p-set'],
  })
  readonly compare!: CrdtType[];
}

class OperateNodeBody {
  /**
   * Operation is intentionally polymorphic: set runs use `{ type: "set" }`;
   * set-CRDT comparisons use `{ type: "add" | "remove" }`.
   */
  @ApiProperty({
    oneOf: [
      {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['add'] },
          value: { type: 'string', example: 'Apple' },
        },
        required: ['type', 'value'],
      },
      {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['remove'] },
          value: { type: 'string', example: 'Apple' },
        },
        required: ['type', 'value'],
      },
      {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['set'] },
          value: { type: 'string', example: 'Version-2' },
        },
        required: ['type', 'value'],
      },
    ],
  })
  readonly operation!: NodeOperation;
}

@ApiTags('simulation')
@Controller()
export class AppController {
  constructor(
    private readonly simulationService: SimulationService,
    private readonly networkSimulator: NetworkSimulatorService,
  ) {}

  @ApiOperation({
    summary: 'Initialize 3 virtual nodes with side-by-side CRDT engines',
  })
  @ApiBody({
    type: InitSimulationBody,
    examples: {
      orVs2p: {
        summary: 'Compare OR-Set (add-wins) vs 2P-Set (remove-wins)',
        value: { compare: ['or-set', '2p-set'] },
      },
      lwwVsMv: {
        summary: 'Compare LWW vs MV register under concurrent writes',
        value: { compare: ['lww-register', 'mv-register'] },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Simulation initialized' })
  @Post('simulation/init')
  initSimulation(@Body() body: InitSimulationBody): unknown {
    if (!Array.isArray(body.compare)) {
      throw new BadRequestException('Body must include a "compare" array of CRDT ids.');
    }

    return {
      message:
        'Simulation initialized with three virtual nodes and side-by-side CRDT engines.',
      ...this.simulationService.init(body.compare),
    };
  }

  @ApiOperation({ summary: 'Enable network partition and queue sync messages' })
  @Post('network/partition')
  partitionNetwork(): unknown {
    this.networkSimulator.setPartitioned(true);
    return {
      message: 'Network partition enabled. Sync messages are now queued.',
      network: this.networkSimulator.getNetworkState(),
    };
  }

  @ApiOperation({ summary: 'Reconnect network and flush queued messages' })
  @Post('network/reconnect')
  reconnectNetwork(): unknown {
    this.networkSimulator.reconnect();
    return {
      message: 'Network reconnected. Queued sync messages flushed.',
      network: this.networkSimulator.getNetworkState(),
    };
  }

  @ApiOperation({ summary: 'Execute local operation on a specific virtual node' })
  @ApiParam({
    name: 'id',
    description: 'Node id: A/B/C or Node-A/Node-B/Node-C',
    example: 'A',
  })
  @ApiBody({
    type: OperateNodeBody,
    examples: {
      orSetAdd: {
        summary: 'Set CRDTs: add',
        value: { operation: { type: 'add', value: 'Apple' } },
      },
      orSetRemove: {
        summary: 'Set CRDTs: remove',
        value: { operation: { type: 'remove', value: 'Apple' } },
      },
      lwwSet: {
        summary: 'Register CRDTs: set',
        value: { operation: { type: 'set', value: 'Version-2' } },
      },
    },
  })
  @Post('node/:id/operate')
  operateNode(@Param('id') id: string, @Body() body: OperateNodeBody): unknown {
    const normalizedNodeId = this.normalizeNodeId(id);
    if (body.operation === undefined || body.operation === null) {
      throw new BadRequestException('Request body must include an "operation" object');
    }

    this.simulationService.executeNodeOperation(normalizedNodeId, body.operation);
    return {
      message: `Operation executed on ${normalizedNodeId}.`,
      state: this.simulationService.getState(),
    };
  }

  @ApiOperation({
    summary: 'Get current local state of all virtual nodes (per-engine snapshots)',
  })
  @Get('simulation/state')
  getSimulationState(): unknown {
    return this.simulationService.getState();
  }

  private normalizeNodeId(rawId: string): NodeId {
    const normalized = rawId.toUpperCase();
    const map: Record<string, NodeId> = {
      A: 'Node-A',
      B: 'Node-B',
      C: 'Node-C',
      'NODE-A': 'Node-A',
      'NODE-B': 'Node-B',
      'NODE-C': 'Node-C',
    };

    const nodeId = map[normalized];
    if (nodeId === undefined) {
      throw new BadRequestException('Node id must be A, B, C, Node-A, Node-B, or Node-C');
    }

    return nodeId;
  }
}
