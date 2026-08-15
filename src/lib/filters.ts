import { Restaurant } from '../types/restaurant';

export type LunchFilter = '' | 'lunch' | 'notLunch';

// '' = すべて (no filter), 'unrated' = 未評価(overallRatingが空文字)のみ, それ以外は完全一致。
export type RatingFilter = '' | 'A' | 'B' | 'C' | 'D' | 'unrated';

export interface RestaurantFilters {
  effectiveAreas: string[] | null;
  effectiveCuisines: string[] | null;
  person: string;
  lunch?: LunchFilter;
  rating?: RatingFilter;
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
  if (filters.rating === 'unrated') {
    result = result.filter(r => !r.overallRating);
  } else if (filters.rating) {
    result = result.filter(r => r.overallRating === filters.rating);
  }

  return result;
}
