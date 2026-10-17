import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Attention } from '../types';

interface AttentionBadgeProps {
  level: Attention;
}

export const AttentionBadge: React.FC<AttentionBadgeProps> = ({ level }) => {
  if (level === 'INFO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EAF1FE] text-[#2563EB] border border-[#BFDBFE]">
        INFO
      </span>
    );
  }
  if (level === 'ATTENTION') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF6E0] text-[#B45309] border border-[#FADCA0]">
        ATTENTION
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#FDECEC] text-[#DC2626] border border-[#FCA5A5] animate-pulse">
      <AlertCircle className="w-3 h-3" />
      HIGH ATTENTION
    </span>
  );
};
