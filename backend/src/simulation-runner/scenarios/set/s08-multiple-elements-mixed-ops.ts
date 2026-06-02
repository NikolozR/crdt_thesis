import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function s08MultipleElementsMixedOps(harness: SimulationHarness): ScenarioResult {
  harness.partition();

  harness.operate('Node-A', { type: 'add', value: 'Apple' });
  harness.operate('Node-A', { type: 'add', value: 'Banana' });
  harness.operate('Node-B', { type: 'remove', value: 'Apple' });
  harness.operate('Node-B', { type: 'add', value: 'Cherry' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 's08',
    name: 'Multiple elements with mixed concurrent operations',
    description:
      'During partition: Node-A adds "Apple" and "Banana"; Node-B removes "Apple" and adds "Cherry". ' +
      'Tests that conflict resolution is applied per-element independently.',
    family: 'set',
    crdts: ['or-set', '2p-set'],
    snapshots: [
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'OR-Set final set: ["Apple","Banana","Cherry"] — Apple survives (add-wins), others uncontested. ' +
      '2P-Set final set: ["Banana","Cherry"] — Apple tombstoned (remove-wins), others uncontested. ' +
      'Per-element resolution means only "Apple" diverges between the two CRDTs.',
  };
}
