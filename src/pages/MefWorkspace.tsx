import { useState, useEffect, Fragment } from 'react';
import { useStore } from '@/lib/store';
import { VALUE_FIELDS, VALUE_GROUPS } from '@/lib/types';
import { EMPTY_TREE_FILTER, chevronParents, visibleTree, type TreeFilter } from '@/lib/indTree';
import { IndToolbar, TreeToggle } from '@/components/IndToolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Undo2, CheckCircle2, Info, Lock, Send, PlayCircle, StopCircle, Sparkles } from 'lucide-react';
import { fieldTint } from '@/components/ValueColumns';
import { CioStatusBadge } from '@/components/StatusBadge';
import { ValueTip } from '@/components/ValueTip';
import { Input } from '@/components/ui/input';

const GROUP_HEAD: Record<string, string> = {
  report: 'bg-green-50/70',
  estimate: 'bg-amber-50/70',
  y2027: 'bg-blue-50/70',
  y2028: 'bg-blue-50/70',
  y2029: 'bg-blue-50/70',
};

export function MefWorkspace({ block = 'mun' }: { block?: string }) {
  const isNewLogic = block === 'mun' || block === 'rating_main' || block === 'ukaz_main';
  return isNewLogic ? <MefWorkspaceNew block={block} /> : <MefWorkspaceOld block={block} />;
}

function MefWorkspaceNew({ block = 'mun' }: { block?: string }) {
  const { state, dispatch } = useStore();
  const isPrecollect = state.campaign.status === 'precollecting';
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showOmsu, setShowOmsu] = useState(isPrecollect);

  useEffect(() => {
    if (isPrecollect) setShowOmsu(true);
  }, [isPrecollect]);

  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const fillable = state.indicators.filter((i) => !i.isGroup);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Рабочее место МЭФ — Согласование прогноза</h2>
            {isPrecollect ? (
              <Badge className="bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-purple-600 animate-spin" /> Режим «Предсбор МЭФ» активен
              </Badge>
            ) : state.campaign.status === 'collecting' ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">Сбор данных запущен</Badge>
            ) : (
              <Badge variant="outline">Сбор не запущен</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Куратор МЭФ / Администратор: ввод значений в столбцы ОМСУ и ЦИО с автосогласованием и блокировкой ячеек.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isPrecollect && state.campaign.status !== 'collecting' && (
            <Button
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50 font-medium"
              onClick={() => dispatch({ type: 'CAMPAIGN_PRECOLLECT_LAUNCH' })}
              title="Запустить режим предсбора МЭФ для предварительного ввода значений ОМСУ и ЦИО"
            >
              <PlayCircle className="h-4 w-4 mr-1 text-purple-600" /> Включить предсбор МЭФ
            </Button>
          )}
          {isPrecollect && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => dispatch({ type: 'CAMPAIGN_PRECOLLECT_STOP' })}
              title="Завершить режим предсбора МЭФ"
            >
              <StopCircle className="h-4 w-4 mr-1" /> Завершить предсбор
            </Button>
          )}
        </div>
      </div>

      {isPrecollect && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900 flex items-start gap-2 shadow-sm">
          <Info className="h-4 w-4 text-purple-700 mt-0.5 shrink-0" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold text-purple-950 block">Активен функционал «Предсбор МЭФ»:</span>
            <span>
              Вы можете вводить значения непосредственно в столбцы <b>ОМСУ</b> и <b>ЦИО</b>. При вводе значения автоматически согласуются и блокируются от изменения в рабочих местах ОМСУ и ЦИО (со значком замочка <Lock className="inline h-3 w-3 text-amber-600" />). При необходимости МЭФ может вернуть право редактирования по кнопке <b>«Вернуть»</b>.
            </span>
          </div>
        </div>
      )}

      <MefTerritoryIndicators
        block={block}
        visible={visible}
        fillable={fillable}
        collapsed={collapsed}
        toggleNode={toggleNode}
        parents={parents}
        treeFilter={treeFilter}
        setTreeFilter={setTreeFilter}
        showOmsu={showOmsu}
        setShowOmsu={setShowOmsu}
        isPrecollect={isPrecollect}
      />
    </div>
  );
}

