import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Scale } from 'lucide-react';

interface LimitationBannerProps {
  defaultExpanded?: boolean;
}

export const LimitationBanner: React.FC<LimitationBannerProps> = ({ defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section
      aria-labelledby="limitation-heading"
      className="card-print bg-[#FEF6E0] border border-[#FADCA0] rounded-2xl p-4 sm:p-5 text-[#854D0E] shadow-sm mb-6 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FDE68A] text-[#B45309] shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 id="limitation-heading" className="text-sm sm:text-base font-bold text-[#92400E]">
              What this report cannot tell you
            </h2>
            <p className="text-xs text-[#B45309]">
              Legal boundary disclosure and RERA scope limits
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="no-print p-1.5 rounded-lg hover:bg-[#FDE68A] text-[#92400E] transition-colors focus-visible:ring-2 focus-visible:ring-[#B45309]"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse limitation statement' : 'Expand limitation statement'}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#FDE68A] text-xs sm:text-sm leading-relaxed text-[#78350F]">
          <p>
            This report compares information published on a listing, a builder website and a RERA portal at the time shown.
            A successful RERA search does not prove that every detail is true, that the individual seller owns the flat,
            or that the property is free of legal issues. <strong>Not verified does not mean something is wrong</strong>,
            only that we could not confirm it. Before paying any amount, consider independent legal verification of title,
            approvals and encumbrances. This is an information aid, not legal advice or a guarantee.
          </p>
        </div>
      )}
    </section>
  );
};
