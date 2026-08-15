import { useEffect, useMemo, useState } from 'react';
import { PhotoInfo, Restaurant, RestaurantUpdate, Visibility } from '../types/restaurant';
import { ComboSelect } from './ComboSelect';
import { CuisineMultiSelect } from './CuisineMultiSelect';
import { LocationPicker } from './LocationPicker';
import { VisibilityPicker } from './VisibilityPicker';
import { PhotoField } from './PhotoField';
import { HistoryPanel } from './HistoryPanel';
import { RecommendPicker } from './RecommendPicker';
import { AreaCategory, CuisineCategory, groupAreasByCategory, groupCuisinesByCategory } from '../lib/categories';
import { MapCenter, VisibilityGroup } from '../lib/appSettings';
import { googleMapsSearchUrl } from '../lib/mapsLink';
import { isSafeHref } from '../lib/safeUrl';
import { fetchRestaurantPhotos } from '../lib/db';

interface EditRestaurantModalProps {
  restaurant: Restaurant;
  onSave: (id: string, data: RestaurantUpdate) => void;
  onClose: () => void;
  loading: boolean;
  defaultCenter: MapCenter | null;
  visibilityGroups: VisibilityGroup[];
  allRestaurants: Restaurant[];
  cuisineOptions: string[];
  areaOptions: string[];
  categories: AreaCategory[];
  cuisineCategories: CuisineCategory[];
}

