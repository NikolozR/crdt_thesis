'use client';

import { useCallback, useState } from 'react';
import ActivityLog from '@/components/ActivityLog';
import NodePanel from '@/components/NodePanel';
import ScenarioRunner from '@/components/ScenarioRunner';
import SetupBar from '@/components/SetupBar';
import { useScenarioRunner } from '@/hooks/useScenarioRunner';
import { api } from '@/lib/api';
import {
  CrdtType,
  LogEntry,
  NetworkState,
  NodeId,
  NodeOperation,
  NodeState,
  SimulationState,
} from '@/lib/types';

const NODE_IDS: NodeId[] = ['Node-A', 'Node-B', 'Node-C'];
let logCounter = 0;

function now(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function makeLog(kind: LogEntry['kind'], label: string): LogEntry {
  return { id: ++logCounter, timestamp: now(), kind, label };
}

export default function Home() {
  const [activeCrdts, setActiveCrdts] = useState<CrdtType[]>([]);
  const [network, setNetwork] = useState<NetworkState | null>(null);
  const [nodes, setNodes] = useState<Record<NodeId, NodeState> | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = useCallback((entry: LogEntry) => {
    setLog((prev) => [...prev, entry]);
  }, []);

  function applyState(state: SimulationState) {
    setNetwork(state.network);
    setNodes(state.nodes as Record<NodeId, NodeState>);
  }

  async function handleInit(compare: CrdtType[]) {
    setLoading(true);
    try {
      const res = await api.init(compare);
      setActiveCrdts(res.compare);
      const state = await api.getState();
      applyState(state);
      addLog(makeLog('init', `Initialized with [${res.compare.join(', ')}]`));
    } catch (e) {
      addLog(makeLog('error', String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function handlePartition() {
    setLoading(true);
    try {
      await api.partition();
      const state = await api.getState();
      applyState(state);
      addLog(makeLog('partition', 'Network partitioned — messages queued'));
    } catch (e) {
      addLog(makeLog('error', String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function handleReconnect() {
    setLoading(true);
    try {
      await api.reconnect();
      const state = await api.getState();
      applyState(state);
      addLog(makeLog('reconnect', 'Network reconnected — queued messages flushed'));
    } catch (e) {
      addLog(makeLog('error', String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function handleOperate(nodeId: NodeId, operation: NodeOperation) {
    setLoading(true);
    try {
      const res = await api.operate(nodeId, operation);
      applyState(res.state);
      addLog(
        makeLog(
          'operate',
          `${nodeId}  ${operation.type}("${operation.value}")`,
        ),
      );
    } catch (e) {
      addLog(makeLog('error', String(e)));
    } finally {
      setLoading(false);
    }
  }

  const runner = useScenarioRunner({
    onInit: handleInit,
    onPartition: handlePartition,
    onReconnect: handleReconnect,
    onOperate: handleOperate,
  });

  const initialized = nodes !== null;
  const isPartitioned = network?.isPartitioned ?? false;
  const manualDisabled = runner.isActive;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight">CRDT Simulation</span>
          {activeCrdts.length > 0 && (
            <span className="text-xs text-zinc-400 font-mono">
              [{activeCrdts.join(', ')}]
            </span>
          )}
        </div>
        {loading && (
          <span className="text-xs text-zinc-500 animate-pulse">loading…</span>
        )}
      </header>

      {/* Setup / network controls */}
      <SetupBar
        initialized={initialized}
        network={network}
        disabled={manualDisabled}
        onInit={handleInit}
        onPartition={handlePartition}
        onReconnect={handleReconnect}
      />

      {/* Guided scenario runner */}
      <ScenarioRunner runner={runner} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node panels */}
        <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-auto">
          {NODE_IDS.map((nodeId) => (
            <NodePanel
              key={nodeId}
              nodeId={nodeId}
              state={nodes?.[nodeId] ?? null}
              activeCrdts={activeCrdts}
              isPartitioned={isPartitioned}
              disabled={manualDisabled}
              allNodesState={nodes}
              onOperate={handleOperate}
            />
          ))}
        </div>

        {/* Activity log sidebar */}
        <div className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-900">
          <ActivityLog entries={log} />
        </div>
      </div>
    </div>
  );
}
