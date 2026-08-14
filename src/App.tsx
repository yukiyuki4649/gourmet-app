import { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Map } from './components/Map';
import { Dashboard } from './components/Dashboard';
import { AddRestaurantForm } from './components/AddRestaurantForm';
import { EditRestaurantModal } from './components/EditRestaurantModal';
import { PersonalSettingsPage } from './components/PersonalSettingsPage';
import { AdminSettingsPage } from './components/AdminSettingsPage';
import { AuthPanel } from './components/AuthPanel';
import { SecurityInfoPage } from './components/SecurityInfoPage';
import { SiteQRCode } from './components/SiteQRCode';
import { Restaurant, RestaurantInput } from './types/restaurant';
import {
  getAllRestaurants,
  getDeletedRestaurants,
  addRestaurant,
  deleteRestaurant,
  restoreRestaurant,
  updateRestaurant,
  bulkUpdateRestaurants,
  bulkUpdateRestaurantsIndividually,
} from './lib/db';
import { resolveFilterAreas, resolveFilterCuisines, sortByOrder } from './lib/categories';
import { applyRestaurantFilters, LunchFilter } from './lib/filters';
import { AppSettings, DEFAULT_APP_SETTINGS, loadAppSettings, saveAppSettings } from './lib/appSettings';
import { PersonalSettings, loadPersonalSettings, savePersonalSettings } from './lib/personalSettings';
import { onAuthChange, getUserProfile, listUsernames, UserProfile, UsernameEntry } from './lib/auth';
import { auth } from './lib/firebase';
import './index.css';

