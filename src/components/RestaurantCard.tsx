import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Restaurant, RestaurantPhotos } from '../types/restaurant';
import { googleMapsSearchUrl } from '../lib/mapsLink';
import { isSafeHref } from '../lib/safeUrl';
import { fetchRestaurantPhotos } from '../lib/db';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (id: string) => void;
  onSelect?: (restaurant: Restaurant) => void;
  isSelected?: boolean;
  showAddedBy?: boolean;
  canEdit?: boolean;
  allRestaurants?: Restaurant[];
  bulkChecked?: boolean;
  onBulkCheckChange?: (id: string, checked: boolean) => void;
}

export const RestaurantCard = forwardRef<HTMLDivElement, RestaurantCardProps>(
  function RestaurantCard(
    {
      restaurant,
      onEdit,
      onDelete,
      onSelect,
      isSelected,
      showAddedBy,
      canEdit,
      allRestaurants,
      bulkChecked,
      onBulkCheckChange,
    },
    ref,
  ) {
    const ratingColor = {
      A: 'bg-green-100 text-green-800',
      B: 'bg-blue-100 text-blue-800',
      C: 'bg-yellow-100 text-yellow-800',
      D: 'bg-red-100 text-red-800',
    };

    const recommended = useMemo(() => {
      if (!isSelected || !allRestaurants || !restaurant.recommendedIds?.length) return [];
      return restaurant.recommendedIds
        .map(id => allRestaurants.find(r => r.id === id))
        .filter((r): r is Restaurant => !!r);
    }, [isSelected, allRestaurants, restaurant.recommendedIds]);

    const [photos, setPhotos] = useState<RestaurantPhotos | null>(null);
    const [photosLoading, setPhotosLoading] = useState(false);

    useEffect(() => {
      if (!isSelected || !restaurant.hasPhotos || photos) return;
      let cancelled = false;
      setPhotosLoading(true);
      fetchRestaurantPhotos(restaurant.id)
        .then(result => {
          if (!cancelled) setPhotos(result);
        })
        .finally(() => {
          if (!cancelled) setPhotosLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [isSelected, restaurant.hasPhotos, restaurant.id, photos]);

    return (
      <div
        ref={ref}
        onClick={() => onSelect?.(restaurant)}
        className={`p-4 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-yellow-50 ring-2 ring-inset ring-yellow-400' : ''}`}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-2">
              {canEdit && onBulkCheckChange && (
                <input
                  type="checkbox"
                  checked={!!bulkChecked}
                  onChange={e => onBulkCheckChange(restaurant.id, e.target.checked)}
                  onClick={e => e.stopPropagation()}
                  className="mt-1.5 shrink-0"
                />
              )}
              <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${ratingColor[restaurant.overallRating as keyof typeof ratingColor] || 'bg-gray-100 text-gray-500'}`}>
                {restaurant.overallRating || '未評価'}
              </span>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {restaurant.name}
                  {restaurant.visibility === 'private' && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                      🔒 限定公開
                    </span>
                  )}
                  {restaurant.isLunch && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      🍱 ランチ
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600">{restaurant.cuisines.join('、')}</p>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-2">
              <p>エリア: {restaurant.area}</p>
              <p>味: {restaurant.tasteRating || '未評価'} | コスパ: {restaurant.valuRating || '未評価'}</p>
              {showAddedBy && restaurant.addedBy && <p>追加者: {restaurant.addedBy}</p>}
            </div>

            {restaurant.notes && (
              <p className="text-sm text-gray-500 mb-2 italic">"{restaurant.notes}"</p>
            )}

            <a
              href={
                restaurant.customLink && isSafeHref(restaurant.customLink)
                  ? restaurant.customLink
                  : googleMapsSearchUrl(restaurant.name, restaurant.area)
              }
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              🔗 Googleマップで見る
            </a>
          </div>

          {isSelected && restaurant.hasPhotos && (
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
              {photosLoading && !photos && (
                <div className="w-full h-40 sm:w-36 sm:h-32 md:w-44 md:h-36 flex items-center justify-center bg-gray-50 rounded-md border border-gray-100 text-xs text-gray-400">
                  写真を読み込み中...
                </div>
              )}
              {photos?.exteriorPhoto && (
                <img
                  src={photos.exteriorPhoto.url}
                  alt="外観"
                  onError={e => (e.currentTarget.style.display = 'none')}
                  className="w-full h-40 sm:w-36 sm:h-32 md:w-44 md:h-36 object-contain bg-gray-50 rounded-md border border-gray-100"
                />
              )}
              {photos?.dishPhoto && (
                <img
                  src={photos.dishPhoto.url}
                  alt="料理"
                  onError={e => (e.currentTarget.style.display = 'none')}
                  className="w-full h-40 sm:w-36 sm:h-32 md:w-44 md:h-36 object-contain bg-gray-50 rounded-md border border-gray-100"
                />
              )}
            </div>
          )}
        </div>

        {isSelected && recommended.length > 0 && (
          <div className="mt-2 mb-2 p-3 bg-blue-50 rounded-md" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium text-blue-900 mb-2">
              この店が好きな人はこの店もおすすめ
            </p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {recommended.map(r => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(r)}
                    className="text-sm text-blue-700 hover:underline text-left"
                  >
                    {r.name}({r.area})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2 justify-end mt-2">
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(restaurant);
              }}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              編集
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(restaurant.id);
              }}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              削除
            </button>
          </div>
        )}
      </div>
    );
  },
);
