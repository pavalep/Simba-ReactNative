/**
 * Convert an ISO date string to a relative "time ago" label.
 * Examples: "just now", "2m ago", "1h ago", "Yesterday", "3d ago"
 */

/**
 * Format seconds to display duration.
 */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Infer whether a file is video based on its extension.
 */
export function isVideoFile(fileName: string): boolean {
  const videoExts = [
    'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg',
  ];
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return videoExts.includes(ext);
}

