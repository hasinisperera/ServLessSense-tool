/**
 * Split a file path into segments regardless of Windows or Unix separators.
 */
export function splitPathSegments(filePath: string): string[] {
  return filePath.split(/[/\\]/).filter(Boolean);
}

/**
 * Get the basename from a cross-platform file path.
 */
export function getPathBasename(filePath: string): string {
  const segments = splitPathSegments(filePath);
  return segments[segments.length - 1] ?? filePath;
}

/**
 * Join path segments using forward slashes for consistent tree keys.
 */
export function joinPathSegments(segments: string[]): string {
  return segments.join('/');
}
