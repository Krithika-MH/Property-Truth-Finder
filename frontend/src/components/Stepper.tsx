import React from 'react';
import { Check, Loader2, Circle, AlertTriangle } from 'lucide-react';

interface StepperProps {
  currentStage: string; // LISTING, DISCOVERY, INVESTIGATE, COMPARE, REPORT
}

const STAGES = [
  { id: 'LISTING', label: 'Read listing', desc: 'Agent L extracting specs' },
  { id: 'DISCOVERY', label: 'Find builder source', desc: 'Agent D ranking domains' },
  { id: 'INVESTIGATE', label: 'Investigate builder + RERA', desc: 'Parallel agents B & R' },
  { id: 'COMPARE', label: 'Compare claims', desc: 'Deterministic Python audit' },
  { id: 'REPORT', label: 'Write report', desc: 'Evidence ledger & checklist' },
];

export const Stepper: React.FC<StepperProps> = ({ currentStage }) => {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <nav aria-label="Investigation stages" className="w-full">
      {/* Desktop Vertical Layout */}
      <div className="hidden lg:flex flex-col space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-1">
          Investigation Stages
        </h4>
        <ol className="relative border-l-2 border-slate-200 ml-3.5 space-y-5">
          {STAGES.map((stage, idx) => {
            const isDone = idx < activeIdx;
            const isActive = idx === activeIdx;
            const isPending = idx > activeIdx;

            return (
              <li key={stage.id} className="ml-5 relative">
                {/* Status Indicator Icon */}
                <span
                  className={`absolute -left-[31px] top-0 flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isActive
                      ? 'bg-white border-[#0F9D8A] text-[#0F9D8A] shadow-[0_0_12px_rgba(15,157,138,0.5)]'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isActive ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F9D8A] animate-ping" />
                  ) : (
                    <Circle className="w-2.5 h-2.5 fill-slate-300 text-slate-300" />
                  )}
                </span>

                <div>
                  <h5
                    className={`text-xs font-bold leading-tight ${
                      isActive ? 'text-[#0B1F3A] text-sm' : isDone ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">{stage.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile Horizontal Stepper */}
      <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm overflow-x-auto gap-2">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeIdx;
          const isActive = idx === activeIdx;

          return (
            <div key={stage.id} className="flex items-center gap-1.5 shrink-0">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-[#0F9D8A] text-white animate-pulse'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
              </span>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  isActive ? 'text-[#0B1F3A]' : isDone ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {stage.label}
              </span>
              {idx < STAGES.length - 1 && <span className="text-slate-300 mx-1">&rarr;</span>}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
