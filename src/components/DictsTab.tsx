import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Plus, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function DictsTab({ activeDict }: { activeDict: 'cios' | 'omsus' | 'units' }) {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const dictData = state[activeDict] || [];
  
  const filtered = dictData.filter((i: any) => 
    (i.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (i.short?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const toggleActive = (id: string) => {
    dispatch({ type: 'TOGGLE_DICT_ITEM', dict: activeDict, id });
  };

  const saveItem = () => {
    if (!editingItem) return;
    
    if (!editingItem.id) {
      const newItem = { ...editingItem, id: `new_${Date.now()}`, isActive: true };
      dispatch({ type: 'ADD_DICT_ITEM', dict: activeDict, item: newItem });
    } else {
      dispatch({ type: 'UPDATE_DICT_ITEM', dict: activeDict, item: editingItem });
    }
    setEditingItem(null);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm flex flex-col min-h-[500px]">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button size="sm" onClick={() => setEditingItem({})}>
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

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-slate-500">
                <th className="p-3 font-medium w-16 text-center">№</th>
                <th className="p-3 font-medium w-32 text-center">Активность</th>
                <th className="p-3 font-medium">Наименование</th>
                {activeDict === 'cios' && <th className="p-3 font-medium">Краткое наименование</th>}
                <th className="p-3 font-medium w-24 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item: any, i: number) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3 text-center text-slate-400">{i + 1}</td>
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => toggleActive(item.id)}
                      className={`inline-flex items-center justify-center p-1 rounded hover:bg-slate-200 ${item.isActive ? 'text-green-600' : 'text-red-500'}`}
                      title={item.isActive ? 'Дезактивировать' : 'Активировать'}
                    >
                      {item.isActive ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </button>
                  </td>
                  <td className="p-3 font-medium text-slate-700">{item.name}</td>
                  {activeDict === 'cios' && <td className="p-3 text-slate-600">{item.short}</td>}
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => setEditingItem(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Записи не найдены</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editingItem} onOpenChange={(v) => !v && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? 'Редактирование записи' : 'Новая запись'}</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Наименование *</Label>
                <Input 
                  value={editingItem.name || ''} 
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} 
                />
              </div>
              {activeDict === 'cios' && (
                <div>
                  <Label>Краткое наименование *</Label>
                  <Input 
                    value={editingItem.short || ''} 
                    onChange={e => setEditingItem({ ...editingItem, short: e.target.value })} 
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Отмена</Button>
            <Button onClick={saveItem} disabled={!editingItem?.name || (activeDict === 'cios' && !editingItem?.short)}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
