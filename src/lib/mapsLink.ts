/** A Google Maps search URL for this restaurant — no API key required, just a search query URL. */
export function googleMapsSearchUrl(name: string, area: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${area}`)}`;
}
