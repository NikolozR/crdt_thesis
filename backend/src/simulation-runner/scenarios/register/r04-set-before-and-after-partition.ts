import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

export function r04SetBeforeAndAfterPartition(harness: SimulationHarness): ScenarioResult {
  harness.operate('Node-A', { type: 'set', value: 'V1' });

  const afterBaseline = harness.snapshot();

  harness.partition();

  harness.operate('Node-A', { type: 'set', value: 'V2' });
  harness.operate('Node-B', { type: 'set', value: 'V3' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  harness.operate('Node-C', { type: 'set', value: 'V4' });

  const afterCausalWrite = harness.snapshot();

  return {
    id: 'r04',
    name: 'Shared baseline then concurrent divergence and causal resolution',
    description:
      'All nodes agree on "V1". After partition, Node-A writes "V2" and Node-B writes "V3" concurrently. ' +
      'After reconnect, Node-C writes "V4" causally after the merge — should resolve MV conflict.',
    family: 'register',
    crdts: ['lww-register', 'mv-register'],
    snapshots: [
      { label: 'after_baseline', state: afterBaseline },
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
      { label: 'after_causal_write', state: afterCausalWrite },
    ],
    conclusion:
      'After reconnect — LWW: "V3" (Node-B wins tie); MV: ["V2","V3"]. ' +
      'After Node-C\'s causal write — LWW: "V4"; MV: ["V4"] — conflict collapses once a strictly later write arrives.',
  };
}
