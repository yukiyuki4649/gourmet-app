import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Restaurant, RestaurantInput, RestaurantHistoryEntry } from '../types/restaurant';

const COLLECTION_NAME = 'restaurants';
const HISTORY_SUBCOLLECTION = 'history';

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Firestore security rules can only allow a broad "list" query when the query's own
 * where-clauses provably satisfy the rule for every possible match — an unfiltered
 * query can't be checked that way and is rejected outright. So instead of one query
 * over the whole collection, we run one targeted query per visibility case the
 * current viewer is allowed to see, then merge and re-sort the results client-side.
 */
export async function getAllRestaurants(currentUid: string | null, isAdmin: boolean): Promise<Restaurant[]> {
  const restaurantsRef = collection(db, COLLECTION_NAME);
  const queries = [query(restaurantsRef, where('visibility', '==', 'public'))];

  if (currentUid) {
    if (isAdmin) {
      queries.push(query(restaurantsRef, where('visibility', '==', 'private')));
    } else {
      queries.push(
        query(
          restaurantsRef,
          where('visibility', '==', 'private'),
          where('addedByUid', '==', currentUid),
        ),
      );
      queries.push(
        query(
          restaurantsRef,
          where('visibility', '==', 'private'),
          where('visibleToUids', 'array-contains', currentUid),
        ),
      );
    }
  }

  const snapshots = await Promise.all(queries.map(q => getDocs(q)));

  const merged = new Map<string, Restaurant>();
  for (const snapshot of snapshots) {
    for (const docSnap of snapshot.docs) {
      merged.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Restaurant);
    }
  }

  return Array.from(merged.values()).sort((a, b) => toMillis(a.geocodedAt) - toMillis(b.geocodedAt));
}

export async function addRestaurant(data: RestaurantInput & { latitude: number; longitude: number }): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    geocoded: true,
    geocodedAt: new Date(),
  });
  return docRef.id;
}

/** Snapshots the restaurant's current state into its history subcollection before overwriting it. */
async function recordHistorySnapshot(id: string, editedBy: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await addDoc(collection(db, COLLECTION_NAME, id, HISTORY_SUBCOLLECTION), {
    snapshot: snap.data(),
    editedBy,
    editedAt: new Date(),
  });
}

export async function updateRestaurant(id: string, data: Partial<Restaurant>, editedBy: string): Promise<void> {
  await recordHistorySnapshot(id, editedBy);
  await updateDoc(doc(db, COLLECTION_NAME, id), data);
}

export async function bulkUpdateRestaurants(ids: string[], data: Partial<Restaurant>): Promise<void> {
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, COLLECTION_NAME, id), data);
  }
  await batch.commit();
}

/** Renames an area (or cuisine) across every restaurant that currently has the old value. */
async function renameFieldValue(field: 'area' | 'cuisine', oldValue: string, newValue: string): Promise<void> {
  const restaurantsRef = collection(db, COLLECTION_NAME);
  const snap = await getDocs(query(restaurantsRef, where(field, '==', oldValue)));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { [field]: newValue }));
  await batch.commit();
}

export function renameArea(oldName: string, newName: string): Promise<void> {
  return renameFieldValue('area', oldName, newName);
}

export function renameCuisine(oldName: string, newName: string): Promise<void> {
  return renameFieldValue('cuisine', oldName, newName);
}

export async function getRestaurantHistory(id: string): Promise<RestaurantHistoryEntry[]> {
  const historyRef = collection(db, COLLECTION_NAME, id, HISTORY_SUBCOLLECTION);
  const snap = await getDocs(query(historyRef, orderBy('editedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RestaurantHistoryEntry);
}

export async function deleteRestaurant(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

export async function bulkImportRestaurants(
  restaurants: Array<RestaurantInput & { latitude: number; longitude: number }>,
): Promise<void> {
  for (const restaurant of restaurants) {
    await addRestaurant(restaurant);
  }
}
