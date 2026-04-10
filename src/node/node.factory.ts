import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrdtFactory } from '../crdt/crdt.factory';
import { CrdtType, NodeId } from '../simulation/simulation.types';
import { NodeService } from './node.service';

@Injectable()
export class NodeFactory {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly crdtFactory: CrdtFactory,
  ) {}

  create(nodeId: NodeId, crdtType: CrdtType): NodeService {
    const crdt = this.crdtFactory.create(crdtType);
    return new NodeService(nodeId, crdtType, crdt, this.eventEmitter);
  }
}
