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
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
              [
              {activeCrdts.map((c, i) => (
                <span key={c}>
                  {c === 'pw-set'
                    ? <span className="text-amber-400 font-semibold">{c} ★</span>
                    : <span>{c}</span>
                  }
                  {i < activeCrdts.length - 1 && ', '}
                </span>
              ))}
              ]
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
        <div className="flex-1 overflow-auto">
          {!initialized ? (
            <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
              <div>
                <h2 className="text-xl font-bold text-zinc-100 mb-2">Welcome to the CRDT Simulator</h2>
                <p className="text-zinc-400 text-sm max-w-lg">
                  This tool lets you observe how different Conflict-Free Replicated Data Types behave
                  under network partitions. Choose a CRDT family above to begin.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 text-left">
                {[
                  { step: '1', title: 'Initialize', desc: 'Pick a CRDT family above. Three virtual nodes (A, B, C) will be created.' },
                  { step: '2', title: 'Partition', desc: 'Click "Partition network" to isolate nodes. Operations will queue instead of syncing.' },
                  { step: '3', title: 'Operate', desc: 'Add or remove values on individual nodes. Watch states diverge.' },
                  { step: '4', title: 'Reconnect', desc: 'Click "Reconnect network" to flush queued messages and observe how nodes converge.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-3 max-w-[180px]">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-700 text-indigo-100 text-xs font-bold flex items-center justify-center mt-0.5">
                      {step}
                    </span>
                    <div>
                      <p className="text-zinc-100 text-sm font-semibold">{title}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-zinc-600 text-xs">
                To see the custom <span className="text-amber-400 font-medium">PW-Set ★</span> in action,
                use the amber <span className="text-amber-400 font-medium">Start: OR-Set vs 2P-Set vs PW-Set ★</span> button,
                or load the <span className="text-indigo-400 font-medium">Guided → The Troll Problem</span> scenario.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 p-4 h-full">
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
          )}
        </div>

        {/* Activity log sidebar */}
        <div className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-900">
          <ActivityLog entries={log} />
        </div>
      </div>
    </div>
  );
}
