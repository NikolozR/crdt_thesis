import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';
import { NodeId } from '../../../simulation/simulation.types';

/**
 * S09 — Moderated Workspace: proving PW-Set succeeds where OR-Set and 2P-Set fail.
 *
 * Context: a collaborative document workspace where actions by admins (weight=100)
 * should always beat concurrent actions by regular users (weight=10), regardless
 * of which node processes the operation first.
 *
 * Phase 1 — "The Troll":
 *   Admin (Node-A, w=100) removes "Spam".
 *   User  (Node-B, w=10)  adds   "Spam".
 *   [Partitioned] → reconnect.
 *   Expected: PW-Set empty (100 > 10, remove wins).
 *   OR-Set:  "Spam" present (add-wins always, ignores intent).
 *   2P-Set:  "Spam" absent (correct outcome, but for wrong reason — permanent tombstone
 *            means the admin cannot re-add "Spam" later if they want to, e.g. to quote it).
 *
 * Phase 2 — "The Save":
 *   Admin (Node-A, w=100) adds    "Important Article".
 *   User  (Node-B, w=10)  removes "Important Article".
 *   [Partitioned] → reconnect.
 *   Expected: PW-Set has "Important Article" (100 > 10, add wins).
 *   OR-Set:  "Important Article" absent (add-wins only when add is concurrent — here remove wins).
 *            Wait — OR-Set: add on A, remove on B. B never saw A's add tag.
 *            So OR-Set actually keeps it (add-wins). Both OR-Set and PW-Set agree here.
 *   2P-Set:  "Important Article" absent (remove permanently tombstones it, admin cannot protect it).
 *
 * Summary of divergence:
 *   Phase 1 → OR-Set FAILS (cannot enforce admin remove over user add).
 *   Phase 2 → 2P-Set FAILS (cannot protect admin add from user remove; also
 *             the phase-1 tombstone from 2P-Set would block re-adding "Spam" even by admin).
 *   PW-Set  → SUCCEEDS in both phases via a single consistent rule: higher weight wins.
 */
