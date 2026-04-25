import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';

/**
 * R06 — Multiple partition/reconnect cycles with writes in each cycle.
 *
 * Cycle 1: partition → A sets "Round1-A", B sets "Round1-B" → reconnect.
 * Cycle 2: partition → A sets "Round2-A", C sets "Round2-C" → reconnect.
 *
 * After cycle 1 reconnect: clocks advance (LWW picks one; MV resolves conflict).
 * After cycle 2 reconnect: new writes are at strictly higher lamport than cycle-1
 *   writes → both CRDTs should converge cleanly because cycle-2 writes causally
 *   dominate cycle-1 writes.
 *
 * Tests that clocks advance correctly across multiple heal/partition cycles and
 * that old conflicts don't linger in MV after they are superseded.
 */
export function r06RepeatedPartitionCycles(harness: SimulationHarness): ScenarioResult {
  // Cycle 1
  harness.partition();
  harness.operate('Node-A', { type: 'set', value: 'Round1-A' });
  harness.operate('Node-B', { type: 'set', value: 'Round1-B' });

  const afterCycle1Partition = harness.snapshot();

  harness.reconnect();

  const afterCycle1Reconnect = harness.snapshot();

  // Cycle 2
  harness.partition();
  harness.operate('Node-A', { type: 'set', value: 'Round2-A' });
  harness.operate('Node-C', { type: 'set', value: 'Round2-C' });

  const afterCycle2Partition = harness.snapshot();

  harness.reconnect();

  const afterCycle2Reconnect = harness.snapshot();

  return {
    id: 'r06',
    name: 'Multiple partition/reconnect cycles',
    description:
      'Two partition/reconnect cycles each with concurrent writes. ' +
      'Tests that logical clocks advance across cycles and old conflicts are superseded by newer writes.',
    family: 'register',
    crdts: ['lww-register', 'mv-register'],
    snapshots: [
      { label: 'after_cycle1_partition', state: afterCycle1Partition },
      { label: 'after_cycle1_reconnect', state: afterCycle1Reconnect },
      { label: 'after_cycle2_partition', state: afterCycle2Partition },
      { label: 'after_cycle2_reconnect', state: afterCycle2Reconnect },
    ],
    conclusion:
      'After cycle 1: LWW converges to one value; MV may show a conflict. ' +
      'After cycle 2: both LWW and MV converge — cycle-2 writes have strictly higher lamport timestamps ' +
      'so they dominate, and MV collapses back to the concurrent set of the latest cycle.',
  };
}
