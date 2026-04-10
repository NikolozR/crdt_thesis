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
   * Choose which CRDT implementation all virtual nodes will use in this run.
   */
  @ApiProperty({ enum: ['or-set', 'lww-register'] })
  readonly crdtType!: CrdtType;
}

class OperateNodeBody {
  /**
   * Operation is intentionally polymorphic because the simulation supports
   * two CRDT families with distinct operation shapes.
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

  @ApiOperation({ summary: 'Initialize 3 virtual nodes with selected CRDT type' })
  @ApiBody({
    type: InitSimulationBody,
    examples: {
      orSet: {
        summary: 'Initialize for OR-Set run',
        value: { crdtType: 'or-set' },
      },
      lww: {
        summary: 'Initialize for LWW register run',
        value: { crdtType: 'lww-register' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Simulation initialized' })
  @Post('simulation/init')
  initSimulation(@Body() body: InitSimulationBody): unknown {
    if (body.crdtType !== 'or-set' && body.crdtType !== 'lww-register') {
      throw new BadRequestException('crdtType must be either "or-set" or "lww-register"');
    }

    return {
      message: 'Simulation initialized with three virtual nodes.',
      ...this.simulationService.init(body.crdtType),
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
        summary: 'OR-Set add',
        value: { operation: { type: 'add', value: 'Apple' } },
      },
      orSetRemove: {
        summary: 'OR-Set remove',
        value: { operation: { type: 'remove', value: 'Apple' } },
      },
      lwwSet: {
        summary: 'LWW set',
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

  @ApiOperation({ summary: 'Get current local state of all virtual nodes' })
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
