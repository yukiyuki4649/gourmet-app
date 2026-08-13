import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();

async function diag() {
  const snapshot = await db.collection('restaurants').get();
  console.log(`Total docs: ${snapshot.docs.length}`);

  const counts: Record<string, number> = {};
  for (const docSnap of snapshot.docs) {
    const v = docSnap.data().visibility ?? '(missing)';
    counts[v] = (counts[v] ?? 0) + 1;
  }
  console.log('visibility breakdown:', JSON.stringify(counts, null, 2));

  process.exit(0);
}

diag().catch(error => {
  console.error(error);
  process.exit(1);
});
