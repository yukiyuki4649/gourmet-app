import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { Restaurant, RestaurantInput, RestaurantHistoryEntry } from '../types/restaurant';
import { VisibilityGroup } from './appSettings';

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
 * Cuisine used to be a single string field. Docs written before the switch to multiple
 * cuisines still have `cuisine: string` instead of `cuisines: string[]` in Firestore —
 * rather than running a migration script, older docs are normalized to the new shape
 * right here at read time. New writes always save `cuisines`, so this only matters for
 * documents nobody has edited since the change.
 */
function normalizeRestaurant(id: string, data: Record<string, unknown>): Restaurant {
  const cuisines = Array.isArray(data.cuisines)
    ? (data.cuisines as string[])
    : typeof data.cuisine === 'string' && data.cuisine
      ? [data.cuisine]
      : [];
  return { id, ...data, cuisines } as Restaurant;
}

/**
 * Firestore security rules can only allow a broad "list" query when the query's own
 * where-clauses provably satisfy the rule for every possible match — an unfiltered
 * query can't be checked that way and is rejected outright. So instead of one query
 * over the whole collection, we run one targeted query per visibility case the
 * current viewer is allowed to see, then merge and re-sort the results client-side.
 *
 * `deleted` is deliberately NOT part of any query here — it isn't referenced by the
 * security rules, so filtering on it client-side (in getAllRestaurants/
 * getDeletedRestaurants below) avoids ever needing a new composite index.
 */
async function fetchVisibleRestaurants(currentUid: string | null, isAdmin: boolean): Promise<Restaurant[]> {
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
      merged.set(docSnap.id, normalizeRestaurant(docSnap.id, docSnap.data()));
    }
  }

  return Array.from(merged.values());
}

export async function getAllRestaurants(currentUid: string | null, isAdmin: boolean): Promise<Restaurant[]> {
  const all = await fetchVisibleRestaurants(currentUid, isAdmin);
  return all.filter(r => !r.deleted).sort((a, b) => toMillis(a.geocodedAt) - toMillis(b.geocodedAt));
}

/** Restaurants the current viewer has soft-deleted access to see — used by the admin-only "非表示にした店舗" panel. */
export async function getDeletedRestaurants(currentUid: string | null, isAdmin: boolean): Promise<Restaurant[]> {
  const all = await fetchVisibleRestaurants(currentUid, isAdmin);
  return all.filter(r => r.deleted).sort((a, b) => toMillis(a.geocodedAt) - toMillis(b.geocodedAt));
}

/**
 * Keeps "recommended by" links symmetric: if A recommends B, B should recommend A
 * back too, without the editor having to separately open B and add A themselves.
 * Diffs old vs new recommendedIds and pushes the corresponding add/remove onto each
 * affected restaurant's own recommendedIds. Uses arrayUnion/arrayRemove (not a
 * read-then-write) so concurrent edits from different restaurants can't clobber each
 * other. Writing to another restaurant's doc is allowed by the same canEdit() rule
 * that governs normal edits — it doesn't depend on who added or can see that doc.
 */
async function syncRecommendationLinks(restaurantId: string, before: string[], after: string[]): Promise<void> {
  const added = after.filter(targetId => targetId !== restaurantId && !before.includes(targetId));
  const removed = before.filter(targetId => targetId !== restaurantId && !after.includes(targetId));
  if (added.length === 0 && removed.length === 0) return;

  const batch = writeBatch(db);
  for (const targetId of added) {
    batch.update(doc(db, COLLECTION_NAME, targetId), { recommendedIds: arrayUnion(restaurantId) });
  }
  for (const targetId of removed) {
    batch.update(doc(db, COLLECTION_NAME, targetId), { recommendedIds: arrayRemove(restaurantId) });
  }
  await batch.commit();
}

export async function addRestaurant(data: RestaurantInput & { latitude: number; longitude: number }): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    geocoded: true,
    geocodedAt: new Date(),
  });
  if (data.recommendedIds && data.recommendedIds.length > 0) {
    await syncRecommendationLinks(docRef.id, [], data.recommendedIds);
  }
  return docRef.id;
}

