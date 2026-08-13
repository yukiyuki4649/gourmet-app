/**
 * Only http(s) URLs are safe to render as an href — anything else (javascript:, data:,
 * vbscript:, etc.) can execute arbitrary script when clicked. customLink is set by any
 * canEdit user but rendered to every visitor, so it must be validated at render time,
 * not just trusted because it came from Firestore.
 */
export function isSafeHref(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
