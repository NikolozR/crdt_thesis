import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

/**
 * R02 — Sequential sets with no partition: A sets X, then B sets Y.
 *
 * With a healthy network every write is immediately delivered to all peers.
 * When B sets Y its logical clock is already ahead of A's (B received A's
 * sync message and advanced its clock before writing).
 *
 * Both CRDTs must agree: "Y" is the final value everywhere.
 * This is the no-conflict baseline for registers.
 */
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
