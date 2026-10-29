import React from 'react';
import { getStatusColor } from '../utils/formatters';
import type { BookingStatus, ResourceStatus, ConditionRating, IncidentStatus, UserRole } from '../types';

interface StatusBadgeProps {
  status: BookingStatus | ResourceStatus | ConditionRating | IncidentStatus | UserRole;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  label,
}) => {
  const colors = getStatusColor(status);

  const displayLabel = label || status.replace(/_/g, ' ');

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 tracking-wider',
    md: 'text-[11px] px-2 py-0.5 tracking-wider',
    lg: 'text-xs px-2.5 py-1 tracking-wider font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase border rounded-xs transition-colors ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-xs shrink-0 ${colors.dot}`} />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