export async function updateRestaurant(id: string, data: Partial<Restaurant>, editedBy: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, id);
  const beforeSnap = await getDoc(ref);

  if (beforeSnap.exists()) {
    await addDoc(collection(db, COLLECTION_NAME, id, HISTORY_SUBCOLLECTION), {
      snapshot: beforeSnap.data(),
      editedBy,
      editedAt: new Date(),
    });
  }

  await updateDoc(ref, data);

  if (data.recommendedIds) {
    const before = (beforeSnap.data()?.recommendedIds ?? []) as string[];
    await syncRecommendationLinks(id, before, data.recommendedIds);
  }
}

export async function bulkUpdateRestaurants(ids: string[], data: Partial<Restaurant>): Promise<void> {
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, COLLECTION_NAME, id), data);
  }
  await batch.commit();
}

/**
 * Like bulkUpdateRestaurants, but each restaurant gets its own patch instead of one
 * shared patch — needed for renaming a cuisine name, since each restaurant's `cuisines`
 * array is different and has to be edited individually (replace-in-place), not
 * overwritten with the same value.
 */
export async function bulkUpdateRestaurantsIndividually(
  updates: Array<{ id: string; data: Partial<Restaurant> }>,
): Promise<void> {
  const batch = writeBatch(db);
  for (const { id, data } of updates) {
    batch.update(doc(db, COLLECTION_NAME, id), data);
  }
  await batch.commit();
}

export async function getRestaurantHistory(id: string): Promise<RestaurantHistoryEntry[]> {
  const historyRef = collection(db, COLLECTION_NAME, id, HISTORY_SUBCOLLECTION);
  const snap = await getDocs(query(historyRef, orderBy('editedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RestaurantHistoryEntry);
}

/**
 * Soft delete — marks the restaurant hidden instead of removing the document, so an
 * admin can review and restore it later (see restoreRestaurant / getDeletedRestaurants).
 */
export async function deleteRestaurant(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { deleted: true });
}

export async function restoreRestaurant(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { deleted: false });
}

/**
 * Re-derives visibleToUids (and drops references to deleted groups) for every private
 * restaurant, from the current set of admin-managed visibility groups. Called after
 * saving group changes in AdminSettingsPage so edits (renaming a group's members,
 * deleting a group) take effect immediately on restaurants that already reference it,
 * not just ones saved from now on. `visibility=='private'` alone is enough for this
 * query to be provable for an admin caller — the same pattern fetchVisibleRestaurants
 * already relies on for the admin branch, since isAdmin() in the read rule doesn't
 * depend on resource.data and so dominates the rest of that OR for every matched doc.
 * Only restaurants whose derived value actually changed get written.
 */
export async function resyncPrivateRestaurantsWithVisibilityGroups(groups: VisibilityGroup[]): Promise<void> {
  const uidsById = new Map(groups.map(g => [g.id, g.uids]));

  const q = query(collection(db, COLLECTION_NAME), where('visibility', '==', 'private'));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  let touched = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const currentGroupIds: string[] = Array.isArray(data.visibilityGroupIds) ? data.visibilityGroupIds : [];
    const nextGroupIds = currentGroupIds.filter(id => uidsById.has(id));
    const nextVisibleToUids = Array.from(new Set(nextGroupIds.flatMap(id => uidsById.get(id) ?? [])));
    const currentVisibleToUids: string[] = Array.isArray(data.visibleToUids) ? data.visibleToUids : [];

    const sameGroups =
      nextGroupIds.length === currentGroupIds.length && nextGroupIds.every(id => currentGroupIds.includes(id));
    const sameUids =
      nextVisibleToUids.length === currentVisibleToUids.length &&
      nextVisibleToUids.every(uid => currentVisibleToUids.includes(uid));
    if (sameGroups && sameUids) continue;

    batch.update(docSnap.ref, { visibilityGroupIds: nextGroupIds, visibleToUids: nextVisibleToUids });
    touched++;
  }
  if (touched > 0) await batch.commit();
}

export async function bulkImportRestaurants(
  restaurants: Array<RestaurantInput & { latitude: number; longitude: number }>,
): Promise<void> {
  for (const restaurant of restaurants) {
    await addRestaurant(restaurant);
  }
}
