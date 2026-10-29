import type { BookingStatus, ResourceStatus, ConditionRating, IncidentStatus, UserRole } from '../types';

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoString);
  } catch {
    return isoString;
  }
}

export function getStatusColor(status: BookingStatus | ResourceStatus | ConditionRating | IncidentStatus | UserRole): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    // Available / Approved / Good
    case 'approved':
    case 'available':
    case 'excellent':
    case 'resolved':
      return {
        bg: 'bg-[#183D30]/10',
        text: 'text-[#183D30]',
        border: 'border-[#183D30]/30',
        dot: 'bg-[#183D30]',
      };
    case 'checked_in':
    case 'in_use':
    case 'good':
      return {
        bg: 'bg-[#252722]',
        text: 'text-[#D8FF3E]',
        border: 'border-[#252722]',
        dot: 'bg-[#D8FF3E]',
      };
    case 'return_pending':
      return {
        bg: 'bg-[#AAB6A1]/25',
        text: 'text-[#183D30]',
        border: 'border-[#AAB6A1]',
        dot: 'bg-[#183D30]',
      };
    case 'pending':
    case 'pending_approval':
    case 'investigating':
    case 'fair':
    case 'minor_wear':
      return {
        bg: 'bg-[#EAE5D8]',
        text: 'text-[#6B5A2B]',
        border: 'border-[#D5CBB5]',
        dot: 'bg-[#B09848]',
      };
    case 'rejected':
    case 'cancelled':
    case 'damaged':
    case 'missing_components':
    case 'escalated':
    case 'retired':
      return {
        bg: 'bg-[#F2DEDE]',
        text: 'text-[#842029]',
        border: 'border-[#E8B4B8]',
        dot: 'bg-[#842029]',
      };
    case 'overdue':
      return {
        bg: 'bg-[#842029]',
        text: 'text-[#FFF]',
        border: 'border-[#842029]',
        dot: 'bg-[#D8FF3E] animate-pulse',
      };
    case 'incident_hold':
    case 'incident_review':
      return {
        bg: 'bg-[#F2DEDE]',
        text: 'text-[#842029]',
        border: 'border-[#842029]/40',
        dot: 'bg-[#842029]',
      };
    case 'other':
    case 'draft':
      return {
        bg: 'bg-[#E5E2D8]',
        text: 'text-[#565950]',
        border: 'border-[#DCD9CF]',
        dot: 'bg-[#7E8276]',
      };
    case 'maintenance':
    case 'waitlisted':
      return {
        bg: 'bg-[#E2E6DF]',
        text: 'text-[#2D4536]',
        border: 'border-[#AAB6A1]',
        dot: 'bg-[#2D4536]',
      };
    case 'completed':
    case 'checked_out':
      return {
        bg: 'bg-[#EAE7DC]',
        text: 'text-[#4A4D43]',
        border: 'border-[#DCD9CF]',
        dot: 'bg-[#7E8276]',
      };
    // Roles
    case 'admin':
      return {
        bg: 'bg-[#183D30]',
        text: 'text-[#D8FF3E]',
        border: 'border-[#183D30]',
        dot: 'bg-[#D8FF3E]',
      };
    case 'manager':
      return {
        bg: 'bg-[#252722]',
        text: 'text-[#F3F0E8]',
        border: 'border-[#252722]',
        dot: 'bg-[#D8FF3E]',
      };
    case 'owner':
      return {
        bg: 'bg-[#183D30]/15',
        text: 'text-[#183D30]',
        border: 'border-[#183D30]/30',
        dot: 'bg-[#183D30]',
      };
    case 'borrower':
    default:
      return {
        bg: 'bg-[#F3F0E8]',
        text: 'text-[#252722]',
        border: 'border-[#DCD9CF]',
        dot: 'bg-[#AAB6A1]',
      };
  }
}
