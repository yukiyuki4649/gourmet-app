import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();

async function diag() {
  const snap = await db.collection('settings').doc('app').get();
  console.log('settings/app exists:', snap.exists);
  console.log(JSON.stringify(snap.data(), null, 2));
  process.exit(0);
}

diag().catch(error => {
  console.error(error);
  process.exit(1);
});
