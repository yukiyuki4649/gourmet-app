import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

async function main() {
  const authList = await getAuth().listUsers(1000);
  const profileSnap = await getFirestore().collection('users').get();
  const profileUids = new Set(profileSnap.docs.map(d => d.id));

  console.log('=== Firebase Authenticationのアカウント一覧 ===');
  for (const u of authList.users) {
    const hasProfile = profileUids.has(u.uid);
    console.log(
      `${u.email} (${u.displayName || '名前未取得'}) - プロフィール${hasProfile ? 'あり' : '【なし】'} - 作成: ${u.metadata.creationTime}`,
    );
  }

  console.log('\n=== Firestore usersコレクション(「ユーザー管理」に表示される側) ===');
  for (const d of profileSnap.docs) {
    const data = d.data();
    console.log(`${data.displayName} (${data.email}) - role: ${data.role}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
