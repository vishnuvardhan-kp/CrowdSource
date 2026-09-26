import { theme } from '../constants/theme';

export function formatStatusLabel(status?: string | null): string {
  if (!status) return 'Unknown';
  switch (status.toUpperCase()) {
    case 'DRAFT':
      return 'Draft';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return 'Pending Government Verification';
    case 'VALIDATED':
      return 'Validated';
    case 'REJECTED':
      return 'Rejected';
    case 'IN_PROGRESS':
    case 'PROJECT_INITIATED':
      return 'Action Initiated';
    case 'COMPLETED':
    case 'RESOLVED':
      return 'Resolved';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function getStatusTheme(status?: string | null) {
  if (!status) return theme.colors.status.draft;
  switch (status.toUpperCase()) {
    case 'DRAFT':
      return theme.colors.status.draft;
    case 'SUBMITTED':
      return theme.colors.status.submitted;
    case 'UNDER_REVIEW':
      return theme.colors.status.underReview;
    case 'VALIDATED':
      return theme.colors.status.validated;
    case 'REJECTED':
      return theme.colors.status.rejected;
    case 'IN_PROGRESS':
    case 'PROJECT_INITIATED':
      return theme.colors.status.inProgress;
    default:
      return theme.colors.status.draft;
  }
}

export function formatSeverityLabel(severity?: string | null): string {
  if (!severity) return 'Not Specified';
  switch (severity.toUpperCase()) {
    case 'SERIOUS':
      return 'High / Urgent';
    case 'MODERATE':
      return 'Moderate';
    case 'NOT_SURE':
      return 'Standard';
    default:
      return severity;
  }
}

export function formatDateSafe(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateSafe(dateStr);
  } catch {
    return '';
  }
}
