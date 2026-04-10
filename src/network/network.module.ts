import { Module } from '@nestjs/common';
import { NetworkSimulatorService } from './network-simulator.service';

@Module({
  providers: [NetworkSimulatorService],
  exports: [NetworkSimulatorService],
})
export class NetworkModule {}
