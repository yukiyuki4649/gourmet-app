import { useMemo, useState } from 'react';
import { Restaurant } from '../types/restaurant';
import { PersonalSettings, savePersonalSettings } from '../lib/personalSettings';
import { AreaCategory, buildFilterGroups, sortByOrder } from '../lib/categories';

interface PersonalSettingsPageProps {
  restaurants: Restaurant[];
  categories: AreaCategory[];
  areaOrder: string[];
  settings: PersonalSettings;
  onSaved: (settings: PersonalSettings) => void;
  isSignedIn: boolean;
  canEdit: boolean;
}

export function PersonalSettingsPage({
  restaurants,
  categories,
  areaOrder,
  settings,
  onSaved,
  isSignedIn,
  canEdit,
}: PersonalSettingsPageProps) {
  // Local draft — nothing is persisted until "設定を保存" is clicked.
  const [draft, setDraft] = useState<PersonalSettings>(settings);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  const allAreas = useMemo(
    () => sortByOrder(Array.from(new Set(restaurants.map(r => r.area))), areaOrder),
    [restaurants, areaOrder],
  );
  const filterGroups = useMemo(() => buildFilterGroups(allAreas, categories), [allAreas, categories]);
  const people = useMemo(
    () => Array.from(new Set(restaurants.map(r => r.addedBy).filter(Boolean))).sort(),
    [restaurants],
  );

  const updateDraft = (patch: Partial<PersonalSettings>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setSaveState('idle');
  };

  const handleSave = () => {
    savePersonalSettings(draft);
    onSaved(draft);
    setSaveState('saved');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⚙️ 設定</h1>
            <p className="text-gray-600 mt-2">
              このブラウザだけの個人設定です。ログイン不要で、いつでも変更できます。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSignedIn && canEdit && (
              <a href="#/admin" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap text-sm">
                管理者設定
              </a>
            )}
            <a href="#/" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap">
              一覧に戻る
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-2">絞り込みの初期設定</h2>
          <p className="text-sm text-gray-600 mb-4">
            アプリを開いたときに、一覧・地図を最初から絞り込んだ状態で表示できます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">初期エリア・カテゴリ</label>
              <select
                value={draft.defaultAreaFilter}
                onChange={e => updateDraft({ defaultAreaFilter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">すべてのエリア</option>
                {filterGroups.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">追加者で絞り込み</label>
              <select
                value={draft.defaultPersonFilter}
                onChange={e => updateDraft({ defaultPersonFilter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">すべての追加者</option>
                {people.map(person => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.showAddedBy}
              onChange={e => updateDraft({ showAddedBy: e.target.checked })}
            />
            一覧に追加者の名前を表示する
          </label>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">設定を保存</h2>
              <p className="text-sm text-gray-600">このブラウザに保存されます。</p>
            </div>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
            >
              設定を保存
            </button>
          </div>
          {saveState === 'saved' && (
            <div className="mt-3 px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
              ✓ 設定を保存しました
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
