'use client';

import { useState } from 'react';
import { CrdtType, LwwRegisterState, NodeId, NodeOperation, NodeState } from '@/lib/types';

interface Props {
  nodeId: NodeId;
  state: NodeState | null;
  activeCrdts: CrdtType[];
  isPartitioned: boolean;
  disabled?: boolean;
  allNodesState: Record<NodeId, NodeState> | null;
  onOperate: (nodeId: NodeId, operation: NodeOperation) => void;
}

const SET_OPS = ['add', 'remove'] as const;
const REGISTER_OPS = ['set'] as const;

function isDiverged(
  crdtType: CrdtType,
  allNodes: Record<NodeId, NodeState> | null,
): boolean {
  if (!allNodes) return false;
  const values = Object.values(allNodes).map((s) =>
    JSON.stringify(s[crdtType] ?? null),
  );
  const first = values[0];
  return values.some((v) => v !== first);
}

function renderValue(crdtType: CrdtType, value: unknown): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-zinc-500 italic">empty</span>;
  }

  if (crdtType === 'lww-register') {
    const v = value as LwwRegisterState;
    if (v.value === null) return <span className="text-zinc-500 italic">null</span>;
    return (
      <div className="space-y-0.5">
        <div>
          <span className="text-zinc-400 text-xs">value </span>
          <span className="text-white font-mono">{v.value}</span>
        </div>
        <div>
          <span className="text-zinc-400 text-xs">ts </span>
          <span className="text-zinc-300 font-mono text-xs">{v.timestamp}</span>
          <span className="text-zinc-400 text-xs ml-2">actor </span>
          <span className="text-zinc-300 font-mono text-xs">{v.actorId}</span>
        </div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-zinc-500 italic">∅ (empty set)</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {(value as string[]).map((v) => (
          <span
            key={v}
            className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-100 font-mono text-xs"
          >
            {v}
          </span>
        ))}
      </div>
    );
  }

  return <span className="font-mono text-zinc-100">{String(value)}</span>;
}

export default function NodePanel({
  nodeId,
  state,
  activeCrdts,
  isPartitioned,
  disabled = false,
  allNodesState,
  onOperate,
}: Props) {
  const [value, setValue] = useState('');
  const [weight, setWeight] = useState('10');

  const isSetFamily = activeCrdts.some((c) => c === 'or-set' || c === '2p-set' || c === 'pw-set');
  const hasPwSet = activeCrdts.includes('pw-set');
  const ops = isSetFamily ? SET_OPS : REGISTER_OPS;

  const nodeLabel = nodeId.replace('Node-', '');

  return (
    <div className="flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
        <span className="font-semibold text-zinc-100 tracking-wide">
          Node-<span className="text-indigo-400">{nodeLabel}</span>
        </span>
        {isPartitioned && (
          <span
            title="This node is cut off from the others. Operations it performs will be queued and not delivered until the network reconnects."
            className="cursor-help text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 border border-red-800"
          >
            isolated
          </span>
        )}
      </div>

      {/* State per engine */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {state === null ? (
          <p className="text-zinc-500 text-sm italic">
            Not initialised — click <span className="text-indigo-400 not-italic font-medium">Start</span> above
          </p>
        ) : (
          activeCrdts.map((crdtType) => {
            const diverged = isDiverged(crdtType, allNodesState);
            return (
              <div key={crdtType}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-zinc-400">{crdtType}</span>
                  {crdtType === 'pw-set' && (
                    <span
                      title="PW-Set is the custom CRDT designed for this thesis. It uses numerical weights to resolve conflicts — higher weight wins, regardless of add vs remove order."
                      className="cursor-help text-xs px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-700 font-semibold"
                    >
                      ★ custom
                    </span>
                  )}
                  {diverged && (
                    <span
                      title="This CRDT's state differs between nodes right now — they haven't merged yet. Reconnect the network to converge."
                      className="cursor-help text-xs px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-800"
                    >
                      diverged
                    </span>
                  )}
                </div>
                <div className="pl-1 text-sm">
                  {renderValue(crdtType, state[crdtType])}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Operate form */}
      {state !== null && (
        <div className="px-4 py-3 border-t border-zinc-700 bg-zinc-800/50">
          <input
            type="text"
            placeholder={isSetFamily ? 'element value (e.g. Apple)' : 'new value (e.g. V2)'}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim() && !disabled) {
                const defaultOp = ops[0];
                const w = hasPwSet ? Number(weight) || 1 : undefined;
                onOperate(nodeId, { type: defaultOp, value: value.trim(), ...(w !== undefined && { weight: w }) } as NodeOperation);
                setValue('');
              }
            }}
            className="w-full mb-2 px-3 py-1.5 rounded-md bg-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm border border-zinc-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
          />

          {hasPwSet && (
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-amber-400 font-semibold shrink-0" title="Weight used by PW-Set to resolve conflicts. Higher weight wins. Other CRDTs ignore this field.">
                ★ weight
              </label>
              <input
                type="number"
                min={1}
                value={weight}
                disabled={disabled}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-zinc-700 text-amber-300 placeholder-zinc-500 text-sm border border-amber-800 focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
              />
              <div className="flex gap-1 shrink-0">
                {[10, 50, 100].map((w) => (
                  <button
                    key={w}
                    disabled={disabled}
                    onClick={() => setWeight(String(w))}
                    title={`Set weight to ${w}`}
                    className={`cursor-pointer px-2 py-1 rounded text-xs font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      weight === String(w)
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {ops.map((op) => (
              <button
                key={op}
                disabled={disabled || !value.trim()}
                title={
                  disabled
                    ? 'Manual operations are disabled during a guided scenario'
                    : !value.trim()
                    ? 'Enter a value above first'
                    : op === 'add'
                    ? `Add "${value.trim()}"${hasPwSet ? ` with weight ${weight}` : ''}`
                    : op === 'remove'
                    ? `Remove "${value.trim()}"${hasPwSet ? ` with weight ${weight}` : ''}`
                    : `Set this node's register to "${value.trim()}"`
                }
                onClick={() => {
                  const w = hasPwSet ? Number(weight) || 1 : undefined;
                  onOperate(nodeId, { type: op, value: value.trim(), ...(w !== undefined && { weight: w }) } as NodeOperation);
                  setValue('');
                }}
                className={`cursor-pointer flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  op === 'remove'
                    ? 'bg-red-800 hover:bg-red-700 text-red-100'
                    : op === 'add'
                    ? 'bg-indigo-700 hover:bg-indigo-600 text-indigo-100'
                    : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
