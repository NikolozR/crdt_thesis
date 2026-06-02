import { Module } from '@nestjs/common';
import { NetworkModule } from '../network/network.module';
import { NodeModule } from '../node/node.module';
import { SimulationService } from './simulation.service';

@Module({
  imports: [NodeModule, NetworkModule],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
