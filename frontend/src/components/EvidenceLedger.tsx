import React, { useState } from 'react';
import { Database, Download, ExternalLink, Filter } from 'lucide-react';
import { Evidence } from '../types';

interface EvidenceLedgerProps {
  evidence: Evidence[];
}

export const EvidenceLedger: React.FC<EvidenceLedgerProps> = ({ evidence }) => {
  const [selectedSource, setSelectedSource] = useState<string>('ALL');

  const sources = ['ALL', ...Array.from(new Set(evidence.map((e) => e.source_type)))];

  const filteredEvidence = selectedSource === 'ALL'
    ? evidence
    : evidence.filter((e) => e.source_type === selectedSource);

  const handleDownloadCSV = () => {
    const headers = ['Evidence ID', 'Source Type', 'Source Name', 'Field', 'Value', 'URL', 'Retrieved At (IST)', 'Run ID', 'Note'];
    const rows = filteredEvidence.map((e) => [
      `"${e.id}"`,
      `"${e.source_type}"`,
      `"${e.source_name}"`,
      `"${e.field}"`,
      `"${String(typeof e.value === 'object' ? JSON.stringify(e.value) : e.value).replace(/"/g, '""')}"`,
      `"${e.url || ''}"`,
      `"${e.retrieved_at}"`,
      `"${e.run_id || ''}"`,
      `"${e.note || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PropertyTruthFinder_EvidenceLedger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-600" />
            <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A]">
              Verifiable Evidence Ledger
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable audit record of raw values, timestamps, and agent run IDs backing every report claim
          </p>
        </div>

        <div className="no-print flex items-center gap-3">
          {/* Source Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-white p-1 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold text-slate-700 focus:ring-0 cursor-pointer pr-4"
              aria-label="Filter evidence by source"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All Sources' : s}
                </option>
              ))}
            </select>
          </div>

          {/* CSV Download */}
          <button
            onClick={handleDownloadCSV}
            className="px-3 py-1.5 rounded-lg bg-[#0F9D8A] hover:bg-[#0D8776] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-16">ID</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Field</th>
              <th className="py-3 px-4">Raw Extracted Value</th>
              <th className="py-3 px-4">Timestamp (IST)</th>
              <th className="py-3 px-4">Source URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {filteredEvidence.map((ev) => (
              <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900">{ev.id}</td>
                <td className="py-3 px-4 font-sans text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                    {ev.source_name}
                  </span>
                </td>
                <td className="py-3 px-4 font-sans font-medium text-slate-800">
                  {ev.field}
                </td>
                <td className="py-3 px-4 text-slate-700 break-all max-w-xs">
                  {typeof ev.value === 'object' ? JSON.stringify(ev.value) : String(ev.value)}
                </td>
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                  {ev.retrieved_at}
                </td>
                <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate">
                  {ev.url ? (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 hover:text-teal-900 underline inline-flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span className="truncate">{ev.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    'N/A'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
