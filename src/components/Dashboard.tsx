import { useState, useMemo } from 'react';
import { Restaurant } from '../types/restaurant';
import { RestaurantCard } from './RestaurantCard';

interface DashboardProps {
  restaurants: Restaurant[];
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (id: string) => void;
}

export function Dashboard({ restaurants, onEdit, onDelete }: DashboardProps) {
  const [sortBy, setSortBy] = useState<'rating' | 'area' | 'cuisine'>('rating');
  const [filterArea, setFilterArea] = useState<string>('');

  const areas = useMemo(() => {
    const unique = new Set(restaurants.map(r => r.area));
    return Array.from(unique).sort();
  }, [restaurants]);

  const filtered = useMemo(() => {
    let result = restaurants;

    if (filterArea) {
      result = result.filter(r => r.area === filterArea);
    }

    if (sortBy === 'rating') {
      result = [...result].sort((a, b) => {
        const ratingOrder = { A: 4, B: 3, C: 2, D: 1 };
        return (ratingOrder[b.overallRating as keyof typeof ratingOrder] || 0) -
               (ratingOrder[a.overallRating as keyof typeof ratingOrder] || 0);
      });
    } else if (sortBy === 'area') {
      result = [...result].sort((a, b) => a.area.localeCompare(b.area));
    } else if (sortBy === 'cuisine') {
      result = [...result].sort((a, b) => a.cuisine.localeCompare(b.cuisine));
    }

    return result;
  }, [restaurants, sortBy, filterArea]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold mb-4">飲食店一覧</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium mb-2">エリアで絞り込み</label>
            <select
              value={filterArea}
              onChange={e => setFilterArea(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">すべてのエリア</option>
              {areas.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">件数</label>
            <div className="px-3 py-2 bg-gray-100 rounded-md">
              {filtered.length} 件
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {filtered.map(restaurant => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
