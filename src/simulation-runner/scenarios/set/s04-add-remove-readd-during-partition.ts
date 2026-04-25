import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

/**
 * S04 — Add before partition, remove on B during partition, add again on A during partition.
 *
 * Setup (before partition, network healthy):
 *   Node-A adds "Apple" → all nodes receive it and converge.
 *
 * During partition:
 *   Node-B removes "Apple" (knows the original tag, tombstones it).
 *   Node-A adds "Apple" again (generates a fresh new tag — B cannot know about it).
 *
 * OR-Set: B's remove tombstones the original tag only. A's re-add creates a
 *         new tag that B has never seen, so it survives. "Apple" present.
 * 2P-Set: B's remove writes "Apple" to the permanent tombstone. A's re-add
 *         during partition generates a 2p-add message, but when it arrives at B
 *         and C after reconnect the tombstone blocks it. "Apple" absent.
 */
export function s04AddRemoveReaddDuringPartition(harness: SimulationHarness): ScenarioResult {
  // Phase 1: healthy network — everyone has Apple
  harness.operate('Node-A', { type: 'add', value: 'Apple' });

  const afterInitialAdd = harness.snapshot();

  // Phase 2: partition
  harness.partition();

  harness.operate('Node-B', { type: 'remove', value: 'Apple' });
  harness.operate('Node-A', { type: 'add', value: 'Apple' }); // fresh tag

  const duringPartition = harness.snapshot();

  // Phase 3: reconnect
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
