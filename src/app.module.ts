import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { CrdtModule } from './crdt/crdt.module';
import { NetworkModule } from './network/network.module';
import { NodeModule } from './node/node.module';
import { SimulationModule } from './simulation/simulation.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CrdtModule,
    NodeModule,
    NetworkModule,
    SimulationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
