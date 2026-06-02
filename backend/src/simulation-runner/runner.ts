import * as fs from 'fs';
import * as path from 'path';
import { CrdtType } from '../simulation/simulation.types';
import { SimulationHarness } from './harness';
import { ScenarioFn, ScenarioResult } from './scenario.types';

// --- Set-family scenarios ---
import { s01AddWinsVsRemoveWins } from './scenarios/set/s01-add-wins-vs-remove-wins';
import { s02ConcurrentAddsSameElement } from './scenarios/set/s02-concurrent-adds-same-element';
import { s03RemoveNeverAdded } from './scenarios/set/s03-remove-never-added';
import { s04AddRemoveReaddDuringPartition } from './scenarios/set/s04-add-remove-readd-during-partition';
import { s05ThreeWayConcurrent } from './scenarios/set/s05-three-way-concurrent';
import { s06SequentialNoPartition } from './scenarios/set/s06-sequential-no-partition';
import { s07ConcurrentRemoves } from './scenarios/set/s07-concurrent-removes';
import { s08MultipleElementsMixedOps } from './scenarios/set/s08-multiple-elements-mixed-ops';
import { s09ModeratedWorkspace } from './scenarios/set/s09-moderated-workspace';

// --- Register-family scenarios ---
import { r01ConcurrentSet } from './scenarios/register/r01-concurrent-set';
import { r02SequentialNoPartition } from './scenarios/register/r02-sequential-no-partition';
import { r03TripleConcurrent } from './scenarios/register/r03-triple-concurrent';
import { r04SetBeforeAndAfterPartition } from './scenarios/register/r04-set-before-and-after-partition';
import { r05SameValueConcurrent } from './scenarios/register/r05-same-value-concurrent';
import { r06RepeatedPartitionCycles } from './scenarios/register/r06-repeated-partition-cycles';

interface ScenarioEntry {
  fn: ScenarioFn;
  crdts: readonly CrdtType[];
}

const SET_CRDTS: readonly CrdtType[] = ['or-set', '2p-set'];
const REGISTER_CRDTS: readonly CrdtType[] = ['lww-register', 'mv-register'];

const SCENARIOS: ScenarioEntry[] = [
  // Set family
  { fn: s01AddWinsVsRemoveWins,          crdts: SET_CRDTS },
  { fn: s02ConcurrentAddsSameElement,    crdts: SET_CRDTS },
  { fn: s03RemoveNeverAdded,             crdts: SET_CRDTS },
  { fn: s04AddRemoveReaddDuringPartition,crdts: SET_CRDTS },
  { fn: s05ThreeWayConcurrent,           crdts: SET_CRDTS },
  { fn: s06SequentialNoPartition,        crdts: SET_CRDTS },
  { fn: s07ConcurrentRemoves,            crdts: SET_CRDTS },
  { fn: s08MultipleElementsMixedOps,     crdts: SET_CRDTS },
  { fn: s09ModeratedWorkspace,           crdts: ['pw-set'] },
  // Register family
  { fn: r01ConcurrentSet,                crdts: REGISTER_CRDTS },
  { fn: r02SequentialNoPartition,        crdts: REGISTER_CRDTS },
  { fn: r03TripleConcurrent,             crdts: REGISTER_CRDTS },
  { fn: r04SetBeforeAndAfterPartition,   crdts: REGISTER_CRDTS },
  { fn: r05SameValueConcurrent,          crdts: REGISTER_CRDTS },
  { fn: r06RepeatedPartitionCycles,      crdts: REGISTER_CRDTS },
];

function runAll(): ScenarioResult[] {
  const results: ScenarioResult[] = [];

  for (const { fn, crdts } of SCENARIOS) {
    const harness = new SimulationHarness(crdts);
    const result = fn(harness);
    results.push(result);
    console.log(`[${result.id}] ${result.name}`);
    console.log(`       → ${result.conclusion}\n`);
  }

  return results;
}

function writeResults(results: ScenarioResult[]): void {
  const outDir = path.resolve(__dirname, '../../simulation-results');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `results-${timestamp}.json`);

  const output = {
    runAt: new Date().toISOString(),
    totalScenarios: results.length,
    results,
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nResults written to: ${outFile}`);
}

const results = runAll();
writeResults(results);
