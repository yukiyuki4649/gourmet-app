import { useState } from 'react';
import { Restaurant, RestaurantHistoryEntry } from '../types/restaurant';
import { getRestaurantHistory } from '../lib/db';

interface HistoryPanelProps {
  restaurantId: string;
  onRevert: (snapshot: Partial<Restaurant>) => void;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toLocaleString('ja-JP');
  }
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('ja-JP');
}

export function HistoryPanel({ restaurantId, onRevert }: HistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<RestaurantHistoryEntry[]>([]);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      try {
        setEntries(await getRestaurantHistory(restaurantId));
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="mb-4">
      <button type="button" onClick={handleToggle} className="text-sm text-blue-600 hover:underline">
        {open ? '編集履歴を閉じる' : '編集履歴を見る'}
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-md p-3 max-h-56 overflow-y-auto">
          {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
          {!loading && entries.length === 0 && (
            <p className="text-sm text-gray-500">編集履歴はまだありません</p>
          )}
          <ul className="space-y-2">
            {entries.map(entry => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 text-sm bg-gray-50 rounded-md px-3 py-2"
              >
                <div>
                  <p className="font-medium">{formatDate(entry.editedAt)}</p>
                  <p className="text-gray-500">{entry.editedBy}さんが変更する直前の内容</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('この時点の内容をフォームに反映しますか?(保存するまで確定しません)')) {
                      onRevert(entry.snapshot);
                    }
                  }}
                  className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 whitespace-nowrap"
                >
                  この内容に戻す
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
