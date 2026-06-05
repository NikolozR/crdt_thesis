'use client';

import { useState } from 'react';
import { GUIDED_SCENARIOS } from '@/lib/scenarios';
import { ScenarioRunnerState } from '@/hooks/useScenarioRunner';

interface Props {
  runner: ScenarioRunnerState;
}

export default function ScenarioRunner({ runner }: Props) {
  const [selectedId, setSelectedId] = useState<string>(GUIDED_SCENARIOS[0].id);
  const [descOpen, setDescOpen] = useState(false);

  const selected = GUIDED_SCENARIOS.find((s) => s.id === selectedId) ?? GUIDED_SCENARIOS[0];
  const {
    isActive, isExecuting, isDone,
    activeScenario, nextStepIndex, nextStep,
    load, executeStep, reset,
  } = runner;

  const totalSteps = activeScenario?.steps.length ?? 0;
  const completedSteps = isDone ? totalSteps : nextStepIndex;

  return (
    <div className="border-b border-zinc-700 bg-zinc-900/80">
      <div className="flex items-center gap-3 px-6 py-3 flex-wrap">

        {/* Label */}
        <span
          title="Guided scenarios walk through a predefined sequence of operations step by step — useful for demonstrations"
          className="cursor-help text-xs font-semibold text-zinc-400 uppercase tracking-widest shrink-0"
        >
          Guided
        </span>

        {!isActive ? (
          /* ── IDLE state ─────────────────────────────────────── */
          <>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="cursor-pointer flex-1 max-w-xs px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
            >
              {GUIDED_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button
              onClick={() => setDescOpen((o) => !o)}
              title="Show / hide scenario description"
              className="cursor-pointer px-2 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors shrink-0"
            >
              {descOpen ? '▲ hide' : '▼ what is this?'}
            </button>

            <button
              onClick={() => { load(selected); setDescOpen(false); }}
              title="Load this scenario — you will then execute it one step at a time"
              className="cursor-pointer px-4 py-1.5 rounded-md text-sm font-semibold bg-indigo-700 hover:bg-indigo-600 text-indigo-100 transition-colors shrink-0"
            >
              Load scenario
            </button>
          </>
        ) : isDone ? (
          /* ── DONE state ──────────────────────────────────────── */
          <>
            <span className="flex items-center gap-2 text-sm text-emerald-300 font-medium">
              <span className="text-emerald-400">✓</span>
              {activeScenario?.name} — complete
            </span>
            <div className="flex gap-1 items-center" title="All steps completed">
              {activeScenario?.steps.map((_, i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-indigo-400" />
              ))}
            </div>
            <span className="text-xs text-zinc-500">
              Inspect the node states, then reset to try again or load another scenario.
            </span>
            <button
              onClick={reset}
              title="Clear this scenario and return to idle"
              className="cursor-pointer ml-auto px-4 py-1.5 rounded-md text-sm font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors shrink-0"
            >
              Reset
            </button>
          </>
        ) : (
          /* ── ACTIVE state ────────────────────────────────────── */
          <>
            {/* Scenario name */}
            <span className="text-sm text-zinc-300 font-medium shrink-0">
              {activeScenario?.name}
            </span>

            {/* Step dots */}
            <div className="flex items-center gap-1" title={`Step ${completedSteps} of ${totalSteps} completed`}>
              {activeScenario?.steps.map((s, i) => (
                <span
                  key={i}
                  title={s.label}
                  className={`w-2 h-2 rounded-full transition-colors cursor-default ${
                    i < completedSteps
                      ? 'bg-indigo-400'
                      : i === nextStepIndex
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-zinc-600'
                  }`}
                />
              ))}
            </div>

            {/* Step counter */}
            <span className="text-xs text-zinc-500 shrink-0">
              {completedSteps}/{totalSteps}
            </span>

            {/* Next step label */}
            <span className="text-xs text-amber-300 truncate min-w-0">
              Next: {nextStep?.label}
            </span>

            {/* Execute button */}
            <button
              onClick={() => void executeStep()}
              disabled={isExecuting}
              title={isExecuting ? 'Waiting for the API…' : `Execute: ${nextStep?.label ?? ''}`}
              className="cursor-pointer ml-auto flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold bg-amber-700 hover:bg-amber-600 text-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isExecuting ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
                  Executing…
                </>
              ) : (
                'Execute Step ▶'
              )}
            </button>

            {/* Cancel */}
            <button
              onClick={reset}
              disabled={isExecuting}
              title="Cancel this scenario"
              className="cursor-pointer px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              ✕
            </button>
          </>
        )}
      </div>

      {/* Description panel — shown when toggled open in idle state */}
      {!isActive && descOpen && (
        <div className="px-6 pb-3">
          <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
            <p className="font-semibold text-zinc-100 mb-1">{selected.name}</p>
            <p>{selected.description}</p>
            <p className="mt-2 text-zinc-500 text-xs">{selected.steps.length} steps total — click <span className="text-indigo-400">Load scenario</span> to begin.</p>
          </div>
        </div>
      )}
    </div>
  );
}
