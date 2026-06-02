import { CrdtType, NodeId } from '../simulation/simulation.types';
import { SimulationHarness } from './harness';

export type ScenarioFamily = 'set' | 'register';

export interface ScenarioSnapshot {
  label: string;
  state: Record<NodeId, Record<string, unknown>>;
}

export interface ScenarioResult {
  id: string;
  name: string;
  description: string;
  family: ScenarioFamily;
  crdts: CrdtType[];
  snapshots: ScenarioSnapshot[];
  conclusion: string;
}

export type ScenarioFn = (harness: SimulationHarness) => ScenarioResult;
