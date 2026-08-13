import { Visibility } from '../types/restaurant';
import { UserProfile } from '../lib/auth';

interface VisibilityPickerProps {
  visibility: Visibility;
  visibleToUids: string[];
  onChange: (visibility: Visibility, visibleToUids: string[]) => void;
  users: UserProfile[];
  currentUid: string | null;
}

export function VisibilityPicker({ visibility, visibleToUids, onChange, users, currentUid }: VisibilityPickerProps) {
  const otherUsers = users.filter(u => u.uid !== currentUid);

  const toggleUser = (uid: string) => {
    const next = visibleToUids.includes(uid)
      ? visibleToUids.filter(id => id !== uid)
      : [...visibleToUids, uid];
    onChange('private', next);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">公開範囲</label>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => onChange('public', visibleToUids)}
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
          onClick={() => onChange('private', visibleToUids)}
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
        <div>
          <p className="text-xs text-gray-500 mb-2">
            自分以外に、この店舗を見られる人を選んでください
          </p>
          <div className="flex flex-wrap gap-2">
            {otherUsers.length === 0 && (
              <p className="text-xs text-gray-400">他に登録済みのユーザーがいません</p>
            )}
            {otherUsers.map(u => {
              const isSelected = visibleToUids.includes(u.uid);
              return (
                <button
                  type="button"
                  key={u.uid}
                  onClick={() => toggleUser(u.uid)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    isSelected
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}
                  {u.displayName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
