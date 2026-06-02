import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

/**
 * R04 — Shared baseline value, then concurrent divergence during partition.
 *
 * Phase 1 (healthy network): Node-A sets "V1" → all nodes converge to "V1" at lamport=1.
 * Phase 2 (partition):
 *   Node-A sets "V2" → lamport=2 on Node-A only.
 *   Node-B sets "V3" → lamport=2 on Node-B only.
 *   Both are at the same logical layer relative to a shared baseline.
 *
 * LWW:  tie at lamport=2, tie-break by actorId → "Node-B" > "Node-A" → "V3" wins.
 * MV:   both writes at lamport=2 (the same maximum layer) → ["V2","V3"] retained.
 *
 * After a subsequent write from Node-C (lamport=3) the MV register should
 * collapse to a single value again.
 */
export function r04SetBeforeAndAfterPartition(harness: SimulationHarness): ScenarioResult {
  // Phase 1: everyone sees V1
  harness.operate('Node-A', { type: 'set', value: 'V1' });

  const afterBaseline = harness.snapshot();

  // Phase 2: partition + concurrent writes
  harness.partition();

  harness.operate('Node-A', { type: 'set', value: 'V2' });
  harness.operate('Node-B', { type: 'set', value: 'V3' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  // Phase 3: later causal write resolves MV conflict
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
