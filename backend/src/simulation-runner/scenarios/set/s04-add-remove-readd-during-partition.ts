import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function s04AddRemoveReaddDuringPartition(harness: SimulationHarness): ScenarioResult {
  harness.operate('Node-A', { type: 'add', value: 'Apple' });

  const afterInitialAdd = harness.snapshot();

  harness.partition();

  harness.operate('Node-B', { type: 'remove', value: 'Apple' });
  harness.operate('Node-A', { type: 'add', value: 'Apple' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 's04',
    name: 'Add → remove vs re-add during partition',
    description:
      'All nodes start with "Apple". Partition starts. Node-B removes it (knows original tag). ' +
      'Node-A adds it again concurrently (fresh tag, B cannot observe it). Tests re-insertion semantics.',
    family: 'set',
    crdts: ['or-set', '2p-set'],
    snapshots: [
      { label: 'after_initial_add', state: afterInitialAdd },
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'OR-Set: "Apple" survives — the re-add tag was unseen by B\'s remove. ' +
      '2P-Set: "Apple" is gone — the permanent tombstone blocks the re-add regardless of order.',
  };
}
