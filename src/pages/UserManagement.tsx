import { useState } from 'react';
import { MOCK_USERS } from '@/lib/data';
import type { SysUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, LockOpen, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { UserModal } from '@/components/UserModal';

export function UserManagement() {
  const [users, setUsers] = useState<SysUser[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  
  const [editingUser, setEditingUser] = useState<SysUser | Partial<SysUser> | null>(null);

  const filteredUsers = users.filter(u => 
    (u.lastName?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.login?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const handleSave = (u: SysUser) => {
    if (users.find(x => x.id === u.id)) {
      setUsers(users.map(x => x.id === u.id ? u : x));
    } else {
      setUsers([...users, { ...u, id: Date.now().toString() }]);
    }
    setEditingUser(null);
  };

  const toggleLock = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isLocked: !u.isLocked } : u));
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="flex items-center gap-4 p-4 border-b">
            <Button variant="outline" size="sm" onClick={() => setUsers([...users])}>
              <RefreshCw className="h-4 w-4 mr-2" /> Обновить
            </Button>
            <Button size="sm" onClick={() => setEditingUser({ isLocked: false })}>
              <Plus className="h-4 w-4 mr-2" /> Добавить
            </Button>

            <div className="ml-auto relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Поиск..."
                className="pl-8 h-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="p-3 font-medium w-16 text-center">№</th>
                  <th className="p-3 font-medium w-32 text-center">Заблокирован</th>
                  <th className="p-3 font-medium">Логин</th>
                  <th className="p-3 font-medium">ФИО</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium w-24">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((u, i) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-400">{i + 1}</td>
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox" 
                        checked={u.isLocked} 
                        readOnly 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        onClick={() => toggleLock(u.id)}
                      />
                    </td>
                    <td className="p-3 font-medium text-slate-700">{u.login}</td>
                    <td className="p-3">{u.lastName} {u.firstName} {u.middleName || ''}</td>
                    <td className="p-3 text-blue-600">{u.email}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => setEditingUser(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 ${u.isLocked ? 'text-red-500 hover:text-red-600' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => toggleLock(u.id)}>
                          {u.isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Пользователи не найдены</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {editingUser && (
        <UserModal
          open={!!editingUser}
          onOpenChange={(v) => !v && setEditingUser(null)}
          user={editingUser}
          onSave={handleSave as any}
        />
      )}
    </div>
  );
}
