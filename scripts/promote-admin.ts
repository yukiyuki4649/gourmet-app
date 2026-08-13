import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Usage: node --import tsx ./scripts/promote-admin.ts <displayName>
// Must be run BEFORE the restrictive firestore.rules are published (while the
// project is still in its default/open rules), since this script authenticates
// as nobody — it relies on writes still being unrestricted at this point.
const targetName = process.argv[2];

async function promoteAdmin() {
  if (!targetName) {
    console.error('Usage: node --import tsx ./scripts/promote-admin.ts <displayName>');
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const q = query(collection(db, 'users'), where('displayName', '==', targetName));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.error(`No user found with displayName "${targetName}". Has this person signed up yet?`);
    process.exit(1);
  }

  for (const docSnap of snapshot.docs) {
    await updateDoc(doc(db, 'users', docSnap.id), { role: 'admin' });
    console.log(`✓ Promoted ${docSnap.data().email} (displayName: ${targetName}) to admin`);
  }

  process.exit(0);
}

promoteAdmin().catch(error => {
  console.error('Promotion failed:', error);
  process.exit(1);
});