function getRouteFromHash(): 'home' | 'settings' | 'admin' | 'security' {
  if (window.location.hash === '#/admin') return 'admin';
  if (window.location.hash === '#/settings') return 'settings';
  if (window.location.hash === '#/security') return 'security';
  return 'home';
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromHash);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [lunchFilter, setLunchFilter] = useState<LunchFilter>('');

  // Per-browser settings, no login required — loaded synchronously from localStorage.
  const [personalSettings, setPersonalSettings] = useState<PersonalSettings>(() => loadPersonalSettings());
  const [areaFilter, setAreaFilter] = useState(() => loadPersonalSettings().defaultAreaFilter);

  // Shared, admin-managed settings (area/cuisine categories) — loaded from Firestore.
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [sharedSettingsLoading, setSharedSettingsLoading] = useState(true);
  const firstSharedSettingsLoad = useRef(true);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async user => {
      setAuthUser(user);
      if (user) {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    // Read auth.currentUser directly (not the authUser state) since this can be called
    // from a stale closure right after signup, before a re-render lands the fresh state.
    const uid = auth.currentUser?.uid;
    if (uid) {
      const p = await getUserProfile(uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Loads shared (category) settings on first mount, and again every time the user returns
  // to the home route (so edits made on the admin settings page take effect without a reload).
  useEffect(() => {
    if (route !== 'home') return;
    (async () => {
      const s = await loadAppSettings();
      setAppSettings(s);
      firstSharedSettingsLoad.current = false;
      setSharedSettingsLoading(false);
    })();
  }, [route]);

  const canEdit = profile?.role === 'admin' || profile?.role === 'approved';
  const isAdmin = profile?.role === 'admin';
  const canManageCategories = isAdmin || profile?.permissions?.manageCategories === true;

  // Name+uid only (no email/role) — safe to fetch for any canEdit user, since it's just
  // used to populate the "who can see this private restaurant" picker.
  const [allUsers, setAllUsers] = useState<UsernameEntry[]>([]);
  useEffect(() => {
    if (canEdit) {
      listUsernames().then(setAllUsers).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  // Soft-deleted restaurants, visible only to admins so they can review/restore them.
  const [deletedRestaurants, setDeletedRestaurants] = useState<Restaurant[]>([]);
  const reloadDeletedRestaurants = async () => {
    if (!isAdmin) {
      setDeletedRestaurants([]);
      return;
    }
    try {
      const data = await getDeletedRestaurants(authUser?.uid ?? null, isAdmin);
      setDeletedRestaurants(data);
    } catch (error) {
      console.error('Failed to load deleted restaurants:', error);
    }
  };
  useEffect(() => {
    reloadDeletedRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, authUser?.uid]);

  const firstRestaurantsLoad = useRef(true);

  // Re-runs whenever the signed-in user (or their role) changes, since which
  // restaurants are visible depends on both — see getAllRestaurants in db.ts.
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (firstRestaurantsLoad.current) {
        setRestaurantsLoading(true);
      }
      try {
        const data = await getAllRestaurants(authUser?.uid ?? null, isAdmin);
        setRestaurants(data);
      } catch (error) {
        console.error('Failed to load restaurants:', error);
        alert('飲食店データの読み込みに失敗しました');
      } finally {
        setRestaurantsLoading(false);
        firstRestaurantsLoad.current = false;
      }
    })();
  }, [authUser?.uid, isAdmin, authLoading]);

  const effectiveAreas = useMemo(
    () => resolveFilterAreas(areaFilter, appSettings.categories),
    [areaFilter, appSettings.categories],
  );
  const effectiveCuisines = useMemo(
    () => resolveFilterCuisines(cuisineFilter, appSettings.cuisineCategories),
    [cuisineFilter, appSettings.cuisineCategories],
  );

  const mapRestaurants = useMemo(
    () =>
      applyRestaurantFilters(restaurants, {
        effectiveAreas,
        effectiveCuisines,
        person: personalSettings.defaultPersonFilter,
        lunch: lunchFilter,
      }),
    [restaurants, effectiveAreas, effectiveCuisines, personalSettings.defaultPersonFilter, lunchFilter],
  );

  const isFiltered =
    effectiveAreas !== null ||
    effectiveCuisines !== null ||
    personalSettings.defaultPersonFilter !== '' ||
    lunchFilter !== '';

  const cuisineOptions = useMemo(
    () => sortByOrder(Array.from(new Set(restaurants.flatMap(r => r.cuisines))), appSettings.cuisineOrder),
    [restaurants, appSettings.cuisineOrder],
  );
  const areaOptions = useMemo(
    () => sortByOrder(Array.from(new Set(restaurants.map(r => r.area))), appSettings.areaOrder),
    [restaurants, appSettings.areaOrder],
  );

  const reloadRestaurants = async () => {
    try {
      const data = await getAllRestaurants(authUser?.uid ?? null, isAdmin);
      setRestaurants(data);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
      alert('飲食店データの読み込みに失敗しました');
    }
  };

  const handleAddRestaurant = async (data: RestaurantInput & { latitude: number; longitude: number }) => {
    try {
      setIsAdding(true);
      await addRestaurant(data);
      await reloadRestaurants();
    } catch (error) {
      console.error('Failed to add restaurant:', error);
      alert('飲食店の追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!window.confirm('この飲食店を削除しますか?(非表示になるだけで、管理者は後から復元できます)')) return;

    try {
      await deleteRestaurant(id);
      await reloadRestaurants();
      await reloadDeletedRestaurants();
    } catch (error) {
      console.error('Failed to delete restaurant:', error);
      alert('飲食店の削除に失敗しました');
    }
  };

  const handleRestoreRestaurant = async (id: string) => {
    try {
      await restoreRestaurant(id);
      await reloadRestaurants();
      await reloadDeletedRestaurants();
    } catch (error) {
      console.error('Failed to restore restaurant:', error);
      alert('復元に失敗しました');
    }
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setEditingId(restaurant.id);
  };

  const handleUpdateRestaurant = async (id: string, data: Partial<Restaurant>) => {
    try {
      setIsUpdating(true);
      await updateRestaurant(id, data, profile?.displayName ?? '不明');
      await reloadRestaurants();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update restaurant:', error);
      alert('飲食店の更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdate = async (ids: string[], patch: Partial<Restaurant>) => {
    try {
      await bulkUpdateRestaurants(ids, patch);
      await reloadRestaurants();
    } catch (error) {
      console.error('Failed to bulk update restaurants:', error);
      alert('一括編集に失敗しました');
    }
  };

  // Renaming an area/cuisine writes directly to restaurant docs by id (allowed to any
  // canEdit user, per the Firestore write rule), then best-effort patches the shared
  // category groupings that reference the old name — that second step needs
  // canManageCategories, so it's silently skipped for users who only have canEdit
  // (the area rename itself still succeeds for them).
  //
  // Deliberately NOT a fresh Firestore query (e.g. where('area','==',oldName)) — an
  // unfiltered-by-visibility list query like that gets rejected outright by the
  // security rules for the same reason getAllRestaurants had to be split into
  // per-visibility queries (see the comment on getAllRestaurants in db.ts). Instead
  // this reuses the `restaurants` state already loaded here, which is already
  // properly visibility-scoped for the current viewer, and writes by direct doc id.
  const handleRenameArea = async (oldName: string, newName: string) => {
    const ids = restaurants.filter(r => r.area === oldName).map(r => r.id);
    if (ids.length > 0) {
      await bulkUpdateRestaurants(ids, { area: newName });
    }
    if (canManageCategories) {
      const nextCategories = appSettings.categories.map(c => ({
        ...c,
        areas: c.areas.map(a => (a === oldName ? newName : a)),
      }));
      const nextSettings = { ...appSettings, categories: nextCategories };
      await saveAppSettings(nextSettings);
      setAppSettings(nextSettings);
    }
    await reloadRestaurants();
  };

  const handleRenameCuisine = async (oldName: string, newName: string) => {
    // Each restaurant's `cuisines` array is different, so unlike area (a single value,
    // safe to overwrite with one shared patch) this needs a per-restaurant patch: replace
    // oldName in place within that restaurant's own array, deduping in case newName was
    // already present too (merging into an existing name).
    const affected = restaurants.filter(r => r.cuisines.includes(oldName));
    if (affected.length > 0) {
      const updates = affected.map(r => ({
        id: r.id,
        data: { cuisines: Array.from(new Set(r.cuisines.map(c => (c === oldName ? newName : c)))) },
      }));
      await bulkUpdateRestaurantsIndividually(updates);
    }
    if (canManageCategories) {
      const nextCuisineCategories = appSettings.cuisineCategories.map(c => ({
        ...c,
        cuisines: c.cuisines.map(cu => (cu === oldName ? newName : cu)),
      }));
      const nextSettings = { ...appSettings, cuisineCategories: nextCuisineCategories };
      await saveAppSettings(nextSettings);
      setAppSettings(nextSettings);
    }
    await reloadRestaurants();
  };

  const handleClearPersonFilter = () => {
    const next = { ...personalSettings, defaultPersonFilter: '' };
    savePersonalSettings(next);
    setPersonalSettings(next);
  };

  const editingRestaurant = restaurants.find(r => r.id === editingId) ?? null;

  if (restaurantsLoading || sharedSettingsLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">読み込み中...</p>
      </div>
    );
  }

  if (route === 'settings') {
    return (
      <PersonalSettingsPage
        restaurants={restaurants}
        categories={appSettings.categories}
        areaOrder={appSettings.areaOrder}
        settings={personalSettings}
        onSaved={setPersonalSettings}
        isSignedIn={!!authUser}
        canEdit={canEdit}
      />
    );
  }

  if (route === 'security') {
    return <SecurityInfoPage />;
  }

  if (route === 'admin') {
    return (
      <AdminSettingsPage
        restaurants={restaurants}
        settings={appSettings}
        onSaved={setAppSettings}
        canManageCategories={canManageCategories}
        canEdit={canEdit}
        isAdmin={isAdmin}
        isSignedIn={!!authUser}
        currentUid={authUser?.uid ?? null}
        onRenameArea={handleRenameArea}
        onRenameCuisine={handleRenameCuisine}
        deletedRestaurants={deletedRestaurants}
        onRestoreRestaurant={handleRestoreRestaurant}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-3xl font-bold text-gray-900 whitespace-nowrap">🍽️ 勝手にグルメマップ</h1>
            <p className="text-xs text-gray-500 mt-2">
              管理者を含む、お酒好きな数人が勝手に評価しているグルメメモです。味の好みは人それぞれなので、あくまで参考程度にご覧ください。
            </p>
          </div>
          <a
            href="#/settings"
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap shrink-0"
          >
            ⚙️ 設定
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">地図</h2>
          <Map
            restaurants={mapRestaurants}
            selectedId={selectedId}
            onSelectRestaurant={setSelectedId}
            isFiltered={isFiltered}
            defaultCenter={personalSettings.defaultCenter}
          />
        </div>

        <div className="mb-8">
          <Dashboard
            restaurants={restaurants}
            onEdit={handleEditRestaurant}
            onDelete={handleDeleteRestaurant}
            onSelectRestaurant={setSelectedId}
            selectedId={selectedId}
            categories={appSettings.categories}
            cuisineCategories={appSettings.cuisineCategories}
            areaOrder={appSettings.areaOrder}
            cuisineOrder={appSettings.cuisineOrder}
            areaFilter={areaFilter}
            onAreaFilterChange={setAreaFilter}
            cuisineFilter={cuisineFilter}
            onCuisineFilterChange={setCuisineFilter}
            lunchFilter={lunchFilter}
            onLunchFilterChange={setLunchFilter}
            personFilter={personalSettings.defaultPersonFilter}
            onClearPersonFilter={handleClearPersonFilter}
            showAddedBy={personalSettings.showAddedBy}
            canEdit={canEdit}
            onBulkUpdate={handleBulkUpdate}
          />
        </div>

        {canEdit ? (
          <AddRestaurantForm
            onSubmit={handleAddRestaurant}
            loading={isAdding}
            cuisineOptions={cuisineOptions}
            areaOptions={areaOptions}
            categories={appSettings.categories}
            cuisineCategories={appSettings.cuisineCategories}
            addedByName={profile?.displayName ?? ''}
            addedByUid={authUser?.uid ?? ''}
            defaultCenter={personalSettings.defaultCenter}
            users={allUsers}
            allRestaurants={restaurants}
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            {authUser
              ? '管理者の承認を受けると店舗を追加できるようになります'
              : 'ログインすると店舗を追加できます'}
          </div>
        )}

        <div className="mt-8 flex items-center justify-end gap-3">
          <a href="#/security" className="text-sm text-gray-500 hover:underline whitespace-nowrap">
            🔒 このサイトのセキュリティについて
          </a>
          <AuthPanel user={authUser} profile={profile} onProfileChange={refreshProfile} />
        </div>

        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">統計</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600">総店舗数</p>
              <p className="text-3xl font-bold">{restaurants.length}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600">A評価</p>
              <p className="text-3xl font-bold text-green-600">
                {restaurants.filter(r => r.overallRating === 'A').length}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600">エリア数</p>
              <p className="text-3xl font-bold">
                {new Set(restaurants.map(r => r.area)).size}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-600">料理種別</p>
              <p className="text-3xl font-bold">
                {new Set(restaurants.flatMap(r => r.cuisines)).size}
              </p>
            </div>
          </div>
        </div>

        <SiteQRCode />
      </main>

      {editingRestaurant && canEdit && (
        <EditRestaurantModal
          restaurant={editingRestaurant}
          onSave={handleUpdateRestaurant}
          onClose={() => setEditingId(null)}
          loading={isUpdating}
          defaultCenter={personalSettings.defaultCenter}
          users={allUsers}
          currentUid={authUser?.uid ?? null}
          allRestaurants={restaurants}
          cuisineOptions={cuisineOptions}
          areaOptions={areaOptions}
          categories={appSettings.categories}
          cuisineCategories={appSettings.cuisineCategories}
        />
      )}
    </div>
  );
}
