import { useState } from 'react';
import { useStore } from '@/lib/store';

import type { Indicator } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Pencil } from 'lucide-react';

/**
 * Вкладка «Настройка рейтинга» (только Администратор) внутри блока «Рейтинг ОМСУ».
 * Настройка параметров рейтинга по каждому показателю: вес, оптимум,
 * закрытие от ввода, ЗАТО, закрытие для отдельных ОМСУ и исключения расчёта.
 */
export function RatingSetup() {
  const { state, dispatch } = useStore();
  const [editInd, setEditInd] = useState<Indicator | null>(null);

  const inds = state.indicators.filter((i) => !i.isGroup);
  const closedCount = inds.filter((i) => i.closed).length;
  const zatoCount = inds.filter((i) => i.zato).length;

  const update = (id: string, patch: Partial<Indicator>) => {
    const ind = state.indicators.find((i) => i.id === id);
    if (!ind) return;
    dispatch({ type: 'UPDATE_INDICATOR', indicator: { ...ind, ...patch } });
  };

  const openEdit = (ind: Indicator) => setEditInd({ ...ind });

  const saveEdit = () => {
    if (!editInd) return;
    const w = Number(editInd.weight);
    if (Number.isNaN(w) || w < 0 || w > 100) {
      alert('Вес должен быть числом от 0 до 100');
      return;
    }
    dispatch({ type: 'UPDATE_INDICATOR', indicator: editInd });
    setEditInd(null);
  };

  const thCls = 'p-2 text-xs font-medium text-left border-b bg-slate-50';
  const tdCls = 'p-2 text-sm border-b';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Настройка рейтинга</h2>
          <p className="text-sm text-muted-foreground">
            Параметры рейтинга по показателям: вес, оптимум, закрытие от ввода и исключения расчёта.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">Показателей: {inds.length}</Badge>
          <Badge variant="outline" className="text-amber-700 border-amber-300">Закрыто: {closedCount}</Badge>
          <Badge variant="outline" className="text-blue-700 border-blue-300">ЗАТО: {zatoCount}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thCls}>№</th>
                  <th className={`${thCls} min-w-[240px]`}>Показатель</th>
                  <th className={thCls}>Ед. изм.</th>
                  <th className={thCls}>Вес</th>
                  <th className={thCls}>Оптимум</th>
                  <th className={`${thCls} text-center`}>Закрыт</th>
                  <th className={`${thCls} text-center`}>ЗАТО</th>
                  <th className={`${thCls} text-center`}>Закрыт для ОМСУ</th>
                  <th className={thCls}>Исключение расчёта</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {inds.map((ind) => (
                  <tr key={ind.id} className="hover:bg-slate-50/60">
                    <td className={`${tdCls} text-muted-foreground whitespace-nowrap`}>{ind.num}</td>
                    <td className={`${tdCls} font-medium`}>{ind.name}</td>
                    <td className={`${tdCls} text-muted-foreground whitespace-nowrap`}>{ind.unit}</td>
                    <td className={tdCls}>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        className="h-8 w-20"
                        value={ind.weight ?? 0}
                        onChange={(e) => update(ind.id, { weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </td>
                    <td className={tdCls}>
                      <Select value={ind.optimum} onValueChange={(v: 'max' | 'min') => update(ind.id, { optimum: v })}>
                        <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="max">max</SelectItem>
                          <SelectItem value="min">min</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={!!ind.closed}
                        onChange={(e) => update(ind.id, { closed: e.target.checked })}
                      />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={!!ind.zato}
                        onChange={(e) => update(ind.id, { zato: e.target.checked })}
                      />
                    </td>
                    <td className={`${tdCls} text-center`}>
                      {(ind.closedForOmsuIds?.length ?? 0) > 0
                        ? <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => openEdit(ind)}>{ind.closedForOmsuIds!.length}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={tdCls}>
                      {ind.calcException?.trim()
                        ? <span className="text-xs" title={ind.calcException}>{ind.calcException.length > 28 ? `${ind.calcException.slice(0, 28)}…` : ind.calcException}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => openEdit(ind)} title="Настроить параметры рейтинга">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Вес, оптимум и флаги можно менять прямо в таблице. Для «Закрыт для ОМСУ» и «Исключение расчёта» используйте кнопку редактирования.
          </p>
        </CardContent>
      </Card>

      {/* Диалог: параметры рейтинга показателя */}
      <Dialog open={!!editInd} onOpenChange={(v) => !v && setEditInd(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Параметры рейтинга</DialogTitle>
          </DialogHeader>
          {editInd && (
            <div className="grid gap-3 text-sm">
              <p className="text-xs text-muted-foreground">{editInd.num} {editInd.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Вес (0–100)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={editInd.weight ?? 0}
                    onChange={(e) => setEditInd({ ...editInd, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Оптимум</Label>
                  <Select value={editInd.optimum} onValueChange={(v: 'max' | 'min') => setEditInd({ ...editInd, optimum: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="max">Максимум (max)</SelectItem>
                      <SelectItem value="min">Минимум (min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={!!editInd.closed}
                  onChange={(e) => setEditInd({ ...editInd, closed: e.target.checked })}
                />
                <Label className="font-normal">Закрыть показатель от ввода и согласования</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={!!editInd.zato}
                  onChange={(e) => setEditInd({ ...editInd, zato: e.target.checked })}
                />
                <Label className="font-normal">ЗАТО (показатель виден только ОМСУ с отметкой ЗАТО)</Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Закрыть для ОМСУ</Label>
                <select
                  multiple
                  className="w-full h-32 p-2 text-xs border rounded-md"
                  value={editInd.closedForOmsuIds || []}
                  onChange={(e) => setEditInd({ ...editInd, closedForOmsuIds: Array.from(e.target.selectedOptions).map(o => o.value) })}
                >
                  {state.omsus.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Зажмите Ctrl (Cmd) для выбора нескольких элементов. Выбранные ОМСУ не смогут вводить значения по данному показателю.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Исключения расчёта</Label>
                <Input
                  placeholder="Дополнительное правило присвоения баллов или мест"
                  value={editInd.calcException || ''}
                  onChange={(e) => setEditInd({ ...editInd, calcException: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInd(null)}>Отмена</Button>
            <Button onClick={saveEdit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


