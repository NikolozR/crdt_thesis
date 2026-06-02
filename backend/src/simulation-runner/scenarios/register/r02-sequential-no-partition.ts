import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function r02SequentialNoPartition(harness: SimulationHarness): ScenarioResult {
  harness.operate('Node-A', { type: 'set', value: 'X' });

  const afterFirstSet = harness.snapshot();

  harness.operate('Node-B', { type: 'set', value: 'Y' });

  const afterSecondSet = harness.snapshot();

  return {
    id: 'r02',
    name: 'Sequential sets with no partition',
    description:
      'Node-A sets "X" (network healthy — all nodes receive it). ' +
      'Then Node-B sets "Y". Tests causally ordered writes where no conflict exists.',
    family: 'register',
    crdts: ['lww-register', 'mv-register'],
    snapshots: [
      { label: 'after_first_set', state: afterFirstSet },
      { label: 'after_second_set', state: afterSecondSet },
    ],
    conclusion:
      'Both LWW and MV converge to "Y" on all nodes. ' +
      'MV shows a single value (not an array of conflicts) because B\'s lamport is strictly higher than A\'s. ' +
      'No divergence when causal order is respected.',
  };
}
