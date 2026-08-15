import { Visibility } from '../types/restaurant';
import { UsernameEntry } from '../lib/auth';

interface VisibilityPickerProps {
  visibility: Visibility;
  onChange: (visibility: Visibility) => void;
  defaultVisibleToUids: string[];
  users: UsernameEntry[];
}

// Who can see a private restaurant is no longer chosen per-restaurant — it's a single
// account-wide list configured on the personal settings page (see PersonalSettingsPage's
// "非公開の店舗を見せる人" section) and applied automatically here.
export function VisibilityPicker({ visibility, onChange, defaultVisibleToUids, users }: VisibilityPickerProps) {
  const names = defaultVisibleToUids
    .map(uid => users.find(u => u.uid === uid)?.displayName)
    .filter((name): name is string => !!name);

  return (
    <div>
      <label className="block text-sm font-medium mb-2">公開範囲</label>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => onChange('public')}
          className={`px-4 py-2 text-sm rounded-md border ${
            visibility === 'public'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          公開
        </button>
        <button
          type="button"
          onClick={() => onChange('private')}
          className={`px-4 py-2 text-sm rounded-md border ${
            visibility === 'private'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          非公開
        </button>
      </div>

      {visibility === 'private' && (
        <p className="text-xs text-gray-500">
          {names.length > 0 ? `${names.join('、')}さんに表示されます。` : '自分以外の誰にも表示されません。'}
          変更は「個人設定」の「非公開の店舗を見せる人」から行えます。
        </p>
      )}
    </div>
  );
}
