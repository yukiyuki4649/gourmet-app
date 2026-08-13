import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

const snap = await getDocs(collection(db, 'restaurants'));
let zero = 0;
let ok = 0;
const zeroNames = [];

snap.forEach(doc => {
  const d = doc.data();
  if (!d.latitude || !d.longitude || (d.latitude === 0 && d.longitude === 0)) {
    zero++;
    zeroNames.push(d.name);
  } else {
    ok++;
  }
});

console.log(`total: ${snap.size}`);
console.log(`ok (has coords): ${ok}`);
console.log(`zero/missing coords: ${zero}`);
console.log('examples of zero:', zeroNames.slice(0, 10));
process.exit(0);
