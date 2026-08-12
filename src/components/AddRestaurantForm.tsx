import { useState } from 'react';
import { RestaurantInput } from '../types/restaurant';

interface AddRestaurantFormProps {
  onSubmit: (data: RestaurantInput & { latitude: number; longitude: number }) => void;
  loading: boolean;
}

export function AddRestaurantForm({ onSubmit, loading }: AddRestaurantFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    cuisine: '',
    area: '',
    overallRating: 'B',
    tasteRating: 'B',
    valuRating: 'B',
    notes: '',
    latitude: 0,
    longitude: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'latitude' || name === 'longitude' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cuisine || !formData.area) {
      alert('店名、料理、エリアは必須項目です');
      return;
    }
    onSubmit(formData);
    setFormData({
      name: '',
      cuisine: '',
      area: '',
      overallRating: 'B',
      tasteRating: 'B',
      valuRating: 'B',
      notes: '',
      latitude: 0,
      longitude: 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">新規店舗追加</h2>

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
        <input
          type="text"
          name="cuisine"
          placeholder="料理種別"
          value={formData.cuisine}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <input
          type="text"
          name="area"
          placeholder="エリア"
          value={formData.area}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded-md"
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
            <option value="A">CP: A</option>
            <option value="B">CP: B</option>
            <option value="C">CP: C</option>
            <option value="D">CP: D</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          type="number"
          name="latitude"
          placeholder="緯度"
          value={formData.latitude}
          onChange={handleChange}
          step="0.0001"
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="number"
          name="longitude"
          placeholder="経度"
          value={formData.longitude}
          onChange={handleChange}
          step="0.0001"
          className="px-3 py-2 border border-gray-300 rounded-md"
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
        disabled={loading}
        className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? '追加中...' : '追加'}
      </button>
    </form>
  );
}
