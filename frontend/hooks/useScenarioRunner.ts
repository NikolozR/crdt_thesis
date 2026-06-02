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
  isActive: boolean;
  isExecuting: boolean;
  isDone: boolean;
  activeScenario: GuidedScenario | null;
  nextStepIndex: number;
  nextStep: ScenarioStep | null;
  load: (scenario: GuidedScenario) => void;
  executeStep: () => Promise<void>;
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
    setActiveScenario((scenario) => scenario);

    if (isExecuting) return;

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
