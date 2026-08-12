import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Restaurant, RestaurantInput } from '../types/restaurant';

const COLLECTION_NAME = 'restaurants';

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('overallRating', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Restaurant[];
}

export async function addRestaurant(data: RestaurantInput & { latitude: number; longitude: number }): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    geocoded: true,
    geocodedAt: new Date(),
  });
  return docRef.id;
}

export async function updateRestaurant(id: string, data: Partial<Restaurant>): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), data);
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
