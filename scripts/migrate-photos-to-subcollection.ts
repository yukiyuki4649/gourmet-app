import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();

async function migratePhotosToSubcollection() {
  const snapshot = await db.collection('restaurants').get();
  console.log(`Found ${snapshot.docs.length} restaurants`);

  let migrated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const exteriorPhoto = data.exteriorPhoto ?? null;
    const dishPhoto = data.dishPhoto ?? null;

    if (!exteriorPhoto && !dishPhoto) {
      // Still make sure hasPhotos is explicitly false/unset-consistent, but no need to
      // touch docs that never had photo fields at all.
      if ('exteriorPhoto' in data || 'dishPhoto' in data) {
        await docSnap.ref.update({
          exteriorPhoto: FieldValue.delete(),
          dishPhoto: FieldValue.delete(),
          hasPhotos: false,
        });
      }
      skipped++;
      continue;
    }

    await docSnap.ref.collection('photos').doc('main').set({ exteriorPhoto, dishPhoto });
    await docSnap.ref.update({
      exteriorPhoto: FieldValue.delete(),
      dishPhoto: FieldValue.delete(),
      hasPhotos: true,
    });
    migrated++;
    console.log(`  ✓ ${data.name}: photos moved to subcollection`);
  }

  console.log(`\n完了: 移行 ${migrated}件 / スキップ(写真なし) ${skipped}件`);
  process.exit(0);
}

migratePhotosToSubcollection().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
