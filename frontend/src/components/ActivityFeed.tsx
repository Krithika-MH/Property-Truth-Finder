import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Pause, Play, AlertCircle } from 'lucide-react';
import { ActivityFeedItem } from '../api';

interface ActivityFeedProps {
  items: ActivityFeedItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items }) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items, isPaused]);

  return (
    <div
      className="bg-[#0B1F3A] rounded-2xl border border-[#14325C] flex flex-col h-full shadow-sm overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="bg-[#0F274A] px-4 py-2.5 flex items-center justify-between border-b border-[#14325C] shrink-0">
        <div className="flex items-center gap-2 text-white">
          <Terminal className="w-4 h-4 text-[#14B8A6]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Agent Activity Feed
          </h4>
          <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-400 font-mono">
            {items.length}
          </span>
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 py-0.5 px-2 rounded bg-[#14325C] hover:bg-[#1D457D] transition-colors"
          title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll on hover'}
        >
          {isPaused ? (
            <>
              <Play className="w-3 h-3 text-[#14B8A6]" />
              <span>Paused</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-slate-400" />
              <span>Auto-scroll</span>
            </>
          )}
        </button>
      </div>

      {/* Monospace Feed Lines */}
      <div
        ref={containerRef}
        aria-live="polite"
        className="flex-1 p-3.5 overflow-y-auto space-y-2 font-mono text-[11px] leading-relaxed select-text"
      >
        {items.length === 0 ? (
          <div className="text-slate-500 italic p-4 text-center">
            Initializing TinyFish automation session...
          </div>
        ) : (
          items.map((item) => {
            const isError = item.isError;
            const isRetry = item.isRetry;

            let rowClass = 'text-slate-300 hover:bg-[#14325C]/50 px-1.5 py-1 rounded transition-colors';
            if (isError) {
              rowClass = 'text-rose-400 bg-rose-950/40 border border-rose-900/50 px-1.5 py-1 rounded font-semibold';
            } else if (isRetry) {
              rowClass = 'text-amber-300 bg-amber-950/40 border border-amber-900/50 px-1.5 py-1 rounded font-semibold';
            }

            return (
              <div key={item.id} className={rowClass}>
                <span className="text-slate-500 mr-2 shrink-0">{item.ts}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 uppercase bg-slate-800 text-teal-300 border border-slate-700">
                  {item.agentId}
                </span>
                <span>{item.purpose}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
