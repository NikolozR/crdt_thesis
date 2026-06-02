import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

/**
 * S02 — Both nodes add the same element while partitioned.
 *
 * OR-Set:  each add generates a unique tag → after merge both tags are live
 *          → "Apple" present (element has 2 live tags, neither tombstoned).
 * 2P-Set:  both add to their local `added` set → after merge "Apple" present.
 *
 * Both CRDTs agree here. This confirms idempotence of concurrent adds.
 */
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
