'use client';

import { useState } from 'react';
import { GUIDED_SCENARIOS } from '@/lib/scenarios';
import { ScenarioRunnerState } from '@/hooks/useScenarioRunner';

interface Props {
  runner: ScenarioRunnerState;
}

export default function ScenarioRunner({ runner }: Props) {
  const [selectedId, setSelectedId] = useState<string>(GUIDED_SCENARIOS[0].id);

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
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest shrink-0">
          Guided
        </span>

        {!isActive ? (
          /* ── IDLE state ─────────────────────────────────────── */
          <>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 max-w-xs px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
            >
              {GUIDED_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <span className="hidden lg:block text-xs text-zinc-500 truncate max-w-sm">
              {selected.description}
            </span>

            <button
              onClick={() => load(selected)}
              className="px-4 py-1.5 rounded-md text-sm font-semibold bg-indigo-700 hover:bg-indigo-600 text-indigo-100 transition-colors shrink-0"
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
            <div className="flex gap-1 items-center">
              {activeScenario?.steps.map((_, i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-indigo-400" />
              ))}
            </div>
            <button
              onClick={reset}
              className="ml-auto px-4 py-1.5 rounded-md text-sm font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors shrink-0"
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
            <div className="flex items-center gap-1">
              {activeScenario?.steps.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
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
              className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold bg-amber-700 hover:bg-amber-600 text-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
              className="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
