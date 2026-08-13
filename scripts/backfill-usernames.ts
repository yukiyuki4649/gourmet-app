import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();

/**
 * One-off migration for the users→usernames uniqueness-index refactor (see
 * firestore.rules / src/lib/auth.ts). Existing accounts signed up before this change
 * have a displayName on their `users` doc but no corresponding `usernames/{name}` doc,
 * so without this backfill a new signup could claim an already-in-use name.
 */
async function backfillUsernames() {
  const snapshot = await db.collection('users').get();
  console.log(`Found ${snapshot.docs.length} users`);

  let created = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const name = data.displayName;
    if (!name) {
      skipped++;
      continue;
    }
    const usernameRef = db.collection('usernames').doc(name);
    const existing = await usernameRef.get();
    if (existing.exists) {
      skipped++;
      continue;
    }
    await usernameRef.set({ uid: docSnap.id });
    created++;
    console.log(`  ✓ "${name}" -> ${docSnap.id}`);
  }

  console.log(`\n完了: 作成 ${created}件 / スキップ(既存または名前なし) ${skipped}件`);
  process.exit(0);
}

backfillUsernames().catch(error => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
