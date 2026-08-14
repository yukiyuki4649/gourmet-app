import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Popup-based sign-in (signInWithPopup) is unreliable on mobile browsers — popups get
 * silently blocked or the flow just fails with no useful error — so mobile devices use
 * the redirect flow instead (navigates away to Google and back). On redirect, this
 * returns null immediately since the page is about to unload; the actual result is
 * picked up by completeRedirectSignIn() after the browser comes back.
 */
export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  if (isMobileDevice()) {
    await signInWithRedirect(auth, provider);
    return null;
  }
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

/** Call once on app load to finish a mobile redirect sign-in (no-op if there wasn't one pending). */
export async function completeRedirectSignIn(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
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
