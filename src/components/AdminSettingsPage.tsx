import { useMemo, useState } from 'react';
import { Restaurant } from '../types/restaurant';
import { AppSettings, saveAppSettings } from '../lib/appSettings';
import { AreaCategory, CuisineCategory } from '../lib/categories';
import { UserManagement } from './UserManagement';

interface AdminSettingsPageProps {
  restaurants: Restaurant[];
  settings: AppSettings;
  onSaved: (settings: AppSettings) => void;
  canManageCategories: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  isSignedIn: boolean;
  currentUid: string | null;
  onRenameArea: (oldName: string, newName: string) => Promise<void>;
  onRenameCuisine: (oldName: string, newName: string) => Promise<void>;
}

export function AdminSettingsPage({
  restaurants,
  settings,
  onSaved,
  canManageCategories,
  canEdit,
  isAdmin,
  isSignedIn,
  currentUid,
  onRenameArea,
  onRenameCuisine,
}: AdminSettingsPageProps) {
  // Everything below is a local draft — nothing is persisted until "設定をすべて保存" is clicked.
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState('');

  // --- area/cuisine name renaming (applies immediately across all restaurants) ---
  const [areaRenameDrafts, setAreaRenameDrafts] = useState<Record<string, string>>({});
  const [cuisineRenameDrafts, setCuisineRenameDrafts] = useState<Record<string, string>>({});
  const [areaMergeTargets, setAreaMergeTargets] = useState<Record<string, string>>({});
  const [cuisineMergeTargets, setCuisineMergeTargets] = useState<Record<string, string>>({});
  const [renamingArea, setRenamingArea] = useState<string | null>(null);
  const [renamingCuisine, setRenamingCuisine] = useState<string | null>(null);
  const [renameMessage, setRenameMessage] = useState('');

  const performRenameArea = async (oldName: string, newName: string) => {
    setRenamingArea(oldName);
    setRenameMessage('');
    try {
      await onRenameArea(oldName, newName);
      setAreaRenameDrafts(prev => {
        const next = { ...prev };
        delete next[oldName];
        return next;
      });
      setRenameMessage(`エリア名「${oldName}」を「${newName}」に変更しました`);
    } catch (error) {
      console.error('Failed to rename area:', error);
      setRenameMessage('エリア名の変更に失敗しました');
    } finally {
      setRenamingArea(null);
    }
  };

  const performRenameCuisine = async (oldName: string, newName: string) => {
    setRenamingCuisine(oldName);
    setRenameMessage('');
    try {
      await onRenameCuisine(oldName, newName);
      setCuisineRenameDrafts(prev => {
        const next = { ...prev };
        delete next[oldName];
        return next;
      });
      setRenameMessage(`料理種別名「${oldName}」を「${newName}」に変更しました`);
    } catch (error) {
      console.error('Failed to rename cuisine:', error);
      setRenameMessage('料理種別名の変更に失敗しました');
    } finally {
      setRenamingCuisine(null);
    }
  };

  const handleRenameArea = (oldName: string) => {
    const newName = (areaRenameDrafts[oldName] ?? oldName).trim();
    if (!newName || newName === oldName) return;
    if (!window.confirm(`「${oldName}」を「${newName}」に変更します。この店舗すべてに反映されます。よろしいですか?`)) return;
    performRenameArea(oldName, newName);
  };

  const handleRenameCuisine = (oldName: string) => {
    const newName = (cuisineRenameDrafts[oldName] ?? oldName).trim();
    if (!newName || newName === oldName) return;
    if (!window.confirm(`「${oldName}」を「${newName}」に変更します。この店舗すべてに反映されます。よろしいですか?`)) return;
    performRenameCuisine(oldName, newName);
  };

  // "Deleting" an area/cuisine name isn't meaningful on its own — every restaurant
  // requires one, so removing a name means folding its restaurants into another
  // existing name instead. This reuses the same rename plumbing with an explicit,
  // user-chosen merge target (picked from a <select>, not a typed prompt — a
  // window.prompt()-based version of this shipped first but required the user to
  // type an exact, case/whitespace-sensitive match, which was too easy to get wrong
  // and silently fail).
  const handleDeleteArea = (oldName: string) => {
    const target = areaMergeTargets[oldName];
    if (!target) return;
    const count = restaurants.filter(r => r.area === oldName).length;
    if (!window.confirm(`「${oldName}」(${count}件の店舗)を削除し、「${target}」に統合します。よろしいですか?`)) return;
    performRenameArea(oldName, target);
    setAreaMergeTargets(prev => {
      const next = { ...prev };
      delete next[oldName];
      return next;
    });
  };

  const handleDeleteCuisine = (oldName: string) => {
    const target = cuisineMergeTargets[oldName];
    if (!target) return;
    const count = restaurants.filter(r => r.cuisine === oldName).length;
    if (!window.confirm(`「${oldName}」(${count}件の店舗)を削除し、「${target}」に統合します。よろしいですか?`)) return;
    performRenameCuisine(oldName, target);
    setCuisineMergeTargets(prev => {
      const next = { ...prev };
      delete next[oldName];
      return next;
    });
  };

  // --- area categories (draft) ---
  const allAreas = useMemo(() => Array.from(new Set(restaurants.map(r => r.area))).sort(), [restaurants]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAreas, setNewCategoryAreas] = useState<string[]>([]);

  const toggleNewCategoryArea = (area: string) => {
    setNewCategoryAreas(prev => (prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]));
  };

  const canAddCategory = canManageCategories && newCategoryName.trim() !== '' && newCategoryAreas.length > 0;

  const handleAddCategory = () => {
    if (!canAddCategory) return;
    const name = newCategoryName.trim();
    const nextCategories: AreaCategory[] = [
      ...draft.categories.filter(c => c.name !== name),
      { name, areas: newCategoryAreas },
    ];
    setDraft(prev => ({ ...prev, categories: nextCategories }));
    setNewCategoryName('');
    setNewCategoryAreas([]);
    setSaveState('idle');
  };

  const handleDeleteCategoryAt = (index: number) => {
    if (!canManageCategories) return;
    setDraft(prev => ({ ...prev, categories: prev.categories.filter((_, i) => i !== index) }));
    setSaveState('idle');
  };

  const handleRenameCategoryAt = (index: number, name: string) => {
    if (!canManageCategories) return;
    setDraft(prev => {
      const next = [...prev.categories];
      next[index] = { ...next[index], name };
      return { ...prev, categories: next };
    });
    setSaveState('idle');
  };

  const handleToggleCategoryArea = (index: number, area: string) => {
    if (!canManageCategories) return;
    setDraft(prev => {
      const next = [...prev.categories];
      const cat = next[index];
      const areas = cat.areas.includes(area) ? cat.areas.filter(a => a !== area) : [...cat.areas, area];
      next[index] = { ...cat, areas };
      return { ...prev, categories: next };
    });
    setSaveState('idle');
  };

  // --- cuisine categories (draft) ---
  const allCuisines = useMemo(() => Array.from(new Set(restaurants.map(r => r.cuisine))).sort(), [restaurants]);
  const [newCuisineCategoryName, setNewCuisineCategoryName] = useState('');
  const [newCuisineCategoryCuisines, setNewCuisineCategoryCuisines] = useState<string[]>([]);

  const toggleNewCuisineCategoryCuisine = (cuisine: string) => {
    setNewCuisineCategoryCuisines(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine],
    );
  };

  const canAddCuisineCategory =
    canManageCategories && newCuisineCategoryName.trim() !== '' && newCuisineCategoryCuisines.length > 0;

  const handleAddCuisineCategory = () => {
    if (!canAddCuisineCategory) return;
    const name = newCuisineCategoryName.trim();
    const nextCuisineCategories: CuisineCategory[] = [
      ...draft.cuisineCategories.filter(c => c.name !== name),
      { name, cuisines: newCuisineCategoryCuisines },
    ];
    setDraft(prev => ({ ...prev, cuisineCategories: nextCuisineCategories }));
    setNewCuisineCategoryName('');
    setNewCuisineCategoryCuisines([]);
    setSaveState('idle');
  };

  const handleDeleteCuisineCategoryAt = (index: number) => {
    if (!canManageCategories) return;
    setDraft(prev => ({ ...prev, cuisineCategories: prev.cuisineCategories.filter((_, i) => i !== index) }));
    setSaveState('idle');
  };

  const handleRenameCuisineCategoryAt = (index: number, name: string) => {
    if (!canManageCategories) return;
    setDraft(prev => {
      const next = [...prev.cuisineCategories];
      next[index] = { ...next[index], name };
      return { ...prev, cuisineCategories: next };
    });
    setSaveState('idle');
  };

  const handleToggleCuisineCategoryCuisine = (index: number, cuisine: string) => {
    if (!canManageCategories) return;
    setDraft(prev => {
      const next = [...prev.cuisineCategories];
      const cat = next[index];
      const cuisines = cat.cuisines.includes(cuisine)
        ? cat.cuisines.filter(c => c !== cuisine)
        : [...cat.cuisines, cuisine];
      next[index] = { ...cat, cuisines };
      return { ...prev, cuisineCategories: next };
    });
    setSaveState('idle');
  };

  const handleSaveAll = async () => {
    if (!canManageCategories) return;

    const trimmedCategories = draft.categories.map(c => ({ ...c, name: c.name.trim() }));
    const trimmedCuisineCategories = draft.cuisineCategories.map(c => ({ ...c, name: c.name.trim() }));
    if (trimmedCategories.some(c => !c.name) || trimmedCuisineCategories.some(c => !c.name)) {
      setSaveError('カテゴリ名を空にすることはできません');
      return;
    }

    const nextDraft = { categories: trimmedCategories, cuisineCategories: trimmedCuisineCategories };
    setSaveState('saving');
    setSaveError('');
    try {
      await saveAppSettings(nextDraft);
      setDraft(nextDraft);
      onSaved(nextDraft);
      setSaveState('saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveError('設定の保存に失敗しました');
      setSaveState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔑 管理者設定</h1>
            <p className="text-gray-600 mt-2">エリア・料理種別カテゴリの管理と、ユーザーの権限管理です。</p>
          </div>
          <a href="#/settings" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap">
            個人設定に戻る
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {!isSignedIn && (
          <div className="px-4 py-3 bg-orange-50 text-orange-800 rounded-md text-sm">
            ログインすると内容を編集できるようになります。
          </div>
        )}
        {isSignedIn && !canManageCategories && (
          <div className="px-4 py-3 bg-orange-50 text-orange-800 rounded-md text-sm">
            この項目を編集する権限がありません。管理者に「カテゴリ管理」の許可を依頼してください。
          </div>
        )}

        {canManageCategories && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">設定を保存</h2>
                <p className="text-sm text-gray-600">カテゴリの変更をまとめて保存します。</p>
              </div>
              <button
                onClick={handleSaveAll}
                disabled={saveState === 'saving'}
                className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 font-medium"
              >
                {saveState === 'saving' ? '保存中...' : '設定をすべて保存'}
              </button>
            </div>
            {saveState === 'saved' && (
              <div className="mt-3 px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                ✓ すべての設定を保存しました
              </div>
            )}
            {saveError && (
              <div className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                {saveError}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-2">エリアカテゴリ</h2>
          <p className="text-sm text-gray-600 mb-4">
            複数のエリアをまとめて1つの大きなカテゴリとして扱えます。一覧・地図の絞り込みで、カテゴリ名がグループ見出しになり、その下に含まれるエリアが並びます。
          </p>

          {draft.categories.length > 0 && (
            <ul className="mb-4 space-y-2">
              {draft.categories.map((cat, index) => (
                <li key={index} className="bg-gray-50 rounded-md px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    {canManageCategories ? (
                      <input
                        type="text"
                        value={cat.name}
                        onChange={e => handleRenameCategoryAt(index, e.target.value)}
                        className="font-medium px-2 py-1 border border-gray-300 rounded-md flex-1"
                      />
                    ) : (
                      <span className="font-medium">{cat.name}</span>
                    )}
                    {canManageCategories && (
                      <button
                        onClick={() => handleDeleteCategoryAt(index)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  {canManageCategories ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allAreas.map(area => {
                        const isSelected = cat.areas.includes(area);
                        return (
                          <button
                            type="button"
                            key={area}
                            onClick={() => handleToggleCategoryArea(index, area)}
                            aria-pressed={isSelected}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                              isSelected
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <ul className="mt-1 pl-4 text-sm text-gray-600 list-disc list-inside">
                      {cat.areas.map(a => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canManageCategories && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">1. カテゴリ名を入力</label>
              <input
                type="text"
                placeholder="例: 文京エリア"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
              />

              <label className="block text-sm font-medium mb-2">2. 含めるエリアを選ぶ(クリックで選択/解除)</label>
              <div className="flex flex-wrap gap-2 mb-1">
                {allAreas.map(area => {
                  const isSelected = newCategoryAreas.includes(area);
                  return (
                    <button
                      type="button"
                      key={area}
                      onClick={() => toggleNewCategoryArea(area)}
                      aria-pressed={isSelected}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}
                      {area}
                    </button>
                  );
                })}
              </div>

              {!canAddCategory && (newCategoryName.trim() !== '' || newCategoryAreas.length > 0) && (
                <p className="text-xs text-gray-500 mt-2 mb-2">
                  {newCategoryName.trim() === '' ? 'カテゴリ名を入力してください' : 'エリアを1つ以上選んでください'}
                </p>
              )}

              <button
                onClick={handleAddCategory}
                disabled={!canAddCategory}
                className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                このカテゴリを一覧に追加
              </button>
              <p className="text-xs text-gray-400 mt-2">※ 下部の「設定をすべて保存」まで実行すると反映されます</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-2">料理種別カテゴリ</h2>
          <p className="text-sm text-gray-600 mb-4">
            複数の料理種別をまとめて1つの大きなカテゴリとして扱えます(例: 「麺類」にラーメン・つけめん・うどんをまとめる)。
          </p>

          {draft.cuisineCategories.length > 0 && (
            <ul className="mb-4 space-y-2">
              {draft.cuisineCategories.map((cat, index) => (
                <li key={index} className="bg-gray-50 rounded-md px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    {canManageCategories ? (
                      <input
                        type="text"
                        value={cat.name}
                        onChange={e => handleRenameCuisineCategoryAt(index, e.target.value)}
                        className="font-medium px-2 py-1 border border-gray-300 rounded-md flex-1"
                      />
                    ) : (
                      <span className="font-medium">{cat.name}</span>
                    )}
                    {canManageCategories && (
                      <button
                        onClick={() => handleDeleteCuisineCategoryAt(index)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  {canManageCategories ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allCuisines.map(cuisine => {
                        const isSelected = cat.cuisines.includes(cuisine);
                        return (
                          <button
                            type="button"
                            key={cuisine}
                            onClick={() => handleToggleCuisineCategoryCuisine(index, cuisine)}
                            aria-pressed={isSelected}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                              isSelected
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}
                            {cuisine}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <ul className="mt-1 pl-4 text-sm text-gray-600 list-disc list-inside">
                      {cat.cuisines.map(c => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canManageCategories && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">1. カテゴリ名を入力</label>
              <input
                type="text"
                placeholder="例: 麺類"
                value={newCuisineCategoryName}
                onChange={e => setNewCuisineCategoryName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
              />

              <label className="block text-sm font-medium mb-2">2. 含める料理種別を選ぶ(クリックで選択/解除)</label>
              <div className="flex flex-wrap gap-2 mb-1">
                {allCuisines.map(cuisine => {
                  const isSelected = newCuisineCategoryCuisines.includes(cuisine);
                  return (
                    <button
                      type="button"
                      key={cuisine}
                      onClick={() => toggleNewCuisineCategoryCuisine(cuisine)}
                      aria-pressed={isSelected}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}
                      {cuisine}
                    </button>
                  );
                })}
              </div>

              {!canAddCuisineCategory && (newCuisineCategoryName.trim() !== '' || newCuisineCategoryCuisines.length > 0) && (
                <p className="text-xs text-gray-500 mt-2 mb-2">
                  {newCuisineCategoryName.trim() === '' ? 'カテゴリ名を入力してください' : '料理種別を1つ以上選んでください'}
                </p>
              )}

              <button
                onClick={handleAddCuisineCategory}
                disabled={!canAddCuisineCategory}
                className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                このカテゴリを一覧に追加
              </button>
              <p className="text-xs text-gray-400 mt-2">※ 下部の「設定をすべて保存」まで実行すると反映されます</p>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-2">エリア名・料理種別名を変更</h2>
            <p className="text-sm text-gray-600 mb-4">
              名前を変更すると、その名前を使っているすべての店舗に反映されます。
            </p>

            {renameMessage && (
              <div className="mb-3 px-3 py-2 bg-blue-50 text-blue-800 rounded-md text-sm">{renameMessage}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2">エリア名</h3>
                <ul className="space-y-2">
                  {allAreas.map(area => (
                    <li key={area} className="p-2 bg-gray-50 rounded-md space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={areaRenameDrafts[area] ?? area}
                          onChange={e => setAreaRenameDrafts(prev => ({ ...prev, [area]: e.target.value }))}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameArea(area)}
                          disabled={
                            renamingArea === area || (areaRenameDrafts[area] ?? area).trim() === area || !(areaRenameDrafts[area] ?? area).trim()
                          }
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap"
                        >
                          {renamingArea === area ? '変更中...' : '変更'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={areaMergeTargets[area] ?? ''}
                          onChange={e => setAreaMergeTargets(prev => ({ ...prev, [area]: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md"
                        >
                          <option value="">統合先を選んで削除...</option>
                          {allAreas
                            .filter(a => a !== area)
                            .map(a => (
                              <option key={a} value={a}>
                                {a} に統合
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteArea(area)}
                          disabled={renamingArea === area || !areaMergeTargets[area]}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 whitespace-nowrap"
                        >
                          削除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">料理種別名</h3>
                <ul className="space-y-2">
                  {allCuisines.map(cuisine => (
                    <li key={cuisine} className="p-2 bg-gray-50 rounded-md space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={cuisineRenameDrafts[cuisine] ?? cuisine}
                          onChange={e => setCuisineRenameDrafts(prev => ({ ...prev, [cuisine]: e.target.value }))}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameCuisine(cuisine)}
                          disabled={
                            renamingCuisine === cuisine ||
                            (cuisineRenameDrafts[cuisine] ?? cuisine).trim() === cuisine ||
                            !(cuisineRenameDrafts[cuisine] ?? cuisine).trim()
                          }
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap"
                        >
                          {renamingCuisine === cuisine ? '変更中...' : '変更'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={cuisineMergeTargets[cuisine] ?? ''}
                          onChange={e => setCuisineMergeTargets(prev => ({ ...prev, [cuisine]: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md"
                        >
                          <option value="">統合先を選んで削除...</option>
                          {allCuisines
                            .filter(c => c !== cuisine)
                            .map(c => (
                              <option key={c} value={c}>
                                {c} に統合
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteCuisine(cuisine)}
                          disabled={renamingCuisine === cuisine || !cuisineMergeTargets[cuisine]}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 whitespace-nowrap"
                        >
                          削除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {isAdmin && currentUid && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-2">ユーザー管理</h2>
            <p className="text-sm text-gray-600 mb-4">
              承認したアカウントは店舗の追加・編集・削除ができるようになります。「カテゴリ管理」を追加で許可すると、このページの編集もできるようになります。
            </p>
            <UserManagement currentUid={currentUid} />
          </div>
        )}
      </main>
    </div>
  );
}
