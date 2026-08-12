import { useEffect, useState } from 'react';
import { Map } from './components/Map';
import { Dashboard } from './components/Dashboard';
import { AddRestaurantForm } from './components/AddRestaurantForm';
import { Restaurant, RestaurantInput } from './types/restaurant';
import { getAllRestaurants, addRestaurant, deleteRestaurant, updateRestaurant } from './lib/db';
import './index.css';

export default function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const data = await getAllRestaurants();
      setRestaurants(data);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
      alert('飲食店データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRestaurant = async (data: RestaurantInput & { latitude: number; longitude: number }) => {
    try {
      setIsAdding(true);
      await addRestaurant(data);
      await loadRestaurants();
    } catch (error) {
      console.error('Failed to add restaurant:', error);
      alert('飲食店の追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!window.confirm('この飲食店を削除しますか？')) return;

    try {
      await deleteRestaurant(id);
      await loadRestaurants();
    } catch (error) {
      console.error('Failed to delete restaurant:', error);
      alert('飲食店の削除に失敗しました');
    }
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setEditingId(restaurant.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">🍽️ グルメマップ</h1>
          <p className="text-gray-600 mt-2">飲食店の評価と位置情報を管理</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4">地図</h2>
            <Map restaurants={restaurants} />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">統計</h2>
            <div className="bg-white rounded-lg shadow p-4 space-y-3">
              <div className="border-b pb-3">
                <p className="text-gray-600">総店舗数</p>
                <p className="text-3xl font-bold">{restaurants.length}</p>
              </div>

              <div className="border-b pb-3">
                <p className="text-gray-600">A評価</p>
                <p className="text-2xl font-bold text-green-600">
                  {restaurants.filter(r => r.overallRating === 'A').length}
                </p>
              </div>

              <div className="border-b pb-3">
                <p className="text-gray-600">エリア数</p>
                <p className="text-2xl font-bold">
                  {new Set(restaurants.map(r => r.area)).size}
                </p>
              </div>

              <div>
                <p className="text-gray-600">料理種別</p>
                <p className="text-2xl font-bold">
                  {new Set(restaurants.map(r => r.cuisine)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <AddRestaurantForm onSubmit={handleAddRestaurant} loading={isAdding} />
        </div>

        <Dashboard restaurants={restaurants} onEdit={handleEditRestaurant} onDelete={handleDeleteRestaurant} />
      </main>
    </div>
  );
}
