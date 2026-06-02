import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function s06SequentialNoPartition(harness: SimulationHarness): ScenarioResult {
  harness.operate('Node-A', { type: 'add', value: 'Apple' });

  const afterAdd = harness.snapshot();

  harness.operate('Node-A', { type: 'remove', value: 'Apple' });

  const afterRemove = harness.snapshot();

  harness.operate('Node-A', { type: 'add', value: 'Apple' });

  const afterReAdd = harness.snapshot();

  return {
    id: 's06',
    name: 'Sequential add → remove → re-add (no partition)',
    description:
      'All operations happen on Node-A with the network healthy throughout. ' +
      'Tests that causally ordered operations converge identically and that ' +
      're-add after a causal remove behaves differently across CRDTs.',
    family: 'set',
    crdts: ['or-set', '2p-set'],
    snapshots: [
      { label: 'after_add', state: afterAdd },
      { label: 'after_remove', state: afterRemove },
      { label: 'after_re_add', state: afterReAdd },
    ],
    conclusion:
      'After add→remove both agree: "Apple" absent. ' +
      'After re-add: OR-Set brings "Apple" back (new tag); ' +
      '2P-Set permanently blocks re-add (tombstone is forever).',
  };
}
