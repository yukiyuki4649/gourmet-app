import { useMemo, useState } from 'react';
import { Restaurant } from '../types/restaurant';

interface RecommendPickerProps {
  allRestaurants: Restaurant[];
  excludeId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function RecommendPicker({ allRestaurants, excludeId, selectedIds, onChange }: RecommendPickerProps) {
  const [search, setSearch] = useState('');

  const candidates = useMemo(
    () =>
      allRestaurants
        .filter(r => r.id !== excludeId)
        .filter(r => !search.trim() || r.name.includes(search.trim()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allRestaurants, excludeId, search],
  );

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">この店が好きな人へのおすすめ</label>
      <p className="text-xs text-gray-500 mb-2">
        手動で登録済みの店舗の中から、あわせておすすめしたい店舗を選んでください
      </p>
      <input
        type="text"
        placeholder="店名で絞り込み"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
      />
      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md">
        {candidates.length === 0 && <p className="text-xs text-gray-400 p-1">該当する店舗がありません</p>}
        {candidates.map(r => {
          const isSelected = selectedIds.includes(r.id);
          return (
            <button
              type="button"
              key={r.id}
              onClick={() => toggle(r.id)}
              className={`px-3 py-1 rounded-full text-sm border ${
                isSelected
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {isSelected ? '✓ ' : ''}
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
