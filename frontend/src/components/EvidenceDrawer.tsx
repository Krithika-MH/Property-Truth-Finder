import React from 'react';
import { X, ExternalLink, ShieldCheck, Clock, Hash, FileText } from 'lucide-react';
import { Evidence } from '../types';

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  evidenceItems: Evidence[];
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  title,
  evidenceItems,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          aria-labelledby="drawer-title"
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200"
        >
          {/* Header */}
          <div className="bg-[#0B1F3A] text-white p-5 flex items-center justify-between border-b border-[#14325C]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#14325C] text-[#14B8A6]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 id="drawer-title" className="text-sm font-bold text-white">
                  Evidence Ledger Record
                </h3>
                <p className="text-xs text-slate-300 truncate max-w-[260px]">{title}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#14325C] transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Evidence List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="text-xs text-slate-500 italic">
              Showing {evidenceItems.length} verifiable evidence records gathered by TinyFish web agents:
            </div>

            {evidenceItems.map((ev) => (
              <div
                key={ev.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors shadow-sm"
              >
                {/* Top Badge: ID & Source */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0B1F3A] text-white font-mono text-xs font-bold">
                    {ev.id}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    {ev.source_name} ({ev.source_type})
                  </span>
                </div>

                {/* Field & Exact Monospace Value */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {ev.field}
                  </div>
                  <div className="mt-1 font-mono text-xs sm:text-sm bg-white p-2.5 rounded-lg border border-slate-200 text-slate-900 break-all">
                    {typeof ev.value === 'object' ? JSON.stringify(ev.value, null, 2) : String(ev.value)}
                  </div>
                </div>

                {/* Step Note if available */}
                {ev.note && (
                  <p className="text-xs text-slate-600 bg-amber-50/70 p-2 rounded border border-amber-200/60">
                    <strong>Note:</strong> {ev.note}
                  </p>
                )}

                {/* Metadata: URL, Retrieval Time, Run ID */}
                <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                  {ev.url && (
                    <div className="flex items-center gap-1.5 truncate">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-700 hover:text-teal-900 underline truncate font-mono"
                      >
                        {ev.url}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Captured: {ev.retrieved_at}</span>
                  </div>

                  {ev.run_id && (
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono truncate">Run ID: {ev.run_id}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-[#0B1F3A] hover:bg-[#14325C] text-white text-xs font-semibold transition-colors"
            >
              Done Reviewing Evidence
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
