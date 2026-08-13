import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();

async function backfillVisibility() {
  const snapshot = await db.collection('restaurants').get();
  console.log(`Found ${snapshot.docs.length} restaurants`);

  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.visibility) {
      skipped++;
      continue;
    }
    await docSnap.ref.update({
      visibility: 'public',
      visibleToUids: [],
    });
    updated++;
    console.log(`  ✓ ${data.name}: visibility = "public"`);
  }

  console.log(`\n完了: 更新 ${updated}件 / スキップ(既に設定済み) ${skipped}件`);
  process.exit(0);
}

backfillVisibility().catch(error => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
