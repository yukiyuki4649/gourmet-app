export type Visibility = 'public' | 'private';

export interface PhotoInfo {
  url: string;
  creditName: string;
  creditUrl: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  area: string;
  overallRating: string;
  tasteRating: string;
  valuRating: string;
  notes: string;
  latitude: number;
  longitude: number;
  geocoded: boolean;
  geocodedAt?: Date;
  addedBy: string;
  addedByUid?: string;
  visibility: Visibility;
  visibleToUids: string[];
  exteriorPhoto?: PhotoInfo | null;
  dishPhoto?: PhotoInfo | null;
  customLink?: string;
  recommendedIds?: string[];
  isLunch?: boolean;
}

export interface RestaurantHistoryEntry {
  id: string;
  snapshot: Partial<Restaurant>;
  editedBy: string;
  editedAt: unknown;
}

export interface RestaurantInput {
  name: string;
  cuisine: string;
  area: string;
  overallRating: string;
  tasteRating: string;
  valuRating: string;
  notes: string;
  addedBy: string;
  addedByUid: string;
  visibility: Visibility;
  visibleToUids: string[];
  exteriorPhoto?: PhotoInfo | null;
  dishPhoto?: PhotoInfo | null;
  customLink?: string;
  recommendedIds?: string[];
  isLunch?: boolean;
}
