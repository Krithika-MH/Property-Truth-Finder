import React, { useState } from 'react';
import { ShieldCheck, HelpCircle, Building2, Calendar, FileQuestion, ArrowUpRight } from 'lucide-react';
import { Finding, Evidence } from '../types';
import { StatusChip } from './StatusChip';
import { AttentionBadge } from './AttentionBadge';
import { EvidenceDrawer } from './EvidenceDrawer';

interface FindingCardProps {
  finding: Finding;
  evidenceLedger: Evidence[];
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, evidenceLedger }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter linked evidence
  const linkedEvidence = evidenceLedger.filter((e) => finding.evidence_ids.includes(e.id));

  // Check icon
  const getIcon = () => {
    switch (finding.check_id) {
      case 'A':
        return <ShieldCheck className="w-5 h-5 text-teal-600" />;
      case 'B':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'C':
        return <HelpCircle className="w-5 h-5 text-indigo-600" />;
      case 'D':
        return <Calendar className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="card-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
      <div className="p-5 sm:p-6 space-y-4">
        {/* Top Header: Check ID, Title, Status Chip, Attention Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
              {getIcon()}
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Check {finding.check_id}
              </span>
              <h3 className="text-base font-bold text-[#0B1F3A] leading-tight">
                {finding.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {finding.attention === 'HIGH' && <AttentionBadge level="HIGH" />}
            <StatusChip status={finding.status} />
          </div>
        </div>

        {/* Headline */}
        <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
          {finding.headline}
        </div>

        {/* Explanation with Evidence Link styling */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {finding.explanation}
        </p>

        {/* Mini Comparison Table */}
        {finding.rows && finding.rows.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Field</th>
                  <th className="py-2 px-3">Listing</th>
                  <th className="py-2 px-3">Builder</th>
                  <th className="py-2 px-3">RERA</th>
                  <th className="py-2 px-2 text-center">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {finding.rows.slice(0, 4).map((row, idx) => {
                  let dotColor = 'bg-[#16A34A]';
                  if (row.verdict === 'MISMATCH') dotColor = 'bg-[#DC2626]';
                  if (row.verdict === 'NOT_VERIFIED') dotColor = 'bg-[#B45309]';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">
                        {row.field}
                      </td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-[110px]" title={row.listing_value}>
                        {row.listing_value || 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-[110px]" title={row.builder_value}>
                        {row.builder_value || 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-[110px]" title={row.rera_value}>
                        {row.rera_value || 'N/A'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`}
                          title={row.verdict}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Ask the Builder Questions */}
        {finding.buyer_questions && finding.buyer_questions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B1F3A] mb-2">
              <FileQuestion className="w-3.5 h-3.5 text-teal-600" />
              <span>Questions to ask the builder:</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
              {finding.buyer_questions.map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Card Footer: View Evidence Drawer Button */}
      <div className="no-print bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">
          {linkedEvidence.length} evidence citation(s)
        </span>

        <button
          onClick={() => setDrawerOpen(true)}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline focus-visible:ring-1 focus-visible:ring-teal-500 p-1 rounded"
        >
          <span>View evidence</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slide-over Evidence Drawer */}
      <EvidenceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={finding.title}
        evidenceItems={linkedEvidence}
      />
    </div>
  );
};
