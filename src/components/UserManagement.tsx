import { useEffect, useState } from 'react';
import { UserProfile, UserRole, listAllUsers, setUserRole, setUserManageCategories } from '../lib/auth';

interface UserManagementProps {
  currentUid: string;
}

const roleLabel: Record<UserRole, string> = {
  admin: '管理者',
  approved: '編集可',
  pending: '承認待ち',
};

const roleColor: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-orange-100 text-orange-800',
};

export function UserManagement({ currentUid }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const list = await listAllUsers();
    setUsers(list.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const handleSetRole = async (uid: string, role: UserRole) => {
    await setUserRole(uid, role);
    await reload();
  };

  const handleToggleManageCategories = async (uid: string, current: boolean) => {
    await setUserManageCategories(uid, !current);
    await reload();
  };

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }

  return (
    <ul className="space-y-2">
      {users.map(u => (
        <li key={u.uid} className="bg-gray-50 rounded-md px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{u.displayName}</span>
              <span className="text-sm text-gray-500 ml-2">{u.email}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${roleColor[u.role]}`}>
                {roleLabel[u.role]}
              </span>
            </div>

            {u.uid !== currentUid && u.role !== 'admin' && (
              <div className="flex gap-2">
                {u.role !== 'approved' && (
                  <button
                    onClick={() => handleSetRole(u.uid, 'approved')}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    承認する
                  </button>
                )}
                {u.role === 'approved' && (
                  <button
                    onClick={() => handleSetRole(u.uid, 'pending')}
                    className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    権限を外す
                  </button>
                )}
              </div>
            )}
          </div>

          {u.uid !== currentUid && u.role === 'approved' && (
            <label className="flex items-center gap-2 mt-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={!!u.permissions?.manageCategories}
                onChange={() => handleToggleManageCategories(u.uid, !!u.permissions?.manageCategories)}
              />
              エリア・料理種別カテゴリの管理を許可する
            </label>
          )}
        </li>
      ))}
    </ul>
  );
}
