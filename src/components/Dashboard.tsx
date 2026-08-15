import { useState, useMemo, useRef, useEffect } from 'react';
import { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';
import { BulkEditBar } from './BulkEditBar';
import {
  AreaCategory,
  CuisineCategory,
  buildFilterGroups,
  buildCuisineFilterGroups,
  resolveFilterAreas,
  resolveFilterCuisines,
  sortByOrder,
} from '../lib/categories';
import { applyRestaurantFilters, LunchFilter } from '../lib/filters';
import { VisibilityGroup } from '../lib/appSettings';

interface DashboardProps {
  restaurants: Restaurant[];
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (id: string) => void;
  onSelectRestaurant?: (id: string) => void;
  selectedId?: string | null;
  categories: AreaCategory[];
  cuisineCategories: CuisineCategory[];
  visibilityGroups: VisibilityGroup[];
  areaOrder: string[];
  cuisineOrder: string[];
  areaFilter: string;
  onAreaFilterChange: (value: string) => void;
  cuisineFilter: string;
  onCuisineFilterChange: (value: string) => void;
  lunchFilter: LunchFilter;
  onLunchFilterChange: (value: LunchFilter) => void;
  personFilter: string;
  onClearPersonFilter: () => void;
  showAddedBy: boolean;
  canEdit: boolean;
  onBulkUpdate: (ids: string[], patch: Partial<Restaurant>) => Promise<void>;
}

export function Dashboard({
  restaurants,
  onEdit,
  onDelete,
  onSelectRestaurant,
  selectedId,
  categories,
  cuisineCategories,
  visibilityGroups,
  areaOrder,
  cuisineOrder,
  areaFilter,
  onAreaFilterChange,
  cuisineFilter,
  onCuisineFilterChange,
  lunchFilter,
  onLunchFilterChange,
  personFilter,
  onClearPersonFilter,
  showAddedBy,
  canEdit,
  onBulkUpdate,
}: DashboardProps) {
  const [sortBy, setSortBy] = useState<'rating' | 'area' | 'cuisine'>('rating');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const handleBulkCheckChange = (id: string, checked: boolean) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const areas = useMemo(() => {
    const unique = Array.from(new Set(restaurants.map(r => r.area)));
    return sortByOrder(unique, areaOrder);
  }, [restaurants, areaOrder]);

  const cuisines = useMemo(() => {
    const unique = Array.from(new Set(restaurants.flatMap(r => r.cuisines)));
    return sortByOrder(unique, cuisineOrder);
  }, [restaurants, cuisineOrder]);

  const filterGroups = useMemo(() => buildFilterGroups(areas, categories), [areas, categories]);
  const cuisineFilterGroups = useMemo(
    () => buildCuisineFilterGroups(cuisines, cuisineCategories),
    [cuisines, cuisineCategories],
  );

  const effectiveAreas = useMemo(
    () => resolveFilterAreas(areaFilter, categories),
    [areaFilter, categories],
  );
  const effectiveCuisines = useMemo(
    () => resolveFilterCuisines(cuisineFilter, cuisineCategories),
    [cuisineFilter, cuisineCategories],
  );

  useEffect(() => {
    if (!selectedId) return;
    const selected = restaurants.find(r => r.id === selectedId);
    if (selected && effectiveAreas && !effectiveAreas.includes(selected.area)) {
      onAreaFilterChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, restaurants]);

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current[selectedId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId, areaFilter, cuisineFilter, sortBy]);

  const filtered = useMemo(() => {
    let result = applyRestaurantFilters(restaurants, {
      effectiveAreas,
      effectiveCuisines,
      person: personFilter,
      lunch: lunchFilter,
    });

    if (sortBy === 'rating') {
      result = [...result].sort((a, b) => {
        // 未評価(空文字)はAのすぐ下、B以下より上に来るようにする。
        const ratingOrder = { A: 5, '': 4, B: 3, C: 2, D: 1 };
        return (ratingOrder[b.overallRating as keyof typeof ratingOrder] ?? 0) -
               (ratingOrder[a.overallRating as keyof typeof ratingOrder] ?? 0);
      });
    } else if (sortBy === 'area') {
      result = [...result].sort((a, b) => a.area.localeCompare(b.area));
    } else if (sortBy === 'cuisine') {
      result = [...result].sort((a, b) => a.cuisines.join('、').localeCompare(b.cuisines.join('、')));
    }

    return result;
  }, [restaurants, sortBy, effectiveAreas, effectiveCuisines, personFilter, lunchFilter]);

  const allFilteredChecked = filtered.length > 0 && filtered.every(r => checkedIds.has(r.id));

  const handleToggleSelectAll = () => {
    if (allFilteredChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filtered.map(r => r.id)));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">📋 飲食店一覧</h2>
          {canEdit && filtered.length > 0 && (
            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
            >
              {allFilteredChecked ? '選択解除' : `絞り込み結果をすべて選択(${filtered.length}件)`}
            </button>
          )}
        </div>

        {personFilter && (
          <div className="mb-4 flex items-center justify-between px-3 py-2 bg-blue-50 text-blue-800 text-sm rounded-md">
            <span>設定で「{personFilter}さんが追加した店舗」のみに絞り込み中です</span>
            <button onClick={onClearPersonFilter} className="underline hover:no-underline">
              解除
            </button>
          </div>
        )}

        {canEdit && checkedIds.size > 0 && (
          <BulkEditBar
            count={checkedIds.size}
            areaOptions={areas}
            visibilityGroups={visibilityGroups}
            onClear={() => setCheckedIds(new Set())}
            onApply={async patch => {
              await onBulkUpdate(Array.from(checkedIds), patch);
              setCheckedIds(new Set());
            }}
          />
        )}

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">並べ替え</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="rating">評価順</option>
              <option value="area">エリア順</option>
              <option value="cuisine">料理種別順</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ランチで絞り込み</label>
            <select
              value={lunchFilter}
              onChange={e => onLunchFilterChange(e.target.value as LunchFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">すべて</option>
              <option value="lunch">ランチがお得</option>
              <option value="notLunch">それ以外</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">エリアで絞り込み</label>
            <select
              value={areaFilter}
              onChange={e => onAreaFilterChange(e.target.value)}
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
            <label className="block text-sm font-medium mb-2">料理種別で絞り込み</label>
            <select
              value={cuisineFilter}
              onChange={e => onCuisineFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">すべての料理種別</option>
              {cuisineFilterGroups.map(group => (
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

          <div className="hidden md:block md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium mb-2">件数</label>
            <div className="px-3 py-2 bg-gray-100 rounded-md">
              {filtered.length} 件
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y max-h-[36rem] overflow-y-auto">
        {filtered.map(restaurant => (
          <RestaurantCard
            key={restaurant.id}
            ref={el => (cardRefs.current[restaurant.id] = el)}
            restaurant={restaurant}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelect={r => onSelectRestaurant?.(r.id)}
            isSelected={restaurant.id === selectedId}
            showAddedBy={showAddedBy}
            canEdit={canEdit}
            allRestaurants={restaurants}
            bulkChecked={checkedIds.has(restaurant.id)}
            onBulkCheckChange={handleBulkCheckChange}
          />
        ))}
      </div>
    </div>
  );
}
