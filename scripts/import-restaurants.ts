import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import Papa from 'papaparse';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface CSVRow {
  店名: string;
  料理: string;
  場所: string;
  総合評価: string;
  味評価: string;
  コスパ: string;
  備考: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeRestaurant(name: string, area: string, apiKey: string) {
  const query = `${name} ${area} 飲食店`;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
    );

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        address: result.formatted_address,
        success: true,
      };
    }
    return { latitude: 0, longitude: 0, address: '', success: false };
  } catch (error) {
    console.error(`Geocoding error for ${name}:`, error);
    return { latitude: 0, longitude: 0, address: '', success: false };
  }
}

async function importRestaurants() {
  const csvPath = path.join(process.cwd(), '行ったレストラン.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const parseResult = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const restaurants = parseResult.data;
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('VITE_GOOGLE_MAPS_API_KEY is not set');
    process.exit(1);
  }

  console.log(`Found ${restaurants.length} restaurants to import`);

  const failedRestaurants: Array<{ name: string; reason: string }> = [];

  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];

    if (!restaurant.店名 || !restaurant.場所) {
      console.log(`Skipping row ${i + 2}: missing name or location`);
      failedRestaurants.push({
        name: restaurant.店名 || '(名前なし)',
        reason: '店名または場所が空白',
      });
      continue;
    }

    console.log(`Processing [${i + 1}/${restaurants.length}] ${restaurant.店名}...`);

    const geocode = await geocodeRestaurant(restaurant.店名, restaurant.場所, apiKey);

    if (!geocode.success) {
      console.warn(`  ⚠️ Failed to geocode: ${restaurant.店名}`);
      failedRestaurants.push({
        name: restaurant.店名,
        reason: '位置情報が取得できませんでした',
      });
    }

    try {
      await addDoc(collection(db, 'restaurants'), {
        name: restaurant.店名,
        cuisine: restaurant.料理,
        area: restaurant.場所,
        overallRating: restaurant.総合評価 || '',
        tasteRating: restaurant.味評価 || '',
        valuRating: restaurant.コスパ || '',
        notes: restaurant.備考 || '',
        latitude: geocode.latitude,
        longitude: geocode.longitude,
        address: geocode.address,
        geocoded: geocode.success,
        geocodedAt: new Date(),
      });

      console.log(`  ✓ Added: ${restaurant.店名}`);
    } catch (error) {
      console.error(`  ✗ Error adding restaurant:`, error);
      failedRestaurants.push({
        name: restaurant.店名,
        reason: 'データベース追加エラー',
      });
    }

    await sleep(100);
  }

  console.log('\n========== インポート完了 ==========');
  console.log(`成功: ${restaurants.length - failedRestaurants.length}件`);
  console.log(`失敗: ${failedRestaurants.length}件`);

  if (failedRestaurants.length > 0) {
    console.log('\n失敗した店舗:');
    failedRestaurants.forEach(item => {
      console.log(`  - ${item.name} (${item.reason})`);
    });
  }

  process.exit(0);
}

importRestaurants();
