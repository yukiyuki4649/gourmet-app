import { useMemo, useState } from 'react';
import { Restaurant } from '../types/restaurant';
import { AppSettings, saveAppSettings } from '../lib/appSettings';
import { AreaCategory, CuisineCategory, sortByOrder, reorder } from '../lib/categories';
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
  deletedRestaurants: Restaurant[];
  onRestoreRestaurant: (id: string) => Promise<void>;
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
  deletedRestaurants,
  onRestoreRestaurant,
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
    const count = restaurants.filter(r => r.cuisines.includes(oldName)).length;
    if (!window.confirm(`「${oldName}」(${count}件の店舗)を削除し、「${target}」に統合します。よろしいですか?`)) return;
    performRenameCuisine(oldName, target);
    setCuisineMergeTargets(prev => {
      const next = { ...prev };
      delete next[oldName];
      return next;
    });
  };

  // --- area categories (draft) ---
  const allAreas = useMemo(
    () => sortByOrder(Array.from(new Set(restaurants.map(r => r.area))), draft.areaOrder),
    [restaurants, draft.areaOrder],
  );

  const [draggedAreaIndex, setDraggedAreaIndex] = useState<number | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);

  const handleAreaDrop = (dropIndex: number) => {
    if (!canManageCategories || draggedAreaIndex === null || draggedAreaIndex === dropIndex) return;
    setDraft(prev => ({ ...prev, areaOrder: reorder(allAreas, draggedAreaIndex, dropIndex) }));
    setSaveState('idle');
    setDraggedAreaIndex(null);
  };

  const handleCategoryDrop = (dropIndex: number) => {
    if (!canManageCategories || draggedCategoryIndex === null || draggedCategoryIndex === dropIndex) return;
    setDraft(prev => ({ ...prev, categories: reorder(prev.categories, draggedCategoryIndex, dropIndex) }));
    setSaveState('idle');
    setDraggedCategoryIndex(null);
  };
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
  const allCuisines = useMemo(
    () => sortByOrder(Array.from(new Set(restaurants.flatMap(r => r.cuisines))), draft.cuisineOrder),
    [restaurants, draft.cuisineOrder],
  );

  const [draggedCuisineIndex, setDraggedCuisineIndex] = useState<number | null>(null);
  const [draggedCuisineCategoryIndex, setDraggedCuisineCategoryIndex] = useState<number | null>(null);

  const handleCuisineDrop = (dropIndex: number) => {
    if (!canManageCategories || draggedCuisineIndex === null || draggedCuisineIndex === dropIndex) return;
    setDraft(prev => ({ ...prev, cuisineOrder: reorder(allCuisines, draggedCuisineIndex, dropIndex) }));
    setSaveState('idle');
    setDraggedCuisineIndex(null);
  };

  const handleCuisineCategoryDrop = (dropIndex: number) => {
    if (!canManageCategories || draggedCuisineCategoryIndex === null || draggedCuisineCategoryIndex === dropIndex) return;
    setDraft(prev => ({ ...prev, cuisineCategories: reorder(prev.cuisineCategories, draggedCuisineCategoryIndex, dropIndex) }));
    setSaveState('idle');
    setDraggedCuisineCategoryIndex(null);
  };
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

    const nextDraft: AppSettings = {
      categories: trimmedCategories,
      cuisineCategories: trimmedCuisineCategories,
      areaOrder: draft.areaOrder,
      cuisineOrder: draft.cuisineOrder,
    };
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
            {canManageCategories && ' ⠿ をドラッグしてカテゴリの並び順を変更できます。'}
          </p>

          {draft.categories.length > 0 && (
            <ul className="mb-4 space-y-2">
              {draft.categories.map((cat, index) => (
                <li
                  key={index}
                  draggable={canManageCategories}
                  onDragStart={() => setDraggedCategoryIndex(index)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleCategoryDrop(index)}
                  onDragEnd={() => setDraggedCategoryIndex(null)}
                  className={`bg-gray-50 rounded-md px-3 py-2 ${
                    draggedCategoryIndex === index ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {canManageCategories && <span className="shrink-0 text-gray-400 cursor-move select-none">⠿</span>}
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
            {canManageCategories && ' ⠿ をドラッグしてカテゴリの並び順を変更できます。'}
          </p>

          {draft.cuisineCategories.length > 0 && (
            <ul className="mb-4 space-y-2">
              {draft.cuisineCategories.map((cat, index) => (
                <li
                  key={index}
                  draggable={canManageCategories}
                  onDragStart={() => setDraggedCuisineCategoryIndex(index)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleCuisineCategoryDrop(index)}
                  onDragEnd={() => setDraggedCuisineCategoryIndex(null)}
                  className={`bg-gray-50 rounded-md px-3 py-2 ${
                    draggedCuisineCategoryIndex === index ? 'opacity-40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {canManageCategories && <span className="shrink-0 text-gray-400 cursor-move select-none">⠿</span>}
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
              {canManageCategories && '⠿ をドラッグして並び替えられます(反映は「設定をすべて保存」で確定します)。'}
            </p>

            {renameMessage && (
              <div className="mb-3 px-3 py-2 bg-blue-50 text-blue-800 rounded-md text-sm">{renameMessage}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2">エリア名</h3>
                <ul className="space-y-2">
                  {allAreas.map((area, index) => (
                    <li
                      key={area}
                      draggable={canManageCategories}
                      onDragStart={() => setDraggedAreaIndex(index)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleAreaDrop(index)}
                      onDragEnd={() => setDraggedAreaIndex(null)}
                      className={`p-2 bg-gray-50 rounded-md space-y-1.5 ${draggedAreaIndex === index ? 'opacity-40' : ''}`}
                    >
                      <div className="flex gap-2 items-center">
                        {canManageCategories && <span className="shrink-0 text-gray-400 cursor-move select-none">⠿</span>}
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
                  {allCuisines.map((cuisine, index) => (
                    <li
                      key={cuisine}
                      draggable={canManageCategories}
                      onDragStart={() => setDraggedCuisineIndex(index)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleCuisineDrop(index)}
                      onDragEnd={() => setDraggedCuisineIndex(null)}
                      className={`p-2 bg-gray-50 rounded-md space-y-1.5 ${draggedCuisineIndex === index ? 'opacity-40' : ''}`}
                    >
                      <div className="flex gap-2 items-center">
                        {canManageCategories && <span className="shrink-0 text-gray-400 cursor-move select-none">⠿</span>}
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

        {isAdmin && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-2">非表示にした店舗</h2>
            <p className="text-sm text-gray-600 mb-4">
              削除された店舗はここに表示され、管理者だけが見えます。「復元」で一覧に戻せます。
            </p>
            {deletedRestaurants.length === 0 ? (
              <p className="text-sm text-gray-400">非表示の店舗はありません</p>
            ) : (
              <ul className="space-y-2">
                {deletedRestaurants.map(r => (
                  <li key={r.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-md px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-gray-500 ml-2">
                        {r.area} / {r.cuisines.join('、')} / 追加者: {r.addedBy || '不明'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestoreRestaurant(r.id)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                    >
                      復元
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
