import type { Severity } from './types';

export const SEVERITY_THRESHOLDS = {
  low: 5,
  medium: 10,
} as const;

export function getSeverity(smellCount: number): Severity {
  if (smellCount <= SEVERITY_THRESHOLDS.low) return 'low';
  if (smellCount <= SEVERITY_THRESHOLDS.medium) return 'medium';
  return 'high';
}

export function getSeverityColor(severity: Severity, theme?: {
  palette: {
    success: { main: string };
    warning: { main: string };
    error: { main: string };
    grey: { [key: number]: string };
  };
}): string {
  if (theme) {
    switch (severity) {
      case 'low':
        return theme.palette.success.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'high':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  }

  switch (severity) {
    case 'low':
      return '#4caf50';
    case 'medium':
      return '#ff9800';
    case 'high':
      return '#f44336';
    default:
      return '#757575';
  }
}
