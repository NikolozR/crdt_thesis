import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function r05SameValueConcurrent(harness: SimulationHarness): ScenarioResult {
  harness.partition();

  harness.operate('Node-A', { type: 'set', value: 'SameValue' });
  harness.operate('Node-B', { type: 'set', value: 'SameValue' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 'r05',
    name: 'Concurrent identical writes on two nodes',
    description:
      'Node-A and Node-B both set the same value "SameValue" concurrently while partitioned. ' +
      'Tests idempotent handling of duplicate values in MV-Register.',
    family: 'register',
    crdts: ['lww-register', 'mv-register'],
    snapshots: [
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'Both CRDTs converge to "SameValue" on all nodes. ' +
      'MV-Register deduplicates: shows ["SameValue"] not ["SameValue","SameValue"]. ' +
      'No divergence when concurrent writes carry the same value.',
  };
}
