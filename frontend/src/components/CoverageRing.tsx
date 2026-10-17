import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface CoverageRingProps {
  coveragePct: number;
  fieldsVerified: number;
  fieldsCompared: number;
  matchedCount: number;
  mismatchCount: number;
  notVerifiedCount: number;
}

export const CoverageRing: React.FC<CoverageRingProps> = ({
  coveragePct,
  fieldsVerified,
  fieldsCompared,
  matchedCount,
  mismatchCount,
  notVerifiedCount,
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (coveragePct / 100) * circumference;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-5">
        {/* SVG Ring */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96" aria-label={`Verification coverage ${coveragePct}%`}>
            {/* Background Track */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-slate-100"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Animated Progress Track */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-[#0F9D8A] transition-all duration-1000 ease-out"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-extrabold text-[#0B1F3A] tracking-tight">
              {coveragePct}%
            </span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Coverage
            </span>
          </div>
        </div>

        {/* Text description */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A]">
              Verification Coverage
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
              Cross-checked
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            <strong>{fieldsVerified}</strong> of <strong>{fieldsCompared}</strong> key parameters independently verified across public sources.
          </p>
          <p className="text-[11px] text-slate-400 mt-1 italic">
            Never a legal trust score; measures objective cross-source corroboration.
          </p>
        </div>
      </div>

      {/* Metric Breakdown Chips */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-around sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8F8EE] border border-[#B8E6C8] text-[#16A34A]">
          <CheckCircle2 className="w-4 h-4" />
          <div className="text-xs">
            <span className="font-bold text-sm block leading-none">{matchedCount}</span>
            <span className="text-[10px] font-semibold text-emerald-800">Matched</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FDECEC] border border-[#F7C5C5] text-[#DC2626]">
          <AlertTriangle className="w-4 h-4" />
          <div className="text-xs">
            <span className="font-bold text-sm block leading-none">{mismatchCount}</span>
            <span className="text-[10px] font-semibold text-rose-800">Mismatch</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FEF6E0] border border-[#FADCA0] text-[#B45309]">
          <HelpCircle className="w-4 h-4" />
          <div className="text-xs">
            <span className="font-bold text-sm block leading-none">{notVerifiedCount}</span>
            <span className="text-[10px] font-semibold text-amber-800">Not verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
