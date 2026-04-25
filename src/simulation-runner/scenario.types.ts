import { CrdtType, NodeId } from '../simulation/simulation.types';
import { SimulationHarness } from './harness';

export type ScenarioFamily = 'set' | 'register';

export interface ScenarioSnapshot {
  /** Human-readable label for when this snapshot was taken. */
  label: string;
  state: Record<NodeId, Record<string, unknown>>;
}

export interface ScenarioResult {
  id: string;
  name: string;
  description: string;
  family: ScenarioFamily;
  /** CRDT engines that ran side-by-side in this scenario. */
  crdts: CrdtType[];
  snapshots: ScenarioSnapshot[];
  /** Short plain-English conclusion about what the results show. */
  conclusion: string;
}

/**
 * A scenario is a pure function that receives a freshly built harness
 * (already initialised with the right CRDT engines) and returns a result
 * containing all snapshots captured during the run.
 *
 * Scenarios must not share state — the runner constructs a new harness per
 * scenario so results are fully isolated.
 */
export type ScenarioFn = (harness: SimulationHarness) => ScenarioResult;
