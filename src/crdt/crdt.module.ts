import { Module } from '@nestjs/common';
import { CrdtFactory } from './crdt.factory';

@Module({
  providers: [CrdtFactory],
  exports: [CrdtFactory],
})
export class CrdtModule {}
