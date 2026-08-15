import { Visibility } from '../types/restaurant';
import { VisibilityGroup } from '../lib/appSettings';

interface VisibilityPickerProps {
  visibility: Visibility;
  groups: VisibilityGroup[];
  selectedGroupIds: string[];
  onChange: (visibility: Visibility, groupIds: string[]) => void;
}

// Who can see a private restaurant is chosen by picking one or more named groups
// (managed centrally in 管理者設定 → 限定公開グループ管理), not by hand-picking
// individual people per-restaurant.
export function VisibilityPicker({ visibility, groups, selectedGroupIds, onChange }: VisibilityPickerProps) {
  const toggleGroup = (groupId: string) => {
    const next = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter(id => id !== groupId)
      : [...selectedGroupIds, groupId];
    onChange('private', next);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">公開範囲</label>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => onChange('public', selectedGroupIds)}
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
          onClick={() => onChange('private', selectedGroupIds)}
          className={`px-4 py-2 text-sm rounded-md border ${
            visibility === 'private'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          限定公開
        </button>
      </div>

      {visibility === 'private' && (
        <div>
          <p className="text-xs text-gray-500 mb-2">この店舗を見せるグループを選んでください(複数可)</p>
          {groups.length === 0 ? (
            <p className="text-xs text-gray-400">
              限定公開グループがまだありません。管理者設定の「限定公開グループ管理」から作成してください。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {groups.map(g => {
                const isSelected = selectedGroupIds.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      isSelected
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}
                    {g.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