function MefTerritoryIndicators({ block = 'mun', visible, fillable, collapsed, toggleNode, parents, treeFilter, setTreeFilter, showOmsu, setShowOmsu }: any) {
  const { state, dispatch } = useStore();
  const [returnTarget, setReturnTarget] = useState<{ cioId: string; indId: string; munId: string } | null>(null);
  const [comment, setComment] = useState('');
  
  const [munFilter, setMunFilter] = useState<string>('all');
  let activeOmsus = state.omsus.filter((m) => m.isActive);
  if (munFilter !== 'all') {
    activeOmsus = activeOmsus.filter(o => o.id === munFilter);
  }

  const approvers = state.blockSettings[block]?.approvers || ['omsu', 'cio', 'mef'];
  const hasNote = state.blockSettings[block]?.hasNote || false;
  const noteColsCount = (showOmsu && approvers.includes('omsu') ? 1 : 0) + (approvers.includes('cio') ? 1 : 0) + (approvers.includes('mef') ? 1 : 0);

  return (
    <>
      <IndToolbar filter={treeFilter} onChange={setTreeFilter} shown={visible.length} total={fillable.length} hideCioFilter munId={munFilter} onMunChange={setMunFilter} />
      <div className="flex items-center gap-2 mt-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showOmsu} onChange={(e) => setShowOmsu(e.target.checked)} />
          Показать данные ОМСУ
        </label>
      </div>
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2 mt-4">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>МЭФ проверяет значения территорий, внесённые ЦИО. Вы можете согласовать данные или внести собственные.</span>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th rowSpan={3} className="text-left p-2 align-middle min-w-[220px]">Территория / Показатель</th>
                {VALUE_GROUPS.map((g) => (
                  <th key={g.key} colSpan={g.span * (showOmsu ? 3 : 2)} className={`text-center p-1.5 border-l border-b ${GROUP_HEAD[g._bg]}`}>
                    {g.label}
                  </th>
                ))}
                {hasNote && noteColsCount > 0 && (
                  <th rowSpan={2} colSpan={noteColsCount} className="text-center p-1.5 border-l border-b bg-amber-50/70 font-semibold text-slate-800">
                    Примечание
                  </th>
                )}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <th key={f.key} colSpan={showOmsu ? 3 : 2} className={`text-center p-1.5 border-l border-b ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>
                    {f.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <Fragment key={f.key}>
                    {showOmsu && <th className={`text-center p-1.5 font-medium border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>ОМСУ</th>}
                    <th className={`text-center p-1.5 font-medium ${!showOmsu ? 'border-l' : ''} ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>ЦИО</th>
                    <th className={`text-center p-1.5 font-medium ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>МЭФ</th>
                  </Fragment>
                ))}
                {hasNote && noteColsCount > 0 && (
                  <>
                    {showOmsu && approvers.includes('omsu') && <th className="text-center p-1.5 font-medium border-l bg-amber-50/50 min-w-[180px]">ОМСУ</th>}
                    {approvers.includes('cio') && <th className={`text-center p-1.5 font-medium ${!showOmsu || !approvers.includes('omsu') ? 'border-l' : ''} bg-amber-50/50 min-w-[180px]`}>ЦИО</th>}
                    {approvers.includes('mef') && <th className="text-center p-1.5 font-medium border-l bg-amber-50/50 min-w-[180px]">МЭФ</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((ind: any) => (
                <Fragment key={ind.id}>
                  <tr className="border-b bg-slate-100">
                    <td colSpan={1 + VALUE_FIELDS.length * (showOmsu ? 3 : 2) + (hasNote ? noteColsCount : 0)} className="p-2 font-medium">
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${(ind.level - 1) * 16}px` }}>
                        <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                        <span>{ind.num} {ind.name} <span className="font-normal text-muted-foreground text-xs ml-2">({ind.unit})</span></span>
                      </div>
                    </td>
                  </tr>
                  {!collapsed[ind.id] && activeOmsus.map((omsu) => {
                    const cioId = ind.cioId;
                    const v = state.cioTerritoryValues[cioId]?.[ind.id]?.[omsu.id];
                    if (!v && !showOmsu) return null; 
                    const safeV = v || { v2023: null, v2024: null, v2025: null, v2026: null, cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null, status: 'not_filled', updatedAt: null };
                    
                    const mefV = state.mefTerritoryValues[cioId]?.[ind.id]?.[omsu.id] || { v2023: null, v2024: null, v2025: null, v2026: null, cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null, status: 'not_filled', updatedAt: null };
                    const omsuVal = state.omsuValues[omsu.id]?.[ind.id];
                    return (
                      <tr key={omsu.id} className={`border-b ${safeV.status === 'pending_mef' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                        <td className="p-2 font-medium pl-6">{omsu.name}</td>
                        {VALUE_FIELDS.map((f) => {
                          const isOmsuLocked = !!omsuVal?.lockedFields?.[f.key] || (!!omsuVal?.lockedByMef && (f.key === 'v2026' || f.key === 'v2025' || f.key.startsWith('cons') || f.key.startsWith('base')));
                          const isCioLocked = !!safeV?.lockedFields?.[f.key] || (!!safeV?.lockedByMef && (f.key === 'v2026' || f.key === 'v2025' || f.key.startsWith('cons') || f.key.startsWith('base')));

                          return (
                            <Fragment key={f.key}>
                              {showOmsu && (
                                <td className={`p-1.5 text-center border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                  <div className="flex flex-col items-center gap-1">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      className={`h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium ${isOmsuLocked ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-bold ring-1 ring-amber-400' : 'border-amber-300'}`}
                                      placeholder="—"
                                      value={omsuVal?.[f.key] ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? null : Number(e.target.value);
                                        dispatch({
                                          type: 'MEF_SET_OMSU_VALUE',
                                          munId: omsu.id,
                                          indId: ind.id,
                                          field: f.key,
                                          value: val,
                                        });
                                      }}
                                      title={isOmsuLocked ? 'Значение введено МЭФ (заблокировано для ОМСУ)' : 'Ввод значения ОМСУ куратором МЭФ с автосогласованием'}
                                    />
                                    {isOmsuLocked ? (
                                      <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                        <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-0.5 bg-amber-100/70 px-1 rounded whitespace-nowrap">
                                          <Lock className="w-3 h-3 text-amber-700" /> Введено МЭФ
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-5 text-[9px] px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                          onClick={() => dispatch({ type: 'MEF_UNLOCK_OMSU_VALUE', munId: omsu.id, indId: ind.id, field: f.key })}
                                          title="Снять блокировку МЭФ и вернуть право редактирования ОМСУ"
                                        >
                                          <Undo2 className="h-3 w-3 mr-0.5" /> Вернуть ОМСУ
                                        </Button>
                                      </div>
                                    ) : (
                                      omsuVal && omsuVal[f.key] != null && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-5 text-[9px] px-1.5 mt-0.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                                          onClick={() => dispatch({ type: 'MEF_SET_OMSU_VALUE', munId: omsu.id, indId: ind.id, field: f.key, value: omsuVal[f.key] })}
                                          title="Автосогласовать и заблокировать для ОМСУ"
                                        >
                                          <Lock className="h-3 w-3 mr-0.5" /> Заблокировать
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className={`p-1.5 text-center ${!showOmsu ? 'border-l' : ''} ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    className={`h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium ${isCioLocked ? 'border-blue-500 bg-blue-50/50 text-blue-950 font-bold ring-1 ring-blue-400' : 'border-blue-300'}`}
                                    placeholder="—"
                                    value={safeV[f.key] ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : Number(e.target.value);
                                      dispatch({
                                        type: 'MEF_SET_CIO_TERR_VALUE',
                                        cioId,
                                        indId: ind.id,
                                        munId: omsu.id,
                                        field: f.key,
                                        value: val,
                                      });
                                    }}
                                    title={isCioLocked ? 'Значение введено МЭФ (заблокировано для ЦИО)' : 'Ввод значения ЦИО куратором МЭФ с автосогласованием'}
                                  />
                                  {isCioLocked ? (
                                    <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                      <span className="text-[10px] text-blue-800 font-semibold flex items-center gap-0.5 bg-blue-100/70 px-1 rounded whitespace-nowrap">
                                        <Lock className="w-3 h-3 text-blue-700" /> Введено МЭФ
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-5 text-[9px] px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        onClick={() => dispatch({ type: 'MEF_UNLOCK_CIO_TERR_VALUE', cioId, indId: ind.id, munId: omsu.id, field: f.key })}
                                        title="Снять блокировку МЭФ и вернуть право редактирования ЦИО"
                                      >
                                        <Undo2 className="h-3 w-3 mr-0.5" /> Вернуть ЦИО
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1">
                                      <CioStatusBadge status={safeV.status} />
                                      {safeV.status === 'pending_mef' && (
                                        <div className="flex gap-1 mt-0.5">
                                          <Button size="icon-sm" variant="outline" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => dispatch({ type: 'MEF_TERR_APPROVE', indId: ind.id, cioId, munId: omsu.id, actor: 'МЭФ' })} title="Согласовать">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button size="icon-sm" variant="outline" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { setReturnTarget({ cioId, indId: ind.id, munId: omsu.id }); setComment(''); }} title="Вернуть">
                                            <Undo2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      )}
                                      {safeV.status === 'approved' && (
                                        <div className="flex gap-1 mt-0.5">
                                          <Button size="icon-sm" variant="outline" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { setReturnTarget({ cioId, indId: ind.id, munId: omsu.id }); setComment(''); }} title="Вернуть">
                                            <Undo2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      )}
                                      {safeV.status !== 'approved' && safeV[f.key] != null && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-5 text-[9px] px-1.5 mt-0.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                                          onClick={() => dispatch({ type: 'MEF_SET_CIO_TERR_VALUE', cioId, indId: ind.id, munId: omsu.id, field: f.key, value: safeV[f.key] })}
                                          title="Автосогласовать и заблокировать для ЦИО"
                                        >
                                          <Lock className="h-3 w-3 mr-0.5" /> Заблокировать
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            <td className={`p-1.5 text-center ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                              {(f.key === 'v2026' || f.key === 'v2025') ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    className="h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium border-amber-300"
                                    placeholder="—"
                                    value={mefV[f.key] ?? ''}
                                    disabled={safeV.status === 'approved'}
                                    onChange={(e) => dispatch({ type: 'MEF_TERR_SET_VALUE', indId: ind.id, cioId, munId: omsu.id, field: f.key, value: e.target.value === '' ? null : Number(e.target.value) })}
                                  />
                                  {safeV.status !== 'approved' && mefV[f.key] !== null && mefV.status === 'draft' && (
                                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 mt-1 text-blue-600 hover:text-blue-700" onClick={() => dispatch({ type: 'MEF_TERR_SEND_OWN', indId: ind.id, cioId, munId: omsu.id })} title="Сохранить">
                                      <Send className="h-3 w-3 mr-1" /> Сохранить
                                    </Button>
                                  )}
                                  {safeV.status !== 'approved' && mefV.status === 'sent' && (
                                    <div className="flex flex-col items-center gap-1 mt-1">
                                      <span className="text-[10px] text-amber-600 leading-tight">Отправлено</span>
                                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500 hover:text-red-600" onClick={() => dispatch({ type: 'MEF_TERR_RECALL_OWN', indId: ind.id, cioId, munId: omsu.id })} title="Отозвать">
                                        <Undo2 className="h-3 w-3 mr-1" /> Отозвать
                                      </Button>
                                    </div>
                                  )}
                                  {safeV.status === 'approved' && (
                                    <div className="flex flex-col items-center gap-1 mt-1">
                                      <span className="text-[10px] text-green-600 flex items-center gap-0.5"><Lock className="w-3 h-3"/> Сохранено</span>
                                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500 hover:text-red-600" onClick={() => dispatch({ type: 'MEF_TERR_RECALL_OWN', indId: ind.id, cioId, munId: omsu.id })} title="Отозвать">
                                        <Undo2 className="h-3 w-3 mr-1" /> Отозвать
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <ValueTip value={mefV[f.key] ?? safeV[f.key]} updatedAt={mefV.updatedAt} author="МЭФ" />
                              )}
                            </td>
                          </Fragment>
                        );
                      })}
                        {/* Примечание (последний столбец) */}
                        {hasNote && noteColsCount > 0 && (
                          <>
                            {showOmsu && approvers.includes('omsu') && (
                              <td className="p-1.5 text-xs border-l text-slate-700 bg-amber-50/10 align-middle">
                                {omsuVal?.note || <span className="text-muted-foreground">—</span>}
                              </td>
                            )}
                            {approvers.includes('cio') && (
                              <td className={`p-1.5 text-xs ${!showOmsu || !approvers.includes('omsu') ? 'border-l' : ''} text-slate-700 bg-amber-50/10 align-middle`}>
                                {safeV.note || <span className="text-muted-foreground">—</span>}
                              </td>
                            )}
                            {approvers.includes('mef') && (
                              <td className="p-1.5 text-xs border-l text-slate-700 bg-amber-50/10 align-middle min-w-[160px]">
                                <Input
                                  type="text"
                                  placeholder="Примечание МЭФ..."
                                  className="h-8 text-xs bg-white min-w-[140px]"
                                  value={mefV.note || ''}
                                  onChange={(e) =>
                                    dispatch({
                                      type: 'SET_INDICATOR_NOTE',
                                      indId: ind.id,
                                      cioId,
                                      munId: omsu.id,
                                      target: 'mef',
                                      note: e.target.value,
                                    })
                                  }
                                />
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Возврат территории на доработку ЦИО</DialogTitle></DialogHeader>
          <Textarea placeholder="Комментарий для ЦИО (обязательно)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Отмена</Button>
            <Button variant="destructive" disabled={!comment.trim()} onClick={() => { if (returnTarget) dispatch({ type: 'MEF_TERR_RETURN', cioId: returnTarget.cioId, indId: returnTarget.indId, munId: returnTarget.munId, actor: 'МЭФ', comment: comment.trim() }); setReturnTarget(null); }}>Вернуть на доработку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MefWorkspaceOld({ block = 'mun' }: { block?: string }) {
  const { state, dispatch } = useStore();
  const [treeFilter, setTreeFilter] = useState<TreeFilter>(EMPTY_TREE_FILTER);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [returnTarget, setReturnTarget] = useState<{ cioId: string; indId: string } | null>(null);
  const [comment, setComment] = useState('');

  const approvers = state.blockSettings[block]?.approvers || ['cio', 'mef'];
  const hasNote = state.blockSettings[block]?.hasNote || false;
  const noteColsCount = (approvers.includes('cio') ? 1 : 0) + (approvers.includes('mef') ? 1 : 0);

  const visible = visibleTree(state.indicators, collapsed, treeFilter);
  const parents = chevronParents(state.indicators);
  const toggleNode = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const fillable = state.indicators.filter((i) => !i.isGroup);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold">Согласование показателей ЦИО</h2><p className="text-sm text-muted-foreground">Проверка и утверждение данных ЦИО.</p></div>
      </div>
      <IndToolbar filter={treeFilter} onChange={setTreeFilter} shown={visible.length} total={fillable.length} />
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex gap-2">
        <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
        <span>МЭФ проверяет значения, внесённые ЦИО. Вы можете согласовать данные или внести собственные.</span>
      </div>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th rowSpan={3} className="text-left p-2 align-middle min-w-[220px]">Показатель / ЦИО</th>
                {VALUE_GROUPS.map((g) => (
                  <th key={g.key} colSpan={g.span * 2} className={`text-center p-1.5 border-l border-b ${GROUP_HEAD[g._bg]}`}>
                    {g.label}
                  </th>
                ))}
                {hasNote && noteColsCount > 0 && (
                  <th rowSpan={2} colSpan={noteColsCount} className="text-center p-1.5 border-l border-b bg-amber-50/70 font-semibold text-slate-800">
                    Примечание
                  </th>
                )}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <th key={f.key} colSpan={2} className={`text-center p-1.5 border-l border-b ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>
                    {f.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b text-xs text-muted-foreground">
                {VALUE_FIELDS.map((f) => (
                  <Fragment key={f.key}>
                    <th className={`text-center p-1.5 font-medium border-l ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>ЦИО</th>
                    <th className={`text-center p-1.5 font-medium ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/70' : fieldTint(f.key)}`}>МЭФ</th>
                  </Fragment>
                ))}
                {hasNote && noteColsCount > 0 && (
                  <>
                    {approvers.includes('cio') && <th className="text-center p-1.5 font-medium border-l bg-amber-50/50 min-w-[180px]">ЦИО</th>}
                    {approvers.includes('mef') && <th className="text-center p-1.5 font-medium border-l bg-amber-50/50 min-w-[180px]">МЭФ</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((ind: any) => {
                if (ind.isGroup) {
                  return (
                    <tr key={ind.id} className="border-b bg-slate-50/80">
                      <td colSpan={1 + VALUE_FIELDS.length * 2 + (hasNote ? noteColsCount : 0)} className="p-2 align-middle">
                        <span className="flex items-center gap-1 font-semibold text-slate-700" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                          <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                          <span><span className="mr-1 text-slate-400">▸</span>{ind.num}. {ind.name}</span>
                        </span>
                      </td>
                    </tr>
                  );
                }

                const cioVals = state.cioValues[ind.id] || {};
                const ciosWithData = Object.entries(cioVals).filter(([_, v]) => v.v2026 !== null || v.status !== 'not_filled');
                
                return (
                  <Fragment key={ind.id}>
                    {ciosWithData.length === 0 ? (
                      <tr className="border-b hover:bg-slate-50">
                        <td className="p-2" colSpan={1 + VALUE_FIELDS.length * 2 + (hasNote ? noteColsCount : 0)}>
                          <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                            <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                            <div>
                              <span className="font-medium text-slate-500">{ind.num} {ind.name} <span className="font-normal">({ind.unit})</span></span>
                              <div className="text-xs text-slate-400">Нет данных от ЦИО</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ciosWithData.map(([cioId, v], ri) => {
                        const cioObj = state.cios.find((c) => c.id === cioId);
                        const mefV = state.mefValues[ind.id]?.[cioId] || { ...v, status: 'not_filled', updatedAt: null };
                        return (
                          <tr key={cioId} className={`border-b ${v.status === 'pending_mef' ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                            <td className="p-2 align-top">
                              <div className="flex items-start gap-1" style={{ paddingLeft: `${(ind.level - 1) * 18}px` }}>
                                {ri === 0 && (
                                  <span className="mt-0.5 inline-flex shrink-0">
                                    <TreeToggle hasChildren={parents.has(ind.id)} collapsed={!!collapsed[ind.id]} onToggle={() => toggleNode(ind.id)} />
                                  </span>
                                )}
                                <div>
                                  {ri === 0 && <span className="font-medium">{ind.num} {ind.name} <span className="font-normal text-muted-foreground">({ind.unit})</span><br /></span>}
                                  <span className="text-sm font-semibold text-slate-700">ЦИО: {cioObj?.short || cioId}</span>
                                </div>
                              </div>
                            </td>
                            {VALUE_FIELDS.map((f) => {
                              const isForecastField = f.key.startsWith('cons') || f.key.startsWith('base');
                              const isTargetField = f.key === 'v2026' || f.key === 'v2025' || isForecastField;
                              const isCioLocked = !!v.lockedByMef || !!v.lockedFields?.[f.key];
                              return (
                                <Fragment key={f.key}>
                                  <td className={`p-1.5 text-center border-l ${isTargetField ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                    {isTargetField ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <Input
                                          type="number"
                                          step="0.1"
                                          className={`h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium ${isCioLocked ? 'border-blue-500 bg-blue-50/50 text-blue-950 font-bold ring-1 ring-blue-400' : 'border-blue-300'}`}
                                          placeholder="—"
                                          value={v[f.key] ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? null : Number(e.target.value);
                                            dispatch({
                                              type: 'MEF_SET_CIO_OWN_VALUE',
                                              cioIndId: ind.id,
                                              cioId,
                                              field: f.key,
                                              value: val,
                                            });
                                          }}
                                          title={isCioLocked ? 'Значение введено МЭФ (заблокировано для ЦИО)' : 'Ввод значения ЦИО куратором МЭФ с автосогласованием'}
                                        />
                                        {isCioLocked ? (
                                          <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                            <span className="text-[10px] text-blue-800 font-semibold flex items-center gap-0.5 bg-blue-100/70 px-1 rounded">
                                              <Lock className="w-3 h-3 text-blue-700" /> Введено МЭФ
                                            </span>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-5 text-[9px] px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                              onClick={() => dispatch({ type: 'MEF_UNLOCK_CIO_OWN_VALUE', cioIndId: ind.id, cioId, field: f.key })}
                                              title="Снять блокировку МЭФ и вернуть ЦИО право редактирования"
                                            >
                                              <Undo2 className="h-3 w-3 mr-0.5" /> Вернуть ЦИО
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center gap-1">
                                            <CioStatusBadge status={v.status} />
                                            {v.status === 'pending_mef' && (
                                              <div className="flex gap-1 mt-0.5">
                                                <Button size="icon-sm" variant="outline" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => dispatch({ type: 'MEF_APPROVE', cioIndId: ind.id, cioId, actor: 'МЭФ' })} title="Согласовать">
                                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon-sm" variant="outline" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { setReturnTarget({ cioId, indId: ind.id }); setComment(''); }} title="Вернуть">
                                                  <Undo2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </div>
                                            )}
                                            {v.status === 'approved' && (
                                              <div className="flex gap-1 mt-0.5">
                                                <Button size="icon-sm" variant="outline" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { setReturnTarget({ cioId, indId: ind.id }); setComment(''); }} title="Вернуть">
                                                  <Undo2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </div>
                                            )}
                                            {v.status !== 'approved' && v[f.key] != null && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-5 text-[9px] px-1.5 mt-0.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                                                onClick={() => dispatch({ type: 'MEF_SET_CIO_OWN_VALUE', cioIndId: ind.id, cioId, field: f.key, value: v[f.key] })}
                                                title="Автосогласовать и заблокировать для ЦИО"
                                              >
                                                <Lock className="h-3 w-3 mr-0.5" /> Заблокировать
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className={mefV[f.key] !== null && v[f.key] !== null && mefV[f.key] !== v[f.key] ? 'text-red-600 font-bold' : ''}>
                                        <ValueTip value={v[f.key]} updatedAt={v.updatedAt} author={v.signedBy ?? 'Ответственный'} />
                                      </div>
                                    )}
                                  </td>
                                <td className={`p-1.5 text-center ${f.key === 'v2026' || f.key === 'v2025' ? 'bg-amber-50/30' : fieldTint(f.key)}`}>
                                  {(f.key === 'v2026' || f.key === 'v2025') ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <Input
                                        type="number"
                                        step="0.1"
                                        className="h-8 w-[76px] text-center mx-auto bg-white px-1 font-medium border-amber-300"
                                        placeholder="—"
                                        value={mefV[f.key] ?? ''}
                                        disabled={v.status === 'approved'}
                                        onChange={(e) => dispatch({ type: 'MEF_SET_OWN', cioIndId: ind.id, cioId, field: f.key, value: e.target.value === '' ? null : Number(e.target.value) })}
                                      />

                                      {v.status !== 'approved' && mefV[f.key] !== null && mefV.status === 'draft' && (
                                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 mt-1 text-blue-600 hover:text-blue-700" onClick={() => dispatch({ type: 'MEF_SEND_OWN', cioIndId: ind.id, cioId })} title="Сохранить">
                                          <Send className="h-3 w-3 mr-1" /> Сохранить
                                        </Button>
                                      )}
                                      {v.status !== 'approved' && mefV.status === 'sent' && (
                                        <div className="flex flex-col items-center gap-1 mt-1">
                                          <span className="text-[10px] text-amber-600 leading-tight">Отправлено</span>
                                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500 hover:text-red-600" onClick={() => dispatch({ type: 'MEF_RECALL_OWN', cioIndId: ind.id, cioId })} title="Отозвать">
                                            <Undo2 className="h-3 w-3 mr-1" /> Отозвать
                                          </Button>
                                        </div>
                                      )}
                                      {v.status === 'approved' && (
                                        <div className="flex flex-col items-center gap-1 mt-1">
                                          <span className="text-[10px] text-green-600 flex items-center gap-0.5"><Lock className="w-3 h-3"/> Сохранено</span>
                                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-red-500 hover:text-red-600" onClick={() => dispatch({ type: 'MEF_RECALL_OWN', cioIndId: ind.id, cioId })} title="Отозвать">
                                            <Undo2 className="h-3 w-3 mr-1" /> Отозвать
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <ValueTip value={mefV[f.key] ?? v[f.key]} updatedAt={mefV.updatedAt} author="МЭФ" />
                                  )}
                                </td>
                              </Fragment>
                            );
                          })}
                            {hasNote && noteColsCount > 0 && (
                              <>
                                {approvers.includes('cio') && (
                                  <td className="p-1.5 text-xs border-l text-slate-700 bg-amber-50/10 align-middle">
                                    {v.note || <span className="text-muted-foreground">—</span>}
                                  </td>
                                )}
                                {approvers.includes('mef') && (
                                  <td className="p-1.5 text-xs border-l text-slate-700 bg-amber-50/10 align-middle min-w-[160px]">
                                    <Input
                                      type="text"
                                      placeholder="Примечание МЭФ..."
                                      className="h-8 text-xs bg-white min-w-[140px]"
                                      value={mefV.note || ''}
                                      onChange={(e) =>
                                        dispatch({
                                          type: 'SET_INDICATOR_NOTE',
                                          indId: ind.id,
                                          cioId,
                                          target: 'mef',
                                          note: e.target.value,
                                        })
                                      }
                                    />
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Возврат показателя на доработку ЦИО</DialogTitle></DialogHeader>
          <Textarea placeholder="Комментарий для ЦИО (обязательно)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Отмена</Button>
            <Button variant="destructive" disabled={!comment.trim()} onClick={() => { if (returnTarget) dispatch({ type: 'MEF_RETURN', cioId: returnTarget.cioId, cioIndId: returnTarget.indId, actor: 'МЭФ', comment: comment.trim() }); setReturnTarget(null); }}>Вернуть на доработку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
