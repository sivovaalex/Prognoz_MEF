import { useState } from 'react';
import { useStore } from '@/lib/store';
import { MUNICIPALITIES, DIRECTIONS, CIOS, CURRENT_OMSU, CURRENT_CIO } from '@/lib/data';
import { VALUE_FIELDS, type RoleId } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { ValueGroupHeader, fieldTint } from '@/components/ValueColumns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OmsuStatusBadge, CioStatusBadge } from '@/components/StatusBadge';
import { ValueTip } from '@/components/ValueTip';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';

export function Overview({ role }: { role: RoleId }) {
  const { state } = useStore();

  // Сворачивание мониторинга: сферы (по умолчанию развёрнуты) и показатели
  // (для МЭФ по умолчанию свёрнуты — объём данных большой)
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});
  const [openInds, setOpenInds] = useState<Record<string, boolean>>({});
  const dirOpen = (id: string) => openDirs[id] ?? true;
  const indOpen = (id: string) => openInds[id] ?? (role !== 'mef');
  const setAll = (open: boolean) => {
    const nd: Record<string, boolean> = {};
    DIRECTIONS.forEach((d) => { nd[d.id] = open; });
    setOpenDirs(nd);
    const ni: Record<string, boolean> = {};
    state.indicators.forEach((i) => { ni[i.id] = open; });
    setOpenInds(ni);
  };

  // Область видимости: ОМСУ — только своё ОМСУ; ЦИО — только показатели своей отрасли
  const scopeMuns = role === 'omsu' ? MUNICIPALITIES.filter((m) => m.id === CURRENT_OMSU) : MUNICIPALITIES;
  const scopeIndsRaw = role === 'cio' ? state.indicators.filter((i) => i.cioId === CURRENT_CIO) : state.indicators;

  // дерево показателей: сворачивание дочерних и фильтры
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const scopeInds = treeFilter.status && treeFilter.status !== 'all'
    ? scopeIndsRaw.filter(ind => {
        if (ind.isGroup) return true;
        return scopeMuns.some(m => {
          const v = state.omsuValues[m.id]?.[ind.id];
          const st = v ? v.status : 'not_filled';
          return st === treeFilter.status;
        });
      })
    : scopeIndsRaw;

  const scopeVisible = visibleTree(scopeInds, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));



  const scopeNote =
    role === 'omsu' ? 'Отображаются данные только вашего ОМСУ.' :
    role === 'cio' ? 'Отображаются данные только по показателям вашей отрасли.' :
    null;

  return (
    <div className="space-y-4">
      {scopeNote && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900 flex gap-2 items-center">
          <Info className="h-4 w-4 shrink-0" /> {scopeNote}
        </div>
      )}


      <Tabs defaultValue="monitor">
        <TabsList>
          <TabsTrigger value="monitor">Мониторинг наполняемости</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="space-y-4">
          <IndToolbar
            filter={treeFilter}
            onChange={setTreeFilter}
            shown={scopeVisible.length}
            total={scopeIndsRaw.length}
            showStatusFilter
          />
          <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900 flex gap-2 items-center">
            <Info className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              По каждому показателю отображаются курирующий ЦИО (с собственным значением) и все ОМСУ с введёнными данными и статусом согласования.
              Наведите курсор на значение, чтобы увидеть дату внесения и ФИО внёсшего данные.
            </span>
            <span className="flex shrink-0 gap-1">
              <button
                onClick={() => setAll(true)}
                className="rounded border border-blue-300 bg-white px-2 py-1 font-medium text-blue-800 hover:bg-blue-100"
              >
                Развернуть всё
              </button>
              <button
                onClick={() => setAll(false)}
                className="rounded border border-blue-300 bg-white px-2 py-1 font-medium text-blue-800 hover:bg-blue-100"
              >
                Свернуть всё
              </button>
            </span>
          </div>
          {DIRECTIONS.map((d) => {
            const inds = scopeVisible.filter((i) => i.directionId === d.id);
            if (!inds.length) return null;
            const dOpen = dirOpen(d.id);
            const fillInds = inds.filter((i) => !i.isGroup);
            let dirTotal = 0;
            let dirApproved = 0;
            scopeMuns.forEach(m => {
              fillInds.forEach(ind => {
                dirTotal++;
                if (state.omsuValues[m.id]?.[ind.id]?.status === 'approved') dirApproved++;
              });
            });
            const dirPct = dirTotal > 0 ? Math.round((dirApproved / dirTotal) * 100) : 0;

            return (
              <Card key={d.id}>
                <CardHeader className="py-3">
                  <button
                    onClick={() => setOpenDirs((p) => ({ ...p, [d.id]: !dOpen }))}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    {dOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                    <CardTitle className="text-base flex-1">{d.name}</CardTitle>
                    <span className="text-xs font-normal text-muted-foreground">
                      Показателей: {fillInds.length} <span className="ml-2 text-green-600">({dirPct}% согласовано)</span>
                    </span>
                  </button>
                </CardHeader>
                {dOpen && (
                <CardContent className="pt-0 space-y-4">
                  {inds.map((ind) => {
                    if (ind.isGroup) {
                      return (
                        <div
                          key={ind.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-slate-50/80 rounded-md border"
                          style={{ marginLeft: `${(ind.level - 1) * 20}px` }}
                        >
                          <TreeToggle
                            hasChildren={parents.has(ind.id)}
                            collapsed={!!collapsed[ind.id]}
                            onToggle={() => toggleNode(ind.id)}
                          />
                          <span>
                            <span className="mr-1 text-slate-400">▸</span>
                            {ind.num}. {ind.name}
                          </span>
                        </div>
                      );
                    }
                    const cio = CIOS.find((c) => c.id === ind.cioId);
                    const cioV = state.cioValues[ind.id]?.[ind.cioId];
                    const iOpen = indOpen(ind.id);
                    const indVals = scopeMuns
                      .map((m) => state.omsuValues[m.id]?.[ind.id])
                      .filter((v) => v && v.status !== 'not_filled');
                    const apprCnt = indVals.filter((v) => v!.status === 'approved').length;
                    const indPct = indVals.length > 0 ? Math.round((apprCnt / indVals.length) * 100) : 0;
                    return (
                      <div key={ind.id} className="rounded-md border" style={{ marginLeft: `${(ind.level - 1) * 20}px` }}>
                        <button
                          onClick={() => setOpenInds((p) => ({ ...p, [ind.id]: !iOpen }))}
                          className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left border-b bg-slate-50/70 hover:bg-slate-100/70"
                        >
                          <div className="font-medium text-sm flex items-center gap-2 min-w-0">
                            <TreeToggle
                              hasChildren={parents.has(ind.id)}
                              collapsed={!!collapsed[ind.id]}
                              onToggle={() => toggleNode(ind.id)}
                            />
                            {iOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                            <span className="truncate">
                              {ind.num}. {ind.name} <span className="font-normal text-muted-foreground">({ind.unit})</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Согласовано: {apprCnt} из {indVals.length} ({indPct}%)</span>
                            <span className="text-muted-foreground">Курирующий ЦИО:</span>
                            <Badge variant="secondary">{cio?.short}</Badge>
                            <span className="text-muted-foreground hidden md:inline">{cio?.name}</span>
                          </div>
                        </button>
                        {iOpen && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <ValueGroupHeader
                                leading={<th rowSpan={2} className="text-left p-2 align-middle min-w-[140px]">Участник</th>}
                                trailing={<th rowSpan={2} className="text-left p-2 align-middle border-l">Статус согласования</th>}
                              />
                            </thead>
                            <tbody>
                              {/* Курирующий ЦИО — собственное значение */}
                              <tr className="border-b bg-violet-50/40">
                                <td className="p-2">
                                  <div className="font-medium">{cio?.short} <span className="text-xs font-normal text-violet-700">(собственное значение ЦИО)</span></div>
                                </td>
                                {VALUE_FIELDS.map((f) => (
                                  <td key={f.key} className={`p-1.5 text-center ${f.key === 'v2026' ? 'font-medium' : ''}`}>
                                    <ValueTip value={cioV?.[f.key] ?? null} updatedAt={cioV?.updatedAt ?? null} author={cioV?.signedBy ?? 'Петров С.И.'} />
                                  </td>
                                ))}
                                <td className="p-2">{cioV && <CioStatusBadge status={cioV.status} />}</td>
                              </tr>
                              {/* ОМСУ */}
                              {scopeMuns.map((m) => {
                                const v = state.omsuValues[m.id]?.[ind.id];
                                const st = v ? v.status : 'not_filled';
                                if (treeFilter.status && treeFilter.status !== 'all' && st !== treeFilter.status) return null;
                                if (!v) return null;
                                return (
                                  <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-2">{m.name}</td>
                                    {VALUE_FIELDS.map((f) => (
                                      <td key={f.key} className={`p-1.5 text-center ${f.key === 'v2026' ? 'font-medium' : ''} ${fieldTint(f.key)}`}>
                                        <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Иванова А.П.'} />
                                      </td>
                                    ))}
                                    <td className="p-2"><OmsuStatusBadge status={v.status} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

      </Tabs>
    </div>
  );
}