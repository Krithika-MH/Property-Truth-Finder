import React, { useState } from 'react';
import { CheckSquare, Copy, Check, Printer, ExternalLink, HelpCircle } from 'lucide-react';

interface BuyerChecklistProps {
  checklist: string[];
}

export const BuyerChecklist: React.FC<BuyerChecklistProps> = ({ checklist }) => {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = () => {
    const text = checklist.map((item, idx) => `[${checkedItems[idx] ? 'X' : ' '}] ${item}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Group items into categories
  const askBuilder = checklist.filter((_, i) => i < 3);
  const checkYourself = checklist.filter((_, i) => i >= 3 && i < 5);
  const beforeBooking = checklist.filter((_, i) => i >= 5);

  return (
    <div className="card-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-teal-600" />
            <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A]">
              Actionable Buyer Due Diligence Checklist
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Key verification tasks and legal checks before signing or parting with a booking token
          </p>
        </div>

        <div className="no-print flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Checklist'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#14325C] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Checklist</span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Section 1: Ask the builder */}
        {askBuilder.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded inline-block mb-3 border border-teal-200">
              1. Ask the Builder (In Writing)
            </h4>
            <div className="space-y-2.5">
              {askBuilder.map((item, idx) => {
                const isChecked = Boolean(checkedItems[idx]);
                return (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(idx)}
                      className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                    />
                    <span className={`text-xs sm:text-sm ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Check yourself */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-1 rounded inline-block mb-3 border border-blue-200">
            2. Check Yourself (Independent Verification)
          </h4>
          <div className="space-y-2.5">
            {checkYourself.map((item, idx) => {
              const globalIdx = idx + 3;
              const isChecked = Boolean(checkedItems[globalIdx]);
              return (
                <label
                  key={globalIdx}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCheck(globalIdx)}
                    className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span className={`text-xs sm:text-sm ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {item}
                  </span>
                </label>
              );
            })}

            {/* Static Guidance Box with Deep Links */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800">Official Portal Guidance:</div>
              <p>
                &bull; <strong>Karnataka RERA:</strong> Verify sanctioned tower layouts directly at{' '}
                <a
                  href="https://rera.karnataka.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 underline font-mono inline-flex items-center gap-0.5"
                >
                  rera.karnataka.gov.in <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <p>
                &bull; <strong>Title & Encumbrance:</strong> Inspect sub-registrar property records (Kaveri portal) for 15+ years of registered deeds and check e-Courts for pending civil litigation.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Before paying booking amount */}
        {beforeBooking.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-1 rounded inline-block mb-3 border border-rose-200">
              3. Before Paying a Booking Amount
            </h4>
            <div className="space-y-2.5">
              {beforeBooking.map((item, idx) => {
                const globalIdx = idx + 5;
                const isChecked = Boolean(checkedItems[globalIdx]);
                return (
                  <label
                    key={globalIdx}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(globalIdx)}
                      className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                    />
                    <span className={`text-xs sm:text-sm ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
