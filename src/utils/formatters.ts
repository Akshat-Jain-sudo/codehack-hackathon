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


export const FALLBACK_RESOURCE_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="%23183D30"><rect width="100%" height="100%" fill="%23183D30"/><rect x="20" y="20" width="760" height="560" fill="none" stroke="%23D8FF3E" stroke-width="2" stroke-dasharray="8 8" opacity="0.3"/><circle cx="400" cy="270" r="70" fill="none" stroke="%23D8FF3E" stroke-width="4"/><path d="M370 270h60M400 240v60" stroke="%23D8FF3E" stroke-width="4" stroke-linecap="round"/><text x="400" y="390" fill="%23F3F0E8" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle" letter-spacing="3">LABORATORY SPECIMEN</text><text x="400" y="420" fill="%23D8FF3E" font-family="monospace" font-size="12" text-anchor="middle" letter-spacing="2">AUTHENTICATED ASSET</text></svg>';

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
  const target = e.currentTarget;
  if (target.src !== FALLBACK_RESOURCE_IMAGE) {
    target.src = FALLBACK_RESOURCE_IMAGE;
  }
}
