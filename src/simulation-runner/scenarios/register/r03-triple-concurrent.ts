import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

/**
 * R03 — All three nodes set different values while partitioned.
 *
 * All three writes happen at lamport=1 — a three-way tie.
 *
 * LWW-Register:  deterministic tie-break by actorId string comparison.
 *                "Node-C" > "Node-B" > "Node-A" → "Node-C"'s value "Z" wins.
 *                Two values are silently discarded.
 * MV-Register:   all three writes are at the same lamport layer → all three
 *                values are retained: ["X","Y","Z"].
 */
export function r03TripleConcurrent(harness: SimulationHarness): ScenarioResult {
  harness.partition();

  harness.operate('Node-A', { type: 'set', value: 'X' });
  harness.operate('Node-B', { type: 'set', value: 'Y' });
  harness.operate('Node-C', { type: 'set', value: 'Z' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 'r03',
    name: 'Triple concurrent set on all three nodes',
    description:
      'All three nodes set different values (X, Y, Z) concurrently while partitioned. ' +
      'Maximum conflict scenario — three-way tie at lamport=1.',
    family: 'register',
    crdts: ['lww-register', 'mv-register'],
    snapshots: [
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'LWW: "Z" wins (Node-C has lexicographically highest actorId); X and Y silently lost. ' +
      'MV: all three values retained — ["X","Y","Z"]. ' +
      'Illustrates maximum information loss in LWW vs maximum conflict exposure in MV.',
  };
}
