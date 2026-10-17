import React from 'react';
import { ExternalLink, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { ComparisonRow, Finding } from '../types';

interface ComparisonMatrixProps {
  findings: Finding[];
  listingUrl?: string;
  builderUrl?: string;
  reraUrl?: string;
}

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  findings,
  listingUrl,
  builderUrl,
  reraUrl,
}) => {
  // Aggregate all comparison rows across findings
  const allRows: ComparisonRow[] = [];
  findings.forEach((f) => {
    f.rows.forEach((r) => {
      allRows.push(r);
    });
  });

  return (
    <div className="card-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Table Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A]">
            Cross-Source Comparison Matrix
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Side-by-side reconciliation of listing advertisement against official builder disclosures and Karnataka RERA
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1 text-[#16A34A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" /> Matched
          </span>
          <span className="flex items-center gap-1 text-[#DC2626]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Mismatch
          </span>
          <span className="flex items-center gap-1 text-[#B45309]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" /> Not verified
          </span>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-1/4">Field / Parameter</th>
              <th className="py-3 px-4 w-1/4">
                <div className="flex items-center justify-between">
                  <span>1. Listing Portal</span>
                  {listingUrl && (
                    <a href={listingUrl} target="_blank" rel="noreferrer" className="no-print text-teal-700 hover:text-teal-900" title="Open listing">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </th>
              <th className="py-3 px-4 w-1/4">
                <div className="flex items-center justify-between">
                  <span>2. Builder Official</span>
                  {builderUrl && (
                    <a href={builderUrl} target="_blank" rel="noreferrer" className="no-print text-teal-700 hover:text-teal-900" title="Open builder site">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </th>
              <th className="py-3 px-4 w-1/4">
                <div className="flex items-center justify-between">
                  <span>3. Karnataka RERA</span>
                  {reraUrl && (
                    <a href={reraUrl} target="_blank" rel="noreferrer" className="no-print text-teal-700 hover:text-teal-900" title="Open K-RERA record">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {allRows.map((row, idx) => {
              let dotColor = 'bg-[#16A34A]';
              let verdictBadge = 'bg-[#E8F8EE] text-[#16A34A] border-[#B8E6C8]';
              if (row.verdict === 'MISMATCH') {
                dotColor = 'bg-[#DC2626]';
                verdictBadge = 'bg-[#FDECEC] text-[#DC2626] border-[#F7C5C5]';
              } else if (row.verdict === 'NOT_VERIFIED') {
                dotColor = 'bg-[#B45309]';
                verdictBadge = 'bg-[#FEF6E0] text-[#B45309] border-[#FADCA0]';
              }

              return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {/* Field Name + Verdict Dot */}
                  <td className="py-3 px-4 font-semibold text-slate-800 align-top">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} title={row.verdict} />
                      <span>{row.field}</span>
                    </div>
                    {row.note && (
                      <div className="text-[11px] text-slate-500 font-normal mt-1 leading-normal">
                        {row.note}
                      </div>
                    )}
                  </td>

                  {/* Listing Cell */}
                  <td className="py-3 px-4 font-mono text-xs text-slate-700 align-top break-words">
                    {row.listing_value || <span className="text-slate-400 italic font-sans text-xs">Not available</span>}
                  </td>

                  {/* Builder Cell */}
                  <td className="py-3 px-4 font-mono text-xs text-slate-700 align-top break-words">
                    {row.builder_value || <span className="text-slate-400 italic font-sans text-xs">Not available</span>}
                  </td>

                  {/* RERA Cell */}
                  <td className="py-3 px-4 font-mono text-xs text-slate-700 align-top break-words">
                    {row.rera_value || <span className="text-slate-400 italic font-sans text-xs">Not available</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
