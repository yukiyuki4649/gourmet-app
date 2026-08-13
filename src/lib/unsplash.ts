import { PhotoInfo } from '../types/restaurant';

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

interface UnsplashPhoto {
  urls: { regular: string; small: string };
  user: { name: string; links: { html: string } };
}

/**
 * Searches Unsplash for a stock photo matching the query and returns one at random
 * from the top results (so repeated calls / "re-roll" don't always return the same
 * photo). Returns null if no key is configured or nothing matched — callers should
 * treat that as "no photo available" rather than an error.
 */
export async function searchStockPhoto(query: string): Promise<PhotoInfo | null> {
  if (!ACCESS_KEY) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } },
    );
    if (!res.ok) return null;

    const data = await res.json();
    const results: UnsplashPhoto[] = data.results ?? [];
    if (results.length === 0) return null;

    const pick = results[Math.floor(Math.random() * results.length)];
    return {
      url: pick.urls.small,
      creditName: pick.user.name,
      creditUrl: pick.user.links.html,
    };
  } catch (error) {
    console.error('Unsplash search failed:', error);
    return null;
  }
}

export async function suggestRestaurantPhotos(cuisine: string): Promise<{
  exteriorPhoto: PhotoInfo | null;
  dishPhoto: PhotoInfo | null;
}> {
  const [exteriorPhoto, dishPhoto] = await Promise.all([
    searchStockPhoto(`${cuisine} restaurant storefront`),
    searchStockPhoto(`${cuisine} food dish`),
  ]);
  return { exteriorPhoto, dishPhoto };
}
