import { CrdtType, NodeId, NodeOperation } from './types';

// ── Step types ─────────────────────────────────────────────────────────────

type InitStep      = { kind: 'init';      label: string; compare: CrdtType[] };
type PartitionStep = { kind: 'partition'; label: string };
type ReconnectStep = { kind: 'reconnect'; label: string };
type OperateStep   = { kind: 'operate';   label: string; nodeId: NodeId; operation: NodeOperation };

export type ScenarioStep = InitStep | PartitionStep | ReconnectStep | OperateStep;

export interface GuidedScenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
}

// ── Scenario definitions ───────────────────────────────────────────────────

/**
 * The Troll Problem — shows where OR-Set fails and PW-Set succeeds.
 * Admin (weight=100) removes "Spam" concurrently with a user (weight=10) adding it.
 * OR-Set: add always wins → "Spam" survives (wrong).
 * 2P-Set: remove wins but permanently (correct here, but blocks future re-adds).
 * PW-Set: higher weight wins → "Spam" absent (correct, and reversible).
 */
const trollProblem: GuidedScenario = {
  id: 'troll-problem',
  name: 'The Troll Problem',
  description:
    'Admin (w=100) removes "Spam" while a user (w=10) adds it concurrently. ' +
    'Compares OR-Set (add always wins), 2P-Set (remove always wins), and ' +
    'PW-Set (higher authority wins). Only PW-Set enforces the intended policy.',
  steps: [
    {
      kind: 'init',
      label: 'Initialize with or-set, 2p-set, pw-set',
      compare: ['or-set', '2p-set', 'pw-set'],
    },
    {
      kind: 'partition',
      label: 'Partition network — nodes isolated',
    },
    {
      kind: 'operate',
      label: 'Node-A (Admin, w=100) removes "Spam"',
      nodeId: 'Node-A',
      operation: { type: 'remove', value: 'Spam', weight: 100 },
    },
    {
      kind: 'operate',
      label: 'Node-B (User, w=10) adds "Spam"',
      nodeId: 'Node-B',
      operation: { type: 'add', value: 'Spam', weight: 10 },
    },
    {
      kind: 'reconnect',
      label: 'Reconnect — flush queued messages and converge',
    },
  ],
};

/**
 * Register Conflict — shows LWW silently discarding a write vs MV preserving both.
 * Two nodes set different values while partitioned.
 * LWW: one value wins (the other is lost with no trace).
 * MV: both values are retained, conflict is visible to the application.
 */
const registerConflict: GuidedScenario = {
  id: 'register-conflict',
  name: 'Register Conflict',
  description:
    'Node-A sets "Version-X" and Node-B sets "Version-Y" concurrently. ' +
    'LWW silently discards the loser; MV-Register retains both and exposes ' +
    'the conflict for the application to resolve explicitly.',
  steps: [
    {
      kind: 'init',
      label: 'Initialize with lww-register, mv-register',
      compare: ['lww-register', 'mv-register'],
    },
    {
      kind: 'partition',
      label: 'Partition network — nodes isolated',
    },
    {
      kind: 'operate',
      label: 'Node-A sets "Version-X"',
      nodeId: 'Node-A',
      operation: { type: 'set', value: 'Version-X' },
    },
    {
      kind: 'operate',
      label: 'Node-B sets "Version-Y"',
      nodeId: 'Node-B',
      operation: { type: 'set', value: 'Version-Y' },
    },
    {
      kind: 'reconnect',
      label: 'Reconnect — observe LWW winner vs MV conflict',
    },
  ],
};

export const GUIDED_SCENARIOS: GuidedScenario[] = [trollProblem, registerConflict];
