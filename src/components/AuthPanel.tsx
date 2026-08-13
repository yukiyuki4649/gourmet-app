import { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, signInWithGoogle, createProfile, logout } from '../lib/auth';

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

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await signInWithGoogle();
      setDisplayName(loggedInUser.displayName ?? '');
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

  // Signed in with Google for the first time — no app profile yet, ask for a display name.
  if (user && !profile) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
          <h2 className="text-lg font-bold mb-2">表示名を設定してください</h2>
          <p className="text-sm text-gray-600 mb-4">
            一覧の「追加者」として使われる名前です。他の人と同じ名前は使えません。
          </p>
          <form onSubmit={handleCreateProfile} className="space-y-3">
            <input
              type="text"
              placeholder="表示名(例: yuki)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
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