export function EditRestaurantModal({
  restaurant,
  onSave,
  onClose,
  loading,
  defaultCenter,
  visibilityGroups,
  allRestaurants,
  cuisineOptions,
  areaOptions,
  categories,
  cuisineCategories,
}: EditRestaurantModalProps) {
  const areaGroups = useMemo(() => groupAreasByCategory(areaOptions, categories), [areaOptions, categories]);
  const cuisineGroups = useMemo(
    () => groupCuisinesByCategory(cuisineOptions, cuisineCategories),
    [cuisineOptions, cuisineCategories],
  );
  const [formData, setFormData] = useState({
    name: restaurant.name,
    cuisines: restaurant.cuisines ?? [],
    area: restaurant.area,
    overallRating: restaurant.overallRating,
    tasteRating: restaurant.tasteRating,
    valuRating: restaurant.valuRating,
    notes: restaurant.notes,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    visibility: restaurant.visibility ?? ('public' as Visibility),
    visibilityGroupIds: restaurant.visibilityGroupIds ?? ([] as string[]),
    // undefined = "not fetched/touched yet" (kept out of the save patch so it can never
    // clobber real photo data); becomes a concrete PhotoInfo|null once loaded or edited.
    exteriorPhoto: undefined as PhotoInfo | null | undefined,
    dishPhoto: undefined as PhotoInfo | null | undefined,
    customLink: restaurant.customLink ?? '',
    recommendedIds: restaurant.recommendedIds ?? ([] as string[]),
    isLunch: restaurant.isLunch ?? false,
  });
  const [photosLoaded, setPhotosLoaded] = useState(!restaurant.hasPhotos);

  useEffect(() => {
    if (!restaurant.hasPhotos) return;
    let cancelled = false;
    fetchRestaurantPhotos(restaurant.id).then(photos => {
      if (cancelled) return;
      setFormData(prev => ({ ...prev, exteriorPhoto: photos.exteriorPhoto, dishPhoto: photos.dishPhoto }));
      setPhotosLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.cuisines.length === 0 || !formData.area) {
      alert('店名、料理、エリアは必須項目です');
      return;
    }
    if (formData.customLink && !isSafeHref(formData.customLink)) {
      alert('リンクは http:// または https:// で始まるURLを入力してください');
      return;
    }
    const visibleToUids =
      formData.visibility === 'private'
        ? Array.from(
            new Set(
              formData.visibilityGroupIds.flatMap(
                id => visibilityGroups.find(g => g.id === id)?.uids ?? [],
              ),
            ),
          )
        : [];

    // Only send exteriorPhoto/dishPhoto if they were actually fetched or edited this
    // session — otherwise omit them entirely so an unrelated save can't clobber photo
    // data (e.g. a restaurant not yet migrated to the photos subcollection, whose
    // hasPhotos flag doesn't yet reflect photos still embedded in the main doc).
    const { exteriorPhoto, dishPhoto, ...rest } = formData;
    onSave(restaurant.id, {
      ...rest,
      visibleToUids,
      ...(exteriorPhoto !== undefined ? { exteriorPhoto } : {}),
      ...(dishPhoto !== undefined ? { dishPhoto } : {}),
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">店舗情報を編集</h2>
          <HistoryPanel
            restaurantId={restaurant.id}
            onRevert={snapshot =>
              setFormData(prev => ({
                name: snapshot.name ?? prev.name,
                cuisines: snapshot.cuisines ?? prev.cuisines,
                area: snapshot.area ?? prev.area,
                overallRating: snapshot.overallRating ?? prev.overallRating,
                tasteRating: snapshot.tasteRating ?? prev.tasteRating,
                valuRating: snapshot.valuRating ?? prev.valuRating,
                notes: snapshot.notes ?? prev.notes,
                latitude: snapshot.latitude ?? prev.latitude,
                longitude: snapshot.longitude ?? prev.longitude,
                visibility: snapshot.visibility ?? prev.visibility,
                visibilityGroupIds: snapshot.visibilityGroupIds ?? prev.visibilityGroupIds,
                // History snapshots no longer include photo bytes (they now live in a
                // separate subcollection, not copied into history) — reverting can't
                // restore old photos, so the current ones are left as-is.
                exteriorPhoto: prev.exteriorPhoto,
                dishPhoto: prev.dishPhoto,
                customLink: snapshot.customLink ?? prev.customLink,
                recommendedIds: snapshot.recommendedIds ?? prev.recommendedIds,
                isLunch: snapshot.isLunch ?? prev.isLunch,
              }))
            }
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              name="name"
              placeholder="店名"
              value={formData.name}
              onChange={handleChange}
              className="px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            <ComboSelect
              name="area"
              placeholder="エリア"
              value={formData.area}
              options={areaOptions}
              groups={areaGroups}
              onChange={v => setFormData(prev => ({ ...prev, area: v }))}
              required
            />
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 text-sm flex items-center">
              追加者: {restaurant.addedBy || '不明'}
            </div>

            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <select
                name="overallRating"
                value={formData.overallRating}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">総合: 未評価</option>
                <option value="A">総合: A</option>
                <option value="B">総合: B</option>
                <option value="C">総合: C</option>
                <option value="D">総合: D</option>
              </select>

              <select
                name="tasteRating"
                value={formData.tasteRating}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">味: 未評価</option>
                <option value="A">味: A</option>
                <option value="B">味: B</option>
                <option value="C">味: C</option>
                <option value="D">味: D</option>
              </select>

              <select
                name="valuRating"
                value={formData.valuRating}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">コスパ: 未評価</option>
                <option value="A">コスパ: A</option>
                <option value="B">コスパ: B</option>
                <option value="C">コスパ: C</option>
                <option value="D">コスパ: D</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <CuisineMultiSelect
              groups={cuisineGroups}
              selected={formData.cuisines}
              onChange={cuisines => setFormData(prev => ({ ...prev, cuisines }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={formData.isLunch}
              onChange={e => setFormData(prev => ({ ...prev, isLunch: e.target.checked }))}
            />
            ランチ
          </label>

          <div className="mb-4">
            <LocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
              defaultCenter={defaultCenter}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {photosLoaded ? (
              <>
                <PhotoField
                  label="外観の写真"
                  photo={formData.exteriorPhoto ?? null}
                  onChange={photo => setFormData(prev => ({ ...prev, exteriorPhoto: photo }))}
                />
                <PhotoField
                  label="料理の写真"
                  photo={formData.dishPhoto ?? null}
                  onChange={photo => setFormData(prev => ({ ...prev, dishPhoto: photo }))}
                />
              </>
            ) : (
              <p className="text-sm text-gray-400 md:col-span-2">写真を読み込み中...</p>
            )}
          </div>

          <div className="mb-4">
            <VisibilityPicker
              visibility={formData.visibility}
              groups={visibilityGroups}
              selectedGroupIds={formData.visibilityGroupIds}
              onChange={(visibility, visibilityGroupIds) =>
                setFormData(prev => ({ ...prev, visibility, visibilityGroupIds }))
              }
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">リンク</label>
            <input
              type="url"
              name="customLink"
              placeholder={googleMapsSearchUrl(formData.name, formData.area)}
              value={formData.customLink}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-400 mt-1">
              空欄の場合はGoogleマップの検索結果(店名+エリア)にリンクします
            </p>
          </div>

          <div className="mb-4">
            <RecommendPicker
              allRestaurants={allRestaurants}
              excludeId={restaurant.id}
              selectedIds={formData.recommendedIds}
              onChange={ids => setFormData(prev => ({ ...prev, recommendedIds: ids }))}
            />
          </div>

          <textarea
            name="notes"
            placeholder="備考"
            value={formData.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            rows={2}
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !photosLoaded}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '保存中...' : !photosLoaded ? '写真を読み込み中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
