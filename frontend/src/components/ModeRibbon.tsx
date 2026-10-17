import React from 'react';
import { AlertTriangle, History } from 'lucide-react';

interface ModeRibbonProps {
  mode: 'LIVE' | 'REPLAY' | 'MOCK';
  recordedAt?: string;
}

export const ModeRibbon: React.FC<ModeRibbonProps> = ({ mode, recordedAt }) => {
  if (mode === 'LIVE') return null;

  if (mode === 'MOCK') {
    return (
      <div className="ribbon-banner w-full bg-[#FEF6E0] border-b border-[#FADCA0] text-[#B45309] px-4 py-2 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
        <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
        <span>MOCK DATA, not a real investigation (offline development & test fixtures)</span>
      </div>
    );
  }

  // REPLAY
  const dateStr = recordedAt
    ? new Date(recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Oct 17, 2026';

  return (
    <div className="ribbon-banner w-full bg-[#EAF1FE] border-b border-[#BFDBFE] text-[#2563EB] px-4 py-2 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
      <History className="w-4 h-4 text-[#2563EB] shrink-0" />
      <span>Replay of a real run recorded on {dateStr}</span>
    </div>
  );
};
