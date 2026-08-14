import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();

const API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error('VITE_GOOGLE_MAPS_API_KEY が .env.local に見つかりません');
  process.exit(1);
}

// Places Photos are fetched once here and embedded as a data URI (see fetchPhotoAsDataUri),
// never stored as a live Google URL — that would bill on every page view instead of once.
// Capped well under half of Firestore's 1MB document limit, since exteriorPhoto AND
// dishPhoto both land in the same document alongside the rest of its fields — a couple of
// restaurants hit the 1MB ceiling when each photo was allowed up to 700KB.
const MAX_PHOTO_BYTES = 400_000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface PlacesPhotoRef {
  photo_reference: string;
  html_attributions: string[];
}

interface PlaceCandidate {
  place_id: string;
  name: string;
}

async function findPlace(
  name: string,
  area: string,
  lat?: number,
  lng?: number,
): Promise<PlaceCandidate | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${name} ${area}`);
  url.searchParams.set('language', 'ja');
  url.searchParams.set('region', 'jp');
  if (lat && lng) {
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', '500');
  }
  url.searchParams.set('key', API_KEY as string);

  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) return null;
  const top = data.results[0];
  return { place_id: top.place_id, name: top.name };
}

async function getPlacePhotos(placeId: string): Promise<PlacesPhotoRef[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'photos');
  url.searchParams.set('key', API_KEY as string);

  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK') return [];
  return data.result?.photos ?? [];
}

async function fetchPhotoAsDataUri(photoReference: string): Promise<string | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo');
  url.searchParams.set('maxwidth', '640');
  url.searchParams.set('photo_reference', photoReference);
  url.searchParams.set('key', API_KEY as string);

  const res = await fetch(url);
  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_PHOTO_BYTES) {
    console.log(`    (写真が大きすぎるためスキップ: ${Math.round(buffer.byteLength / 1024)}KB)`);
    return null;
  }
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

/** Google Places requires attribution when its photos are displayed. */
function attributionFrom(photo: PlacesPhotoRef | undefined, placeUrl: string): { creditName: string; creditUrl: string } {
  const html = photo?.html_attributions?.[0];
  if (html) {
    const match = html.match(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    if (match) return { creditUrl: match[1], creditName: match[2] };
  }
  return { creditName: 'Google マップ', creditUrl: placeUrl };
}

async function backfillPlacesPhotos() {
  const snapshot = await db.collection('restaurants').get();
  console.log(`全店舗数: ${snapshot.docs.length}`);

  const targets = snapshot.docs.filter(d => {
    const data = d.data();
    return !(data.exteriorPhoto && data.dishPhoto);
  });
  console.log(`写真が未設定(または一部未設定)の店舗: ${targets.length}件\n`);

  let bothSet = 0;
  let partialSet = 0;
  let noPhotosOnGoogle = 0;
  let noMatch = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const docSnap = targets[i];
    const data = docSnap.data();
    const label = `[${i + 1}/${targets.length}] ${data.name}`;

    try {
      const place = await findPlace(data.name, data.area || '', data.latitude, data.longitude);
      if (!place) {
        console.log(`${label}: Googleマップ上で店舗が見つかりませんでした`);
        noMatch++;
        await sleep(200);
        continue;
      }

      const photos = await getPlacePhotos(place.place_id);
      if (photos.length === 0) {
        console.log(`${label}: "${place.name}" に一致 — 写真が登録されていません`);
        noPhotosOnGoogle++;
        await sleep(200);
        continue;
      }

      const placeUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
      const patch: Record<string, { url: string; creditName: string; creditUrl: string }> = {};

      if (!data.exteriorPhoto && photos[0]) {
        const dataUri = await fetchPhotoAsDataUri(photos[0].photo_reference);
        if (dataUri) patch.exteriorPhoto = { url: dataUri, ...attributionFrom(photos[0], placeUrl) };
      }
      if (!data.dishPhoto && photos[1]) {
        const dataUri = await fetchPhotoAsDataUri(photos[1].photo_reference);
        if (dataUri) patch.dishPhoto = { url: dataUri, ...attributionFrom(photos[1], placeUrl) };
      }

      if (Object.keys(patch).length > 0) {
        await docSnap.ref.update(patch);
        const gotBoth = !!patch.exteriorPhoto && !!patch.dishPhoto;
        console.log(`${label}: "${place.name}" に一致 — ${gotBoth ? '外観+料理を設定' : '一部のみ設定'}`);
        if (gotBoth) bothSet++;
        else partialSet++;
      } else {
        console.log(`${label}: "${place.name}" に一致 — 写真を取得できませんでした`);
        failed++;
      }
    } catch (error) {
      console.log(`${label}: エラー (${error instanceof Error ? error.message : error})`);
      failed++;
    }

    await sleep(200);
  }

  console.log('\n========== 完了 ==========');
  console.log(`外観+料理とも設定: ${bothSet}件`);
  console.log(`一部のみ設定: ${partialSet}件`);
  console.log(`Googleマップ上に写真なし: ${noPhotosOnGoogle}件`);
  console.log(`店舗が見つからない: ${noMatch}件`);
  console.log(`失敗: ${failed}件`);
  console.log(`スキップ(既に両方設定済み): ${snapshot.docs.length - targets.length}件`);
  process.exit(0);
}

backfillPlacesPhotos().catch(error => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
