export type Visibility = 'public' | 'private';

export interface PhotoInfo {
  url: string;
  creditName: string;
  creditUrl: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
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
  // The actual enforcement field, read by Firestore security rules and queries — a flat,
  // deduped union of every selected group's members. visibilityGroupIds is metadata only,
  // recording which named groups (see VisibilityGroup in lib/appSettings.ts) this value
  // was derived from, so the edit form can show/re-select them and so admin can bulk-
  // resync affected restaurants when a group's own membership changes.
  visibleToUids: string[];
  visibilityGroupIds?: string[];
  exteriorPhoto?: PhotoInfo | null;
  dishPhoto?: PhotoInfo | null;
  customLink?: string;
  recommendedIds?: string[];
  isLunch?: boolean;
  deleted?: boolean;
}

export interface RestaurantHistoryEntry {
  id: string;
  snapshot: Partial<Restaurant>;
  editedBy: string;
  editedAt: unknown;
}

export interface RestaurantInput {
  name: string;
  cuisines: string[];
  area: string;
  overallRating: string;
  tasteRating: string;
  valuRating: string;
  notes: string;
  addedBy: string;
  addedByUid: string;
  visibility: Visibility;
  visibleToUids: string[];
  visibilityGroupIds?: string[];
  exteriorPhoto?: PhotoInfo | null;
  dishPhoto?: PhotoInfo | null;
  customLink?: string;
  recommendedIds?: string[];
  isLunch?: boolean;
}
