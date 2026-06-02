import { SimulationHarness } from '../../harness';
import { ScenarioResult } from '../../scenario.types';
import { NodeId } from '../../../simulation/simulation.types';

export function s09ModeratedWorkspace(pwHarness: SimulationHarness): ScenarioResult {
  const standardHarness1 = new SimulationHarness(['or-set', '2p-set']);
  const standardHarness2 = new SimulationHarness(['or-set', '2p-set']);
  const pwHarness2 = new SimulationHarness(['pw-set']);

  standardHarness1.partition();
  standardHarness1.operate('Node-A', { type: 'remove', value: 'Spam' });
  standardHarness1.operate('Node-B', { type: 'add', value: 'Spam' });
  const phase1StandardDuring = standardHarness1.snapshot();
  standardHarness1.reconnect();
  const phase1StandardAfter = standardHarness1.snapshot();

  pwHarness.partition();
  pwHarness.operate('Node-A', { type: 'remove', value: 'Spam', weight: 100 });
  pwHarness.operate('Node-B', { type: 'add', value: 'Spam', weight: 10 });
  const phase1PwDuring = pwHarness.snapshot();
  pwHarness.reconnect();
  const phase1PwAfter = pwHarness.snapshot();

  standardHarness2.partition();
  standardHarness2.operate('Node-A', { type: 'add', value: 'Important Article' });
  standardHarness2.operate('Node-B', { type: 'remove', value: 'Important Article' });
  const phase2StandardDuring = standardHarness2.snapshot();
  standardHarness2.reconnect();
  const phase2StandardAfter = standardHarness2.snapshot();

  pwHarness2.partition();
  pwHarness2.operate('Node-A', { type: 'add', value: 'Important Article', weight: 100 });
  pwHarness2.operate('Node-B', { type: 'remove', value: 'Important Article', weight: 10 });
  const phase2PwDuring = pwHarness2.snapshot();
  pwHarness2.reconnect();
  const phase2PwAfter = pwHarness2.snapshot();

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

  const p1Pw  = phase1PwAfter['Node-A']['pw-set'] as string[];
  const p1Or  = phase1StandardAfter['Node-A']['or-set'] as string[];
  const p1Two = phase1StandardAfter['Node-A']['2p-set'] as string[];

  const phase1PwCorrect  = !p1Pw.includes('Spam');
  const phase1OrFails    = p1Or.includes('Spam');
  const phase1TwoCorrect = !p1Two.includes('Spam');

  const p2Pw  = phase2PwAfter['Node-A']['pw-set'] as string[];
  const p2Or  = phase2StandardAfter['Node-A']['or-set'] as string[];
  const p2Two = phase2StandardAfter['Node-A']['2p-set'] as string[];

  const phase2PwCorrect = p2Pw.includes('Important Article');
  const phase2OrCorrect = p2Or.includes('Important Article');
  const phase2TwoFails  = !p2Two.includes('Important Article');

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
