import { useState } from 'react';
import { useStore } from '@/lib/store';
import { DIRECTIONS, CIOS } from '@/lib/data';
import type { Indicator } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Settings2 } from 'lucide-react';

export function Setup() {
  const { state, dispatch } = useStore();
  const [editInd, setEditInd] = useState<Indicator | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editDir, setEditDir] = useState<{ num: string, name: string, cioId: string } | null>(null);
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const openNew = () => {
    setIsNew(true);
    setEditInd({
      id: `i${Date.now()}`,
      num: `${state.indicators.length + 1}.1`,
      name: '',
      directionId: DIRECTIONS[0].id,
      cioId: CIOS[0].id,
      unit: '%',
      optimum: 'max',
      weight: 1,
      formula: '',
      level: 1,
      parentId: null,
    });
  };

  const openNewDir = () => {
    setEditDir({ num: '', name: '', cioId: CIOS[0].id });
  };

  const save = () => {
    if (!editInd || !editInd.name.trim()) return;
    dispatch({ type: isNew ? 'ADD_INDICATOR' : 'UPDATE_INDICATOR', indicator: editInd });
    setEditInd(null);
  };

  const saveDir = () => {
    // В рамках прототипа просто закрываем окно (DIRECTIONS сейчас хранятся в константах)
    setEditDir(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Настройка показателей</h2>
          <p className="text-sm text-muted-foreground">
            Перечень показателей, формулы и привязка к отраслевым ЦИО (по данным МЭФ). Отчётный период: {state.campaign.period}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openNewDir}><Plus className="h-4 w-4 mr-1" /> Добавить направление</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Добавить показатель</Button>
        </div>
      </div>

      <Tabs defaultValue="indicators">
        <TabsList>
          <TabsTrigger value="indicators"><Settings2 className="h-4 w-4 mr-1" /> Показатели и формулы</TabsTrigger>
        </TabsList>

        <TabsContent value="indicators">
          <div className="space-y-4">
            <IndToolbar
              filter={treeFilter}
              onChange={setTreeFilter}
              shown={visible.length}
              total={state.indicators.length}
            />
            {DIRECTIONS.map((d) => {
              const inds = visible.filter((i) => i.directionId === d.id);
              if (!inds.length) return null;
              return (
                <Card key={d.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{d.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left p-2 w-12">№</th>
                          <th className="text-left p-2">Показатель</th>
                          <th className="text-left p-2">Отраслевой ЦИО</th>
                          <th className="text-left p-2">Ед. изм.</th>
                          <th className="text-left p-2">Оптимум</th>
                          <th className="text-left p-2">Вес</th>
                          <th className="text-left p-2">Формула расчёта</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {inds.map((ind) => (
                          <tr key={ind.id} className={`border-b ${ind.isGroup ? 'bg-slate-50/80' : 'hover:bg-slate-50'}`}>
                            <td className="p-2 text-muted-foreground whitespace-nowrap">{ind.num}</td>
                            <td className={`p-2 ${ind.isGroup ? 'font-semibold text-slate-700' : 'font-medium'}`}>
                              <span className="flex items-center gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                                <TreeToggle
                                  hasChildren={parents.has(ind.id)}
                                  collapsed={!!collapsed[ind.id]}
                                  onToggle={() => toggleNode(ind.id)}
                                />
                                <span>
                                  {ind.isGroup && <span className="mr-1 text-slate-400">▸</span>}
                                  {ind.name}
                                </span>
                              </span>
                            </td>
                            <td className="p-2"><Badge variant="secondary">{CIOS.find((c) => c.id === ind.cioId)?.short}</Badge></td>
                            <td className="p-2">{ind.isGroup ? '—' : ind.unit}</td>
                            <td className="p-2">
                              {ind.isGroup ? <span className="text-muted-foreground">—</span> : (
                                <Badge variant="outline" className={ind.optimum === 'max' ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'}>
                                  {ind.optimum === 'max' ? '↑ max' : '↓ min'}
                                </Badge>
                              )}
                            </td>
                            <td className="p-2">{ind.isGroup ? '—' : ind.weight}</td>
                            <td className="p-2 text-xs text-muted-foreground font-mono">{ind.isGroup ? '—' : ind.formula}</td>
                            <td className="p-2">
                              <Button variant="ghost" size="icon" onClick={() => { setIsNew(false); setEditInd({ ...ind }); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

      </Tabs>

      <Dialog open={!!editInd} onOpenChange={(v) => !v && setEditInd(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Новый показатель' : 'Редактирование показателя'}</DialogTitle>
          </DialogHeader>
          {editInd && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>№</Label>
                <Input className="col-span-3" value={editInd.num} onChange={(e) => setEditInd({ ...editInd, num: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Название</Label>
                <Input className="col-span-3" value={editInd.name} onChange={(e) => setEditInd({ ...editInd, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Направление</Label>
                <Select value={editInd.directionId} onValueChange={(v) => setEditInd({ ...editInd, directionId: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>ЦИО</Label>
                <Select value={editInd.cioId} onValueChange={(v) => setEditInd({ ...editInd, cioId: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CIOS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Ед. изм.</Label>
                <Input className="col-span-3" value={editInd.unit} onChange={(e) => setEditInd({ ...editInd, unit: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Оптимум</Label>
                <Select value={editInd.optimum} onValueChange={(v) => setEditInd({ ...editInd, optimum: v as 'max' | 'min' })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="max">Максимум (больше — лучше)</SelectItem>
                    <SelectItem value="min">Минимум (меньше — лучше)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Вес</Label>
                <Input className="col-span-3" type="number" step="0.1" value={editInd.weight} onChange={(e) => setEditInd({ ...editInd, weight: Number(e.target.value) || 1 })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Формула</Label>
                <Input className="col-span-3 font-mono text-xs" value={editInd.formula} onChange={(e) => setEditInd({ ...editInd, formula: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInd(null)}>Отмена</Button>
            <Button onClick={save}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDir} onOpenChange={(v) => !v && setEditDir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новое направление</DialogTitle>
          </DialogHeader>
          {editDir && (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>№</Label>
                <Input className="col-span-3" value={editDir.num} onChange={(e) => setEditDir({ ...editDir, num: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>Название</Label>
                <Input className="col-span-3" value={editDir.name} onChange={(e) => setEditDir({ ...editDir, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label>ЦИО</Label>
                <Select value={editDir.cioId} onValueChange={(v) => setEditDir({ ...editDir, cioId: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CIOS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDir(null)}>Отмена</Button>
            <Button onClick={saveDir}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
