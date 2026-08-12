import { Restaurant } from '../types/restaurant';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (id: string) => void;
}

export function RestaurantCard({ restaurant, onEdit, onDelete }: RestaurantCardProps) {
  const ratingColor = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-blue-100 text-blue-800',
    C: 'bg-yellow-100 text-yellow-800',
    D: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg">{restaurant.name}</h3>
          <p className="text-sm text-gray-600">{restaurant.cuisine}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${ratingColor[restaurant.overallRating as keyof typeof ratingColor] || 'bg-gray-100'}`}>
          {restaurant.overallRating}
        </span>
      </div>

      <div className="text-sm text-gray-600 mb-2">
        <p>エリア: {restaurant.area}</p>
        <p>味: {restaurant.tasteRating} | コスパ: {restaurant.valuRating}</p>
      </div>

      {restaurant.notes && (
        <p className="text-sm text-gray-500 mb-2 italic">"{restaurant.notes}"</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => onEdit(restaurant)}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(restaurant.id)}
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          削除
        </button>
      </div>
    </div>
  );
}
