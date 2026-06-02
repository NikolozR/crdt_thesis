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

  create(nodeId: NodeId, compare: readonly CrdtType[]): NodeService {
    const instances = new Map<CrdtType, ReturnType<CrdtFactory['create']>>();
    for (const t of compare) {
      instances.set(t, this.crdtFactory.create(t));
    }

    return new NodeService(nodeId, compare, instances, this.eventEmitter);
  }
}
