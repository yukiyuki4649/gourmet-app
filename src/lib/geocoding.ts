export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  success: boolean;
}

const DELAY_MS = 100;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function geocodeRestaurants(
  restaurants: Array<{ name: string; area: string }>,
  apiKey: string,
): Promise<GeocodeResult[]> {
  const results: GeocodeResult[] = [];

  for (const restaurant of restaurants) {
    await sleep(DELAY_MS);

    const query = `${restaurant.name} ${restaurant.area} 飲食店`;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
      );

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        results.push({
          name: restaurant.name,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          address: result.formatted_address,
          success: true,
        });
      } else {
        results.push({
          name: restaurant.name,
          latitude: 0,
          longitude: 0,
          address: '',
          success: false,
        });
      }
    } catch (error) {
      console.error(`Geocoding error for ${restaurant.name}:`, error);
      results.push({
        name: restaurant.name,
        latitude: 0,
        longitude: 0,
        address: '',
        success: false,
      });
    }
  }

  return results;
}
