import { Module } from '@nestjs/common';
import { CrdtModule } from '../crdt/crdt.module';
import { NodeFactory } from './node.factory';

@Module({
  imports: [CrdtModule],
  providers: [NodeFactory],
  exports: [NodeFactory],
})
export class NodeModule {}
