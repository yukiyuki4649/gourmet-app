import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  UserProfile,
  signInWithGoogle,
  completeRedirectSignIn,
  createProfile,
  logout,
  isInAppBrowser,
} from '../lib/auth';

interface AuthPanelProps {
  user: User | null;
  profile: UserProfile | null;
  onProfileChange: () => void | Promise<void>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export function AuthPanel({ user, profile, onProfileChange }: AuthPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Finishes a mobile redirect sign-in (signInWithGoogle navigates away and back on
  // mobile instead of using a popup) — a no-op if there wasn't one pending.
  useEffect(() => {
    completeRedirectSignIn()
      .then(() => onProfileChange())
      .catch(err => setError(err instanceof Error ? err.message : 'ログインに失敗しました'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefills the display-name field with the Google account's name once we have a
  // signed-in user with no app profile yet — covers both the popup flow (user is
  // known immediately) and the mobile redirect flow (user only appears once
  // onAuthStateChanged fires after the redirect completes).
  useEffect(() => {
    if (user && !profile && !displayName) {
      setDisplayName(user.displayName ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      await onProfileChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await createProfile(user.uid, user.email ?? '', displayName);
      await onProfileChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // Logged in and has a profile already.
  if (user && profile) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span>
          {profile.displayName}
          {profile.role === 'pending' && <span className="ml-1 text-orange-600">(承認待ち)</span>}
          {profile.role === 'admin' && <span className="ml-1 text-purple-600">(管理者)</span>}
        </span>
        <button
          onClick={() => logout()}
          className="px-3 py-1.5 bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap"
        >
          ログアウト
        </button>
      </div>
    );
  }

  // Signed in with Google for the first time — no app profile yet. Show what
  // information will be stored and who can see it, and require explicit
  // agreement before creating the profile (registration).
  if (user && !profile) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
          <h2 className="text-lg font-bold mb-2">登録前の確認</h2>
          <div className="text-sm bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 space-y-2">
            <p>
              <span className="font-semibold">ログイン機能の目的:</span>{' '}
              無関係な人による荒らしや不正な変更を防ぐためのものです。取得した情報を、それ以外の目的で使用することは一切ありません。
            </p>
            <p>
              <span className="font-semibold">保存される情報:</span> メールアドレス({user.email})、表示名
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>管理者(サイト運営者)は、あなたのメールアドレス・表示名・当サイト内での権限の三つの情報が確認できます。</li>
              <li>承認された他の利用者には、表示名のみが見えます(店舗の「追加者」表示など)。メールアドレスは見えません。</li>
              <li>ログインしていない訪問者には、あなたの情報は一切表示されません。</li>
            </ul>
          </div>

          <form onSubmit={handleCreateProfile} className="space-y-3">
            <input
              type="text"
              placeholder="表示名(例: yuki)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            <p className="text-xs text-gray-500">
              一覧の「追加者」として使われる名前です。他の人と同じ名前は使えません。
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5"
              />
              上記の内容を理解し、同意します
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '処理中...' : 'はじめる'}
            </button>
          </form>
          <button onClick={() => logout()} className="mt-3 text-sm text-gray-500 hover:underline">
            キャンセルしてログアウト
          </button>
        </div>
      </div>
    );
  }

  // Logged out, and opened inside an app's built-in browser (LINE/Instagram/etc.) —
  // Google blocks its own sign-in flow in this environment, and there's no code-side
  // workaround, so point the person at the fix instead of letting the button silently fail.
  if (isInAppBrowser()) {
    return (
      <div className="max-w-xs text-xs bg-amber-50 border border-amber-300 rounded-md p-3">
        <p className="font-semibold text-amber-800 mb-1">⚠️ このアプリ内ではログインできません</p>
        <p className="text-amber-700">
          LINEやInstagramなどのアプリ内ブラウザでは、安全のためGoogleログインがブロックされます。右上のメニュー(「…」または⋮)から「外部ブラウザで開く」「Safari/Chromeで開く」を選んで開き直してください。
        </p>
      </div>
    );
  }

  // Logged out.
  return (
    <div>
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
      >
        <GoogleIcon />
        {loading ? '処理中...' : 'Googleでログイン'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
