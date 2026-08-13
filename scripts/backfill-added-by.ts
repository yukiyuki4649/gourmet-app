import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const DEFAULT_ADDED_BY = 'yuki';

async function backfillAddedBy() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, 'restaurants'));
  console.log(`Found ${snapshot.docs.length} restaurants`);

  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.addedBy) {
      skipped++;
      continue;
    }
    await updateDoc(doc(db, 'restaurants', docSnap.id), { addedBy: DEFAULT_ADDED_BY });
    updated++;
    console.log(`  ✓ ${data.name}: addedBy = "${DEFAULT_ADDED_BY}"`);
  }

  console.log(`\n完了: 更新 ${updated}件 / スキップ(既に設定済み) ${skipped}件`);
  process.exit(0);
}

backfillAddedBy().catch(error => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
