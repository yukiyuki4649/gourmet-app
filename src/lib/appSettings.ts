import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AreaCategory, CuisineCategory } from './categories';

export interface MapCenter {
  lat: number;
  lng: number;
}

/** Shared, admin-managed settings — stored in Firestore, edited only by people with category-management permission. */
export interface AppSettings {
  categories: AreaCategory[];
  cuisineCategories: CuisineCategory[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  categories: [],
  cuisineCategories: [],
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
  };
}

/** Persists the whole shared-settings object at once — this is the single "save" action for the admin settings page. */
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await setDoc(settingsDocRef(), settings);
}
