'use client';

import { useCallback, useRef, useState } from 'react';
import { GuidedScenario, ScenarioStep } from '@/lib/scenarios';
import { CrdtType, NodeId, NodeOperation } from '@/lib/types';

export interface ScenarioHandlers {
  onInit: (compare: CrdtType[]) => Promise<void>;
  onPartition: () => Promise<void>;
  onReconnect: () => Promise<void>;
  onOperate: (nodeId: NodeId, operation: NodeOperation) => Promise<void>;
}

export interface ScenarioRunnerState {
  /** A scenario is loaded (regardless of progress). */
  isActive: boolean;
  /** An API call is currently in flight for the executing step. */
  isExecuting: boolean;
  /** All steps have been executed. */
  isDone: boolean;
  activeScenario: GuidedScenario | null;
  /** 0-based index of the NEXT step to execute. */
  nextStepIndex: number;
  /** The step that will execute on the next click, null when done. */
  nextStep: ScenarioStep | null;
  /** Load a scenario and reset progress — does NOT execute anything yet. */
  load: (scenario: GuidedScenario) => void;
  /** Execute the next pending step. No-op while already executing or done. */
  executeStep: () => Promise<void>;
  /** Unload the scenario and return to idle. */
  reset: () => void;
}

async function dispatchStep(
  step: ScenarioStep,
  handlers: ScenarioHandlers,
): Promise<void> {
  switch (step.kind) {
    case 'init':
      await handlers.onInit(step.compare);
      break;
    case 'partition':
      await handlers.onPartition();
      break;
    case 'reconnect':
      await handlers.onReconnect();
      break;
    case 'operate':
      await handlers.onOperate(step.nodeId, step.operation);
      break;
  }
}

/**
 * Step-by-step scenario runner.
 *
 * The user controls the pace — each call to `executeStep` fires exactly one
 * API action and waits for completion before enabling the next step.
 * Handler references are stored in a ref so async calls always use the latest
 * closures even if the parent component re-renders between steps.
 */
export function useScenarioRunner(handlers: ScenarioHandlers): ScenarioRunnerState {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [activeScenario, setActiveScenario] = useState<GuidedScenario | null>(null);
  const [nextStepIndex, setNextStepIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const load = useCallback((scenario: GuidedScenario) => {
    setActiveScenario(scenario);
    setNextStepIndex(0);
    setIsExecuting(false);
  }, []);

  const reset = useCallback(() => {
    setActiveScenario(null);
    setNextStepIndex(0);
    setIsExecuting(false);
  }, []);

  const executeStep = useCallback(async () => {
    // Read current values via refs to avoid stale closure issues
    setActiveScenario((scenario) => {
      // We only need the scenario ref here — the real work happens below
      return scenario;
    });

    if (isExecuting) return;

    // Capture current values synchronously before any await
    const scenario = activeScenario;
    const index = nextStepIndex;

    if (!scenario) return;
    const step = scenario.steps[index];
    if (!step) return;

    setIsExecuting(true);
    try {
      await dispatchStep(step, handlersRef.current);
      setNextStepIndex((i) => i + 1);
    } finally {
      setIsExecuting(false);
    }
  }, [activeScenario, nextStepIndex, isExecuting]);

  const isActive = activeScenario !== null;
  const totalSteps = activeScenario?.steps.length ?? 0;
  const isDone = isActive && nextStepIndex >= totalSteps;
  const nextStep =
    isActive && !isDone ? (activeScenario?.steps[nextStepIndex] ?? null) : null;

  return {
    isActive,
    isExecuting,
    isDone,
    activeScenario,
    nextStepIndex,
    nextStep,
    load,
    executeStep,
    reset,
  };
}
