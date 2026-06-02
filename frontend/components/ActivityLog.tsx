'use client';

import { useEffect, useRef } from 'react';
import { LogEntry } from '@/lib/types';

interface Props {
  entries: LogEntry[];
}

const kindStyles: Record<LogEntry['kind'], string> = {
  init:       'text-indigo-400',
  partition:  'text-red-400',
  reconnect:  'text-emerald-400',
  operate:    'text-zinc-300',
  error:      'text-rose-400',
};

const kindBadge: Record<LogEntry['kind'], string> = {
  init:       'bg-indigo-900/50 text-indigo-300 border-indigo-800',
  partition:  'bg-red-900/50 text-red-300 border-red-800',
  reconnect:  'bg-emerald-900/50 text-emerald-300 border-emerald-800',
  operate:    'bg-zinc-700/50 text-zinc-300 border-zinc-600',
  error:      'bg-rose-900/50 text-rose-300 border-rose-800',
};

export default function ActivityLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-zinc-700 bg-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Activity log
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 font-mono text-xs">
        {entries.length === 0 && (
          <p className="text-zinc-600 italic py-2">No activity yet. Initialise the simulation to begin.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2">
            <span className="text-zinc-600 shrink-0 pt-0.5">{entry.timestamp}</span>
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${kindBadge[entry.kind]}`}
            >
              {entry.kind}
            </span>
            <span className={kindStyles[entry.kind]}>{entry.label}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