export function s09ModeratedWorkspace(pwHarness: SimulationHarness): ScenarioResult {
  // ── Comparison harnesses for OR-Set / 2P-Set ──────────────────────────────
  const standardHarness1 = new SimulationHarness(['or-set', '2p-set']);
  const standardHarness2 = new SimulationHarness(['or-set', '2p-set']);
  // Second PW-Set harness for phase 2 (fresh state)
  const pwHarness2 = new SimulationHarness(['pw-set']);

  // ── Phase 1: The Troll ────────────────────────────────────────────────────
  // Standard CRDTs (no weight concept)
  standardHarness1.partition();
  standardHarness1.operate('Node-A', { type: 'remove', value: 'Spam' });
  standardHarness1.operate('Node-B', { type: 'add', value: 'Spam' });
  const phase1StandardDuring = standardHarness1.snapshot();
  standardHarness1.reconnect();
  const phase1StandardAfter = standardHarness1.snapshot();

  // PW-Set (passed-in harness, configured with ['pw-set'])
  pwHarness.partition();
  pwHarness.operate('Node-A', { type: 'remove', value: 'Spam', weight: 100 }); // Admin
  pwHarness.operate('Node-B', { type: 'add', value: 'Spam', weight: 10 });     // User
  const phase1PwDuring = pwHarness.snapshot();
  pwHarness.reconnect();
  const phase1PwAfter = pwHarness.snapshot();

  // ── Phase 2: The Save ─────────────────────────────────────────────────────
  // Standard CRDTs
  standardHarness2.partition();
  standardHarness2.operate('Node-A', { type: 'add', value: 'Important Article' });    // Admin
  standardHarness2.operate('Node-B', { type: 'remove', value: 'Important Article' }); // User
  const phase2StandardDuring = standardHarness2.snapshot();
  standardHarness2.reconnect();
  const phase2StandardAfter = standardHarness2.snapshot();

  // PW-Set
  pwHarness2.partition();
  pwHarness2.operate('Node-A', { type: 'add', value: 'Important Article', weight: 100 });    // Admin
  pwHarness2.operate('Node-B', { type: 'remove', value: 'Important Article', weight: 10 });  // User
  const phase2PwDuring = pwHarness2.snapshot();
  pwHarness2.reconnect();
  const phase2PwAfter = pwHarness2.snapshot();

  // ── Merge snapshots for side-by-side comparison in results JSON ───────────
  function merge(
    standard: Record<string, Record<string, unknown>>,
    pw: Record<string, Record<string, unknown>>,
  ): Record<NodeId, Record<string, unknown>> {
    const out = {} as Record<NodeId, Record<string, unknown>>;
    for (const nodeId of ['Node-A', 'Node-B', 'Node-C'] as NodeId[]) {
      out[nodeId] = { ...standard[nodeId], ...pw[nodeId] };
    }
    return out;
  }

  // ── Assertions ────────────────────────────────────────────────────────────
  // Phase 1 after reconnect
  const p1Pw  = phase1PwAfter['Node-A']['pw-set'] as string[];
  const p1Or  = phase1StandardAfter['Node-A']['or-set'] as string[];
  const p1Two = phase1StandardAfter['Node-A']['2p-set'] as string[];

  const phase1PwCorrect    = !p1Pw.includes('Spam');   // PW-Set: admin remove wins
  const phase1OrFails      = p1Or.includes('Spam');    // OR-Set: add always wins
  const phase1TwoCorrect   = !p1Two.includes('Spam');  // 2P-Set: correct result but for wrong reason

  // Phase 2 after reconnect
  const p2Pw  = phase2PwAfter['Node-A']['pw-set'] as string[];
  const p2Or  = phase2StandardAfter['Node-A']['or-set'] as string[];
  const p2Two = phase2StandardAfter['Node-A']['2p-set'] as string[];

  const phase2PwCorrect    = p2Pw.includes('Important Article');   // PW-Set: admin add wins
  const phase2OrCorrect    = p2Or.includes('Important Article');   // OR-Set: also keeps it (add-wins)
  const phase2TwoFails     = !p2Two.includes('Important Article'); // 2P-Set: remove tombstones it

  return {
    id: 's09',
    name: 'Moderated Workspace — PW-Set vs OR-Set and 2P-Set',
    description:
      'Two-phase scenario proving PW-Set uniquely enforces role-based conflict resolution. ' +
      'Phase 1 (Troll): admin removes "Spam" (w=100) vs user adds "Spam" (w=10). ' +
      'Phase 2 (Save): admin adds "Important Article" (w=100) vs user removes it (w=10). ' +
      'OR-Set fails Phase 1 (add always wins). 2P-Set fails Phase 2 (permanent tombstone, ' +
      'admin add cannot survive user remove). PW-Set succeeds both via one consistent rule.',
    family: 'set',
    crdts: ['or-set', '2p-set', 'pw-set'],
    snapshots: [
      { label: 'phase1_during_partition',  state: merge(phase1StandardDuring, phase1PwDuring) },
      { label: 'phase1_after_reconnect',   state: merge(phase1StandardAfter,  phase1PwAfter)  },
      { label: 'phase2_during_partition',  state: merge(phase2StandardDuring, phase2PwDuring) },
      { label: 'phase2_after_reconnect',   state: merge(phase2StandardAfter,  phase2PwAfter)  },
    ],
    conclusion:
      `Phase 1 — OR-Set FAILS (Spam present=${p1Or.includes('Spam')}, expected false): ` +
      `add-wins semantics cannot enforce admin moderation. ` +
      `2P-Set correct (Spam absent=${!p1Two.includes('Spam')}) but tombstone is permanent, ` +
      `blocking any future admin re-add. PW-Set correct (Spam absent=${phase1PwCorrect}). ` +
      `Phase 2 — 2P-Set FAILS (Article present=${!phase2TwoFails}, expected true): ` +
      `permanent tombstone cannot be overridden even by admin. ` +
      `OR-Set correct (Article present=${phase2OrCorrect}) but only by accident (add-wins). ` +
      `PW-Set correct (Article present=${phase2PwCorrect}) via explicit weight rule. ` +
      `Assertions: phase1PwCorrect=${phase1PwCorrect}, phase1OrFails=${phase1OrFails}, ` +
      `phase1TwoCorrect=${phase1TwoCorrect}, phase2PwCorrect=${phase2PwCorrect}, ` +
      `phase2OrCorrect=${phase2OrCorrect}, phase2TwoFails=${phase2TwoFails}.`,
  };
}
