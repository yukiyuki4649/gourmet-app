import { Restaurant } from '../types/restaurant';

export interface RestaurantFilters {
  effectiveAreas: string[] | null;
  effectiveCuisines: string[] | null;
  person: string;
}

export function applyRestaurantFilters(restaurants: Restaurant[], filters: RestaurantFilters): Restaurant[] {
  let result = restaurants;

  if (filters.effectiveAreas) {
    const areas = filters.effectiveAreas;
    result = result.filter(r => areas.includes(r.area));
  }
  if (filters.effectiveCuisines) {
    const cuisines = filters.effectiveCuisines;
    result = result.filter(r => cuisines.includes(r.cuisine));
  }
  if (filters.person) {
    result = result.filter(r => r.addedBy === filters.person);
  }

  return result;
}
