import { useMemo, useState } from 'react';
import { PhotoInfo, RestaurantInput, Visibility } from '../types/restaurant';
import { ComboSelect } from './ComboSelect';
import { CuisineMultiSelect } from './CuisineMultiSelect';
import { LocationPicker } from './LocationPicker';
import { VisibilityPicker } from './VisibilityPicker';
import { RecommendPicker } from './RecommendPicker';
import { AreaCategory, CuisineCategory, groupAreasByCategory, groupCuisinesByCategory } from '../lib/categories';
import { MapCenter } from '../lib/appSettings';
import { UsernameEntry } from '../lib/auth';
import { suggestRestaurantPhotos } from '../lib/unsplash';
import { Restaurant } from '../types/restaurant';

interface AddRestaurantFormProps {
  onSubmit: (data: RestaurantInput & { latitude: number; longitude: number }) => void;
  loading: boolean;
  cuisineOptions: string[];
  areaOptions: string[];
  categories: AreaCategory[];
  cuisineCategories: CuisineCategory[];
  addedByName: string;
  addedByUid: string;
  defaultCenter: MapCenter | null;
  users: UsernameEntry[];
  allRestaurants: Restaurant[];
}

function makeInitialFormData(addedByName: string, addedByUid: string) {
  return {
    name: '',
    cuisines: [] as string[],
    area: '',
    overallRating: 'B',
    tasteRating: 'B',
    valuRating: 'B',
    notes: '',
    latitude: 0,
    longitude: 0,
    addedBy: addedByName,
    addedByUid,
    visibility: 'public' as Visibility,
    visibleToUids: [] as string[],
    exteriorPhoto: null as PhotoInfo | null,
    dishPhoto: null as PhotoInfo | null,
    recommendedIds: [] as string[],
    isLunch: false,
  };
}

export function AddRestaurantForm({
  onSubmit,
  loading,
  cuisineOptions,
  areaOptions,
  categories,
  cuisineCategories,
  addedByName,
  addedByUid,
  defaultCenter,
  users,
  allRestaurants,
}: AddRestaurantFormProps) {
  const [formData, setFormData] = useState(() => makeInitialFormData(addedByName, addedByUid));
  const [fetchingPhotos, setFetchingPhotos] = useState(false);

  const areaGroups = useMemo(() => groupAreasByCategory(areaOptions, categories), [areaOptions, categories]);
  const cuisineGroups = useMemo(
    () => groupCuisinesByCategory(cuisineOptions, cuisineCategories),
    [cuisineOptions, cuisineCategories],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.cuisines.length === 0 || !formData.area) {
      alert('店名、料理、エリアは必須項目です');
      return;
    }

    setFetchingPhotos(true);
    const { exteriorPhoto, dishPhoto } = await suggestRestaurantPhotos(formData.cuisines[0] ?? '').catch(() => ({
      exteriorPhoto: null,
      dishPhoto: null,
    }));
    setFetchingPhotos(false);

    onSubmit({ ...formData, exteriorPhoto, dishPhoto });
    setFormData(makeInitialFormData(addedByName, addedByUid));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">新規店舗追加</h2>
      <p className="text-sm text-gray-500 mb-4">追加した人として「{addedByName}」が記録されます</p>

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

        <div className="grid grid-cols-3 gap-2">
          <select
            name="overallRating"
            value={formData.overallRating}
            onChange={handleChange}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
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

      <div className="mb-4">
        <VisibilityPicker
          visibility={formData.visibility}
          visibleToUids={formData.visibleToUids}
          onChange={(visibility, visibleToUids) => setFormData(prev => ({ ...prev, visibility, visibleToUids }))}
          users={users}
          currentUid={addedByUid}
        />
      </div>

      <div className="mb-4">
        <RecommendPicker
          allRestaurants={allRestaurants}
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

      <button
        type="submit"
        disabled={loading || fetchingPhotos}
        className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
      >
        {fetchingPhotos ? '写真を検索中...' : loading ? '追加中...' : '追加'}
      </button>
    </form>
  );
}
