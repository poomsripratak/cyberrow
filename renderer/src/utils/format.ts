/**
 * Shared formatting utilities for the rowing app.
 */

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatSplit(secondsPer500m: number | null | undefined): string {
  if (!secondsPer500m || secondsPer500m === Infinity || secondsPer500m <= 0) {
    return '-:--';
  }
  const mins = Math.floor(secondsPer500m / 60);
  const secs = Math.floor(secondsPer500m % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h${mins}m` : `${hrs}h`;
}

export function formatDateWithYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
}