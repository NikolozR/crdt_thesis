import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function s01AddWinsVsRemoveWins(harness: SimulationHarness): ScenarioResult {
  harness.partition();

  harness.operate('Node-A', { type: 'add', value: 'Apple' });
  harness.operate('Node-B', { type: 'remove', value: 'Apple' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 's01',
    name: 'Classic add-wins vs remove-wins under partition',
    description:
      'Node-A adds "Apple" and Node-B removes "Apple" concurrently while partitioned. ' +
      'Node-B has never observed the add, so its remove is causally blind to it.',
    family: 'set',
    crdts: ['or-set', '2p-set'],
    snapshots: [
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'OR-Set: "Apple" present on all nodes (add wins). ' +
      '2P-Set: "Apple" absent on all nodes (remove wins permanently).',
  };
}
