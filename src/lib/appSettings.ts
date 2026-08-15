import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AreaCategory, CuisineCategory } from './categories';

export interface MapCenter {
  lat: number;
  lng: number;
}

/**
 * A named, admin-managed sharing group (e.g. "家族", "職場") — replaces picking
 * individual people per-restaurant. A private restaurant's visibleToUids is a
 * deduped union of every group referenced in its visibilityGroupIds; see
 * resyncPrivateRestaurantsWithVisibilityGroups in db.ts for how edits here
 * propagate back to already-saved restaurants.
 */
export interface VisibilityGroup {
  id: string;
  name: string;
  uids: string[];
}

/** Shared, admin-managed settings — stored in Firestore, edited only by people with category-management permission. */
export interface AppSettings {
  categories: AreaCategory[];
  cuisineCategories: CuisineCategory[];
  // Manually chosen display order for area/cuisine names (see sortByOrder in categories.ts).
  // Names not yet present here fall back to alphabetical, appended after the ranked ones.
  areaOrder: string[];
  cuisineOrder: string[];
  visibilityGroups: VisibilityGroup[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  categories: [],
  cuisineCategories: [],
  areaOrder: [],
  cuisineOrder: [],
  visibilityGroups: [],
};

function settingsDocRef() {
  return doc(db, 'settings', 'app');
}

export async function loadAppSettings(): Promise<AppSettings> {
  const snap = await getDoc(settingsDocRef());
  if (!snap.exists()) return DEFAULT_APP_SETTINGS;
  const data = snap.data();
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    cuisineCategories: Array.isArray(data.cuisineCategories) ? data.cuisineCategories : [],
    areaOrder: Array.isArray(data.areaOrder) ? data.areaOrder : [],
    cuisineOrder: Array.isArray(data.cuisineOrder) ? data.cuisineOrder : [],
    visibilityGroups: Array.isArray(data.visibilityGroups) ? data.visibilityGroups : [],
  };
}

/** Persists the whole shared-settings object at once — this is the single "save" action for the admin settings page. */
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await setDoc(settingsDocRef(), settings);
}
