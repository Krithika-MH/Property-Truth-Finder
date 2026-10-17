import React from 'react';
import { Sparkles, Check, Clock, AlertCircle } from 'lucide-react';
import { Finding } from '../types';

interface AmenitiesTableProps {
  findingC: Finding;
}

export const AmenitiesTable: React.FC<AmenitiesTableProps> = ({ findingC }) => {
  return (
    <div className="card-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A]">
              Amenity Verification Ladder (Check C Detail)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cross-checking marketing claims against official builder portal status (Available vs Planned vs Not Listed)
          </p>
        </div>
      </div>

      {/* Note about Evidence Ladder */}
      <div className="bg-indigo-50/60 border-b border-indigo-100 p-3.5 text-xs text-indigo-900 leading-relaxed">
        <strong>Evidence Ladder Principle:</strong> An amenity marked <em>"Supported"</em> confirms the builder lists it on their official website. It does <strong>not</strong> prove that the amenity is currently constructed or functional. Always inspect the physical site.
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/60 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <th className="py-2.5 px-4">Amenity</th>
              <th className="py-2.5 px-4">Listing Status</th>
              <th className="py-2.5 px-4">Official Builder Status</th>
              <th className="py-2.5 px-4">Reconciliation Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {findingC.rows.map((row, idx) => {
              let chipClass = 'bg-[#E8F8EE] text-[#16A34A] border-[#B8E6C8]';
              let verdictLabel = 'SUPPORTED';
              let icon = <Check className="w-3.5 h-3.5" />;

              if (row.verdict === 'MISMATCH') {
                chipClass = 'bg-[#FDECEC] text-[#DC2626] border-[#F7C5C5]';
                verdictLabel = 'CONFLICT (Planned)';
                icon = <Clock className="w-3.5 h-3.5" />;
              } else if (row.verdict === 'NOT_VERIFIED') {
                chipClass = 'bg-[#FEF6E0] text-[#B45309] border-[#FADCA0]';
                verdictLabel = 'NOT FOUND ON SITE';
                icon = <AlertCircle className="w-3.5 h-3.5" />;
              }

              return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">
                    {row.field}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {row.listing_value || 'Advertised'}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-700">
                    {row.builder_value || 'Not listed'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${chipClass}`}>
                      {icon}
                      <span>{verdictLabel}</span>
                    </span>
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
