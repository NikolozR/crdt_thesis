import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function s07ConcurrentRemoves(harness: SimulationHarness): ScenarioResult {
  harness.operate('Node-A', { type: 'add', value: 'Apple' });

  const afterInitialAdd = harness.snapshot();

  harness.partition();

  harness.operate('Node-A', { type: 'remove', value: 'Apple' });
  harness.operate('Node-B', { type: 'remove', value: 'Apple' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 's07',
    name: 'Concurrent removes of an element both nodes observed',
    description:
      'All nodes first receive "Apple" via healthy sync. Partition starts. ' +
      'Node-A and Node-B both remove "Apple" independently — each knows the original tag.',
    family: 'set',
    crdts: ['or-set', '2p-set'],
    snapshots: [
      { label: 'after_initial_add', state: afterInitialAdd },
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'Both CRDTs agree: "Apple" is absent after reconnect. ' +
      'Duplicate remove messages are idempotent in both implementations. ' +
      'No divergence when all concurrent ops are removes.',
  };
}
