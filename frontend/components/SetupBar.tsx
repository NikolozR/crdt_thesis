'use client';

import { CrdtFamily, CrdtType, NetworkState, REGISTER_CRDTS, SET_CRDTS } from '@/lib/types';

interface Props {
  initialized: boolean;
  network: NetworkState | null;
  disabled?: boolean;
  onInit: (compare: CrdtType[]) => void;
  onPartition: () => void;
  onReconnect: () => void;
}

export default function SetupBar({
  initialized,
  network,
  disabled = false,
  onInit,
  onPartition,
  onReconnect,
}: Props) {
  const families: { label: string; family: CrdtFamily; crdts: CrdtType[] }[] = [
    { label: 'OR-Set vs 2P-Set  (sets)', family: 'set', crdts: SET_CRDTS },
    { label: 'LWW vs MV-Register  (registers)', family: 'register', crdts: REGISTER_CRDTS },
  ];

  const isPartitioned = network?.isPartitioned ?? false;
  const queued = network?.queuedMessages ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-zinc-900 border-b border-zinc-700">
      {/* CRDT family selector */}
      <div className="flex gap-2">
        {families.map(({ label, crdts }) => (
          <button
            key={label}
            onClick={() => onInit(crdts)}
            disabled={disabled}
            className="px-4 py-2 rounded-md text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Init: {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-zinc-600" />

      {/* Network controls — only shown after init */}
      {initialized && (
        <>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isPartitioned
                ? 'bg-red-900/60 text-red-300 border border-red-700'
                : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPartitioned ? 'bg-red-400' : 'bg-emerald-400'
              }`}
            />
            {isPartitioned ? `PARTITIONED  (${queued} queued)` : 'HEALTHY'}
          </div>

          {!isPartitioned ? (
            <button
              onClick={onPartition}
              disabled={disabled}
              className="px-4 py-2 rounded-md text-sm font-medium bg-red-800 hover:bg-red-700 text-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Partition network
            </button>
          ) : (
            <button
              onClick={onReconnect}
              disabled={disabled}
              className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reconnect network
            </button>
          )}
        </>
      )}
    </div>
  );
}
