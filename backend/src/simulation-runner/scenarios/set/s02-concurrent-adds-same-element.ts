import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function s02ConcurrentAddsSameElement(harness: SimulationHarness): ScenarioResult {
  harness.partition();

  harness.operate('Node-A', { type: 'add', value: 'Apple' });
  harness.operate('Node-B', { type: 'add', value: 'Apple' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 's02',
    name: 'Concurrent adds of the same element',
    description:
      'Both Node-A and Node-B add "Apple" independently while partitioned. ' +
      'Tests that duplicate concurrent adds converge safely.',
    family: 'set',
    crdts: ['or-set', '2p-set'],
    snapshots: [
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'Both CRDTs converge: "Apple" is present on all nodes. ' +
      'OR-Set holds two live tags; 2P-Set has one entry in the added set. ' +
      'No conflict — both implementations agree.',
  };
}
