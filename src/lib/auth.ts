import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'admin' | 'approved' | 'pending';

export interface UserPermissions {
  manageCategories: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions?: UserPermissions;
}

/** Name + uid only — no email/role — for pickers (e.g. sharing a private restaurant with
 * someone) that any canEdit user needs, without exposing the full profile to non-admins. */
export interface UsernameEntry {
  uid: string;
  displayName: string;
}

const USERS_COLLECTION = 'users';
// Doc id IS the display name — a lightweight uniqueness index, separate from `users`
// (which holds emails/roles and is not broadly readable). Firestore's own create-vs-update
// distinction gives atomic "first writer wins" semantics here, which also closes a race
// condition the old check-then-write approach had (two signups could both pass the
// "not taken" check before either finished writing their profile).
const USERNAMES_COLLECTION = 'usernames';

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}

export async function isDisplayNameTaken(displayName: string): Promise<boolean> {
  const snap = await getDoc(doc(db, USERNAMES_COLLECTION, displayName));
  return snap.exists();
}

/** Name + uid for every registered user — safe for any canEdit user, since it carries
 * no email/role. Backs pickers like "who can see this private restaurant". */
export async function listUsernames(): Promise<UsernameEntry[]> {
  const snap = await getDocs(collection(db, USERNAMES_COLLECTION));
  return snap.docs.map(d => ({ uid: (d.data() as { uid: string }).uid, displayName: d.id }));
}

/**
 * Google actively blocks its OAuth sign-in flow inside embedded "in-app browser"
 * WebViews (LINE, Instagram, Facebook, X/Twitter, etc.) as an anti-phishing measure —
 * this can't be worked around from app code (neither popup nor redirect will succeed),
 * the user has to reopen the page in a real browser (Safari/Chrome).
 */
export function isInAppBrowser(): boolean {
  return /Line\/|FBAN|FBAV|Instagram|Twitter|MicroMessenger|KAKAOTALK/i.test(navigator.userAgent);
}

/**
 * signInWithRedirect was tried here for mobile devices (to avoid popup-blocking), but
 * on real iOS Safari it fails outright with "missing initial state" — Safari's storage
 * partitioning breaks the redirect round-trip through the separate authDomain origin.
 * signInWithPopup, triggered synchronously from the login button's click handler, works
 * on mobile Safari/Chrome; the only confirmed mobile failure mode was in-app browsers
 * (handled separately by isInAppBrowser()), not popups. So: popup for everyone.
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

/** Called once, right after a brand-new Google sign-in, to create the user's app profile. */
export async function createProfile(uid: string, email: string, displayName: string): Promise<void> {
  const trimmedName = displayName.trim();
  if (!trimmedName) {
    throw new Error('表示名を入力してください');
  }

  try {
    await setDoc(doc(db, USERNAMES_COLLECTION, trimmedName), { uid });
  } catch {
    throw new Error('その表示名は既に使われています。別の名前を選んでください');
  }

  await setDoc(doc(db, USERS_COLLECTION, uid), {
    email,
    displayName: trimmedName,
    role: 'pending' as UserRole,
    permissions: { manageCategories: false },
    createdAt: new Date(),
  });
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function listAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as UserProfile);
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role });
}

export async function setUserManageCategories(uid: string, allowed: boolean): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { 'permissions.manageCategories': allowed });
}
