import { useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Restaurant } from '../types/restaurant';
import { MapCenter } from '../lib/appSettings';
import { PersonalSettings, savePersonalSettings } from '../lib/personalSettings';
import { AreaCategory, buildFilterGroups, sortByOrder } from '../lib/categories';
import { GOOGLE_MAPS_LIBRARIES } from '../lib/googleMapsLibraries';
import { UsernameEntry, setDefaultVisibleToUids } from '../lib/auth';
import { applyDefaultVisibilityToOwnRestaurants } from '../lib/db';

const containerStyle = {
  width: '100%',
  height: '500px',
};

const FALLBACK_CENTER: MapCenter = { lat: 35.7141, lng: 139.7774 }; // 上野

interface PersonalSettingsPageProps {
  restaurants: Restaurant[];
  categories: AreaCategory[];
  areaOrder: string[];
  settings: PersonalSettings;
  onSaved: (settings: PersonalSettings) => void;
  isSignedIn: boolean;
  canEdit: boolean;
  currentUid: string | null;
  users: UsernameEntry[];
  defaultVisibleToUids: string[];
  onVisibilityDefaultsSaved: (uids: string[]) => void;
}

export function PersonalSettingsPage({
  restaurants,
  categories,
  areaOrder,
  settings,
  onSaved,
  isSignedIn,
  canEdit,
  currentUid,
  users,
  defaultVisibleToUids,
  onVisibilityDefaultsSaved,
}: PersonalSettingsPageProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  // Local draft — nothing is persisted until "設定を保存" is clicked.
  const [draft, setDraft] = useState<PersonalSettings>(settings);
  const [picked, setPicked] = useState<MapCenter | null>(settings.defaultCenter);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  const initialMapCenter = useMemo(() => {
    if (settings.defaultCenter) return settings.defaultCenter;
    if (restaurants.length > 0) {
      return { lat: restaurants[0].latitude, lng: restaurants[0].longitude };
    }
    return FALLBACK_CENTER;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePick = (point: MapCenter) => {
    setPicked(point);
    setDraft(prev => ({ ...prev, defaultCenter: point }));
    setSaveState('idle');
    mapRef.current?.panTo(point);
  };

  const handleClearCenter = () => {
    setPicked(null);
    setDraft(prev => ({ ...prev, defaultCenter: null }));
    setSaveState('idle');
  };

  const allAreas = useMemo(
    () => sortByOrder(Array.from(new Set(restaurants.map(r => r.area))), areaOrder),
    [restaurants, areaOrder],
  );
  const filterGroups = useMemo(() => buildFilterGroups(allAreas, categories), [allAreas, categories]);
  const people = useMemo(
    () => Array.from(new Set(restaurants.map(r => r.addedBy).filter(Boolean))).sort(),
    [restaurants],
  );

  const updateDraft = (patch: Partial<PersonalSettings>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setSaveState('idle');
  };

  const handleSave = () => {
    savePersonalSettings(draft);
    onSaved(draft);
    setSaveState('saved');
  };

  // Account-wide default for who sees this person's private restaurants — saved to
  // Firestore (not localStorage, since it has to be enforced server-side and follow
  // the account across devices), separately from the rest of this page's settings.
  const otherUsers = useMemo(() => users.filter(u => u.uid !== currentUid), [users, currentUid]);
  const [visibilityDraft, setVisibilityDraft] = useState<string[]>(defaultVisibleToUids);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilitySaveState, setVisibilitySaveState] = useState<'idle' | 'saved'>('idle');

  const toggleVisibilityUser = (uid: string) => {
    setVisibilityDraft(prev => (prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]));
    setVisibilitySaveState('idle');
  };

  const handleSaveVisibilityDefaults = async () => {
    if (!currentUid) return;
    setVisibilitySaving(true);
    try {
      await setDefaultVisibleToUids(currentUid, visibilityDraft);
      await applyDefaultVisibilityToOwnRestaurants(currentUid, visibilityDraft);
      onVisibilityDefaultsSaved(visibilityDraft);
      setVisibilitySaveState('saved');
    } finally {
      setVisibilitySaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⚙️ 設定</h1>
            <p className="text-gray-600 mt-2">
              このブラウザだけの個人設定です。ログイン不要で、いつでも変更できます。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSignedIn && canEdit && (
              <a href="#/admin" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap text-sm">
                管理者設定
              </a>
            )}
            <a href="#/" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap">
              一覧に戻る
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-2">初期表示位置</h2>
          <p className="text-sm text-gray-600 mb-4">
            地図をクリックして、最初に表示したい場所を選んでください。クリックすると赤いピンが表示されます。
            {draft.defaultCenter ? (
              <span className="block mt-1 text-green-700">
                選択中: 緯度 {draft.defaultCenter.lat.toFixed(4)} / 経度 {draft.defaultCenter.lng.toFixed(4)}
              </span>
            ) : (
              <span className="block mt-1 text-gray-500">
                未設定のため、最初に登録した店舗の位置が使われます。
              </span>
            )}
          </p>

          {!isLoaded ? (
            <div>読み込み中...</div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={initialMapCenter}
              zoom={12}
              options={{ clickableIcons: false }}
              onLoad={map => {
                mapRef.current = map;
              }}
              onClick={e => {
                if (!e.latLng) return;
                handlePick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
              }}
            >
              {restaurants.map(restaurant => (
                <Marker
                  key={restaurant.id}
                  position={{ lat: restaurant.latitude, lng: restaurant.longitude }}
                  opacity={0.5}
                />
              ))}
              {picked && (
                <Marker
                  position={picked}
                  icon={{
                    url:
                      'data:image/svg+xml;charset=UTF-8,' +
                      encodeURIComponent(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path fill="#dc2626" stroke="white" stroke-width="1" d="M12 0C7.6 0 4 3.6 4 8c0 5.4 7 15.6 7.3 16a1 1 0 0 0 1.4 0C13 23.6 20 13.4 20 8c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="8" r="3.2" fill="white"/></svg>',
                      ),
                    scaledSize: new window.google.maps.Size(36, 36),
                    anchor: new window.google.maps.Point(18, 36),
                  }}
                />
              )}
            </GoogleMap>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={handleClearCenter}
              className="px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
            >
              リセット(最初の登録店舗に戻す)
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-2">絞り込みの初期設定</h2>
          <p className="text-sm text-gray-600 mb-4">
            アプリを開いたときに、一覧・地図を最初から絞り込んだ状態で表示できます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">初期エリア・カテゴリ</label>
              <select
                value={draft.defaultAreaFilter}
                onChange={e => updateDraft({ defaultAreaFilter: e.target.value })}
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
              <label className="block text-sm font-medium mb-2">追加者で絞り込み</label>
              <select
                value={draft.defaultPersonFilter}
                onChange={e => updateDraft({ defaultPersonFilter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">すべての追加者</option>
                {people.map(person => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.showAddedBy}
              onChange={e => updateDraft({ showAddedBy: e.target.checked })}
            />
            一覧に追加者の名前を表示する
          </label>
        </div>

        {isSignedIn && canEdit && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-2">非公開の店舗を見せる人</h2>
            <p className="text-sm text-gray-600 mb-4">
              店舗を「非公開」にしたとき、自分以外に見せたい人をここでまとめて選びます。店舗を追加・編集するたびに選び直す必要はありません。ここで保存すると、既に非公開にしている自分の店舗にもすぐ反映されます。
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {otherUsers.length === 0 && (
                <p className="text-xs text-gray-400">他に登録済みのユーザーがいません</p>
              )}
              {otherUsers.map(u => {
                const isSelected = visibilityDraft.includes(u.uid);
                return (
                  <button
                    type="button"
                    key={u.uid}
                    onClick={() => toggleVisibilityUser(u.uid)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      isSelected
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}
                    {u.displayName}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleSaveVisibilityDefaults}
              disabled={visibilitySaving}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium disabled:opacity-50"
            >
              {visibilitySaving ? '保存中...' : 'この設定を保存'}
            </button>
            {visibilitySaveState === 'saved' && (
              <div className="mt-3 px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                ✓ 保存しました(既存の非公開店舗にも反映しました)
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">設定を保存</h2>
              <p className="text-sm text-gray-600">このブラウザに保存されます。</p>
            </div>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
            >
              設定を保存
            </button>
          </div>
          {saveState === 'saved' && (
            <div className="mt-3 px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
              ✓ 設定を保存しました
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
