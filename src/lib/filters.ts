import { Restaurant } from '../types/restaurant';

export type LunchFilter = '' | 'lunch' | 'notLunch';

export interface RestaurantFilters {
  effectiveAreas: string[] | null;
  effectiveCuisines: string[] | null;
  person: string;
  lunch?: LunchFilter;
}

export function applyRestaurantFilters(restaurants: Restaurant[], filters: RestaurantFilters): Restaurant[] {
  let result = restaurants;

  if (filters.effectiveAreas) {
    const areas = filters.effectiveAreas;
    result = result.filter(r => areas.includes(r.area));
  }
  if (filters.effectiveCuisines) {
    const cuisines = filters.effectiveCuisines;
    result = result.filter(r => r.cuisines.some(c => cuisines.includes(c)));
  }
  if (filters.person) {
    result = result.filter(r => r.addedBy === filters.person);
  }
  if (filters.lunch === 'lunch') {
    result = result.filter(r => !!r.isLunch);
  } else if (filters.lunch === 'notLunch') {
    result = result.filter(r => !r.isLunch);
  }

  return result;
}
