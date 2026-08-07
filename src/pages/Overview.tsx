import { useState } from 'react';
import { useStore } from '@/lib/store';
import { MUNICIPALITIES, DIRECTIONS, CIOS, CURRENT_OMSU, CURRENT_CIO } from '@/lib/data';
import { VALUE_FIELDS, type RoleId } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { ValueGroupHeader, fieldTint } from '@/components/ValueColumns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OmsuStatusBadge, CioStatusBadge } from '@/components/StatusBadge';
import { ValueTip } from '@/components/ValueTip';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';

const STAGES: { n: number; actor: string; text: string }[] = [
  { n: 1, actor: 'МЭФ', text: 'Передаёт перечень показателей и формулы расчёта рейтинга на отчётный период. Каждый показатель привязан к отраслевому ЦИО' },
  { n: 2, actor: 'Администратор КФ', text: 'Настраивает формы сбора и расчёт сводных форм для формирования рейтинга' },
  { n: 3, actor: 'Куратор МЭФ', text: 'Устанавливает дату запуска сбора данных и контрольные сроки этапов' },
  { n: 4, actor: 'КФ (автоматически)', text: 'В указанную дату рассылает уведомления о начале сбора и формы для заполнения' },
  { n: 5, actor: 'ОМСУ', text: 'Заполняют показатели, подписывают ЭЦП и отправляют на согласование отраслевому ЦИО. До согласования — возможен отзыв на изменение и повторная отправка' },
  { n: 6, actor: 'Отраслевой ЦИО', text: 'Согласовывает данные ОМСУ своей отрасли. После согласования изменение показателя ОМСУ блокируется' },
  { n: 7, actor: 'Отраслевой ЦИО', text: 'Вносит собственные показатели (отдельно от ОМСУ), подписывает ЭЦП' },
  { n: 8, actor: 'ЦИО → МЭФ', text: 'Подписанные данные ЦИО направляются на согласование в МЭФ. До согласования ЦИО может отозвать показатель и отправить повторно' },
  { n: 9, actor: 'КФ (автоматически)', text: 'После согласования всех данных рассчитывается итоговый сводный рейтинг' },
  { n: 10, actor: 'Куратор МЭФ', text: 'Формирует предварительный рейтинг по введённым (согласованным и несогласованным) данным в любой момент сбора' },
];

const CAMPAIGN_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Подготовка', cls: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Запланирован', cls: 'bg-blue-100 text-blue-700' },
  collecting: { label: 'Идёт сбор', cls: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Завершён', cls: 'bg-green-100 text-green-700' },
};

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
  const scopeInds = role === 'cio' ? state.indicators.filter((i) => i.cioId === CURRENT_CIO) : state.indicators;
  const scoped = role === 'omsu' || role === 'cio';

  // дерево показателей: сворачивание дочерних и фильтры
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const scopeVisible = visibleTree(scopeInds, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  // Статистика по области видимости (только заполняемые показатели, без групп)
  const scopeFill = scopeInds.filter((i) => !i.isGroup);
  let total = 0, approved = 0, pending = 0, returned = 0, draft = 0, empty = 0;
  scopeMuns.forEach((m) => {
    scopeFill.forEach((ind) => {
      const v = state.omsuValues[m.id]?.[ind.id];
      total += 1;
      if (!v || v.status === 'not_filled') empty += 1;
      else if (v.status === 'approved') approved += 1;
      else if (v.status === 'pending_cio') pending += 1;
      else if (v.status === 'returned') returned += 1;
      else draft += 1;
    });
  });
  const stats = { total, approved, pending, returned, draft, empty };
  const pct = total ? Math.round((approved / total) * 100) : 0;
  const camp = CAMPAIGN_BADGE[state.campaign.status];

  const progressLabel =
    role === 'omsu' ? 'Согласовано ваших показателей' :
    role === 'cio' ? 'Согласовано показателей вашей отрасли' :
    'Согласовано показателей ОМСУ';

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {state.campaign.name} — {state.campaign.period}
              </CardTitle>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${camp.cls}`}>{camp.label}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">Дата запуска</div>
                <div className="font-medium">{state.campaign.startDate?.split('-').reverse().join('.') ?? '—'}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">Срок ОМСУ</div>
                <div className="font-medium">{state.campaign.deadlineOmsu.split('-').reverse().join('.')}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">Срок ЦИО</div>
                <div className="font-medium">{state.campaign.deadlineCio.split('-').reverse().join('.')}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">Срок МЭФ</div>
                <div className="font-medium">{state.campaign.deadlineMef.split('-').reverse().join('.')}</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{progressLabel}: {stats.approved} из {stats.total}</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="text-green-700 border-green-300">Согласовано: {stats.approved}</Badge>
              <Badge variant="outline" className="text-amber-700 border-amber-300">На согласовании: {stats.pending}</Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-300">Черновики: {stats.draft}</Badge>
              <Badge variant="outline" className="text-red-700 border-red-300">Возвращено: {stats.returned}</Badge>
              <Badge variant="outline" className="text-gray-600">Не заполнено: {stats.empty}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{scoped ? 'Ваш участок сбора' : 'Участники сбора'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {role === 'omsu' && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">ОМСУ</span><span className="font-medium">{scopeMuns[0]?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Показатели к заполнению</span><span className="font-medium">{scopeFill.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Направления</span><span className="font-medium">{DIRECTIONS.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Согласующие ЦИО</span><span className="font-medium">{CIOS.length}</span></div>
              </>
            )}
            {role === 'cio' && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Отраслевой ЦИО</span><span className="font-medium">{CIOS.find((c) => c.id === CURRENT_CIO)?.short}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Показатели отрасли</span><span className="font-medium">{scopeFill.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ОМСУ на согласовании</span><span className="font-medium">{MUNICIPALITIES.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Срок согласования</span><span className="font-medium">{state.campaign.deadlineCio.split('-').reverse().join('.')}</span></div>
              </>
            )}
            {!scoped && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">ОМСУ</span><span className="font-medium">{MUNICIPALITIES.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Отраслевые ЦИО</span><span className="font-medium">{CIOS.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Направления</span><span className="font-medium">{DIRECTIONS.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Показатели ОМСУ</span><span className="font-medium">{state.indicators.filter((i) => !i.isGroup).length}</span></div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monitor">
        <TabsList>
          <TabsTrigger value="monitor">Мониторинг наполняемости</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="space-y-4">
          <IndToolbar
            filter={treeFilter}
            onChange={setTreeFilter}
            shown={scopeVisible.length}
            total={scopeInds.length}
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
                      Показателей: {inds.filter((i) => !i.isGroup).length}
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
                            <span className="text-muted-foreground">Согласовано: {apprCnt} из {indVals.length}</span>
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