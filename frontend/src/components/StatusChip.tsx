import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { Status } from '../types';

interface StatusChipProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'md', showTooltip = true }) => {
  let icon = <CheckCircle2 className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
  let label = 'Matched';
  let colorClasses = 'bg-[#E8F8EE] text-[#16A34A] border-[#B8E6C8]';
  let tooltip = 'Two checked sources show the same value (within a small tolerance).';

  if (status === 'MISMATCH') {
    icon = <AlertTriangle className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
    label = 'Mismatch';
    colorClasses = 'bg-[#FDECEC] text-[#DC2626] border-[#F7C5C5]';
    tooltip = 'Two checked sources show different values. Ask the builder which is current and get it in writing.';
  } else if (status === 'NOT_VERIFIED') {
    icon = <HelpCircle className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />;
    label = 'Not verified';
    colorClasses = 'bg-[#FEF6E0] text-[#B45309] border-[#FADCA0]';
    tooltip = 'We could not confirm this. That is not a finding against the property; it means more checking is needed.';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1 font-medium',
    md: 'px-2.5 py-1 text-xs sm:text-sm gap-1.5 font-semibold',
    lg: 'px-3.5 py-1.5 text-sm sm:text-base gap-2 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${colorClasses} ${sizeClasses} select-none transition-colors duration-150`}
      title={showTooltip ? tooltip : undefined}
      role="status"
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
