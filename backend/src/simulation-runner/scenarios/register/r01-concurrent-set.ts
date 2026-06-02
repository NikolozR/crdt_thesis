import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

/**
 * R01 — Classic concurrent set: A sets X, B sets Y while partitioned.
 *
 * LWW-Register:  Both writes carry logical clock = 1 (each replica started at 0
 *                and incremented once). Tie-broken by actorId string comparison:
 *                "Node-B" > "Node-A" → Node-B's value "Y" wins everywhere.
 * MV-Register:   Both writes are at lamport=1. No single winner — both "X" and "Y"
 *                are retained as concurrent values: ["X","Y"].
 */
export function r01ConcurrentSet(harness: SimulationHarness): ScenarioResult {
  harness.partition();

  harness.operate('Node-A', { type: 'set', value: 'X' });
  harness.operate('Node-B', { type: 'set', value: 'Y' });

  const duringPartition = harness.snapshot();

  harness.reconnect();

  const afterReconnect = harness.snapshot();

  return {
    id: 'r01',
    name: 'Concurrent set on two nodes',
    description:
      'Node-A sets value "X" and Node-B sets value "Y" concurrently while partitioned. ' +
      'Both writes happen at logical timestamp 1 — a true tie.',
    family: 'register',
    crdts: ['lww-register', 'mv-register'],
    snapshots: [
      { label: 'during_partition', state: duringPartition },
      { label: 'after_reconnect', state: afterReconnect },
    ],
    conclusion:
      'LWW: one value survives ("Y" wins — "Node-B" > "Node-A" as tie-breaker); "X" is silently lost. ' +
      'MV: both values retained — ["X","Y"]; no information loss, but conflict exposed to the application.',
  };
}
