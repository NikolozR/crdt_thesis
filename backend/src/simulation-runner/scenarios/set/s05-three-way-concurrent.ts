import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function s05ThreeWayConcurrent(harness: SimulationHarness): ScenarioResult {
  harness.partition();

  harness.operate('Node-A', { type: 'add', value: 'Apple' });
  harness.operate('Node-B', { type: 'remove', value: 'Apple' });
  harness.operate('Node-C', { type: 'add', value: 'Apple' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 's05',
    name: 'Three-way concurrent: two adds vs one remove',
    description:
      'Node-A adds "Apple", Node-B removes "Apple", Node-C adds "Apple" — all concurrently while partitioned. ' +
      'None of the three nodes observe each other\'s operations.',
    family: 'set',
    crdts: ['or-set', '2p-set'],
    snapshots: [
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'OR-Set: "Apple" present — two unseen add tags survive B\'s blind remove. ' +
      '2P-Set: "Apple" absent — one remove permanently wins over any number of concurrent adds.',
  };
}
