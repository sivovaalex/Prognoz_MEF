import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import type { IndicatorValues } from '@/lib/types';
import { Download, ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

function OldReportView() {
  const { state } = useStore();
  
  const thCls = 'p-2 text-xs font-medium text-center border bg-slate-50';
  const tdCls = 'p-2 text-sm border';
  
  const fmt = (v: number | null) => {
    if (v === null) return '—';
    return v.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  };

  const getAggValue = (indId: string, field: keyof IndicatorValues) => {
    let sum = 0;
    let hasVal = false;
    Object.values(state.omsuValues).forEach(munVals => {
      const v = munVals[indId]?.[field];
      if (typeof v === 'number') {
        sum += v;
        hasVal = true;
      }
    });
    return hasVal ? sum : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Сводный отчёт по показателям
        </h2>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4 text-green-700" />
          Скачать эксель
        </Button>
      </div>

      <div className="overflow-x-auto bg-white p-4 rounded border shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thCls} rowSpan={2}>Показатели</th>
              <th className={thCls} rowSpan={2}>Единицы измерения</th>
              <th className={thCls} colSpan={2}>Отчет</th>
              <th className={thCls} rowSpan={2}>Оценка<br/>2026 год</th>
              <th className={thCls} colSpan={2}>2027 год</th>
              <th className={thCls} colSpan={2}>2028 год</th>
              <th className={thCls} colSpan={2}>2029 год</th>
            </tr>
            <tr>
              <th className={thCls}>2024 год</th>
              <th className={thCls}>2025 год</th>
              <th className={thCls}>1 вариант<br/>(консервативный)</th>
              <th className={thCls}>2 вариант<br/>(базовый)</th>
              <th className={thCls}>1 вариант<br/>(консервативный)</th>
              <th className={thCls}>2 вариант<br/>(базовый)</th>
              <th className={thCls}>1 вариант<br/>(консервативный)</th>
              <th className={thCls}>2 вариант<br/>(базовый)</th>
            </tr>
          </thead>
          <tbody>
            {state.directions.map((dir, dIdx) => (
              <React.Fragment key={dir.id}>
                <tr className="bg-slate-100 font-semibold">
                  <td className={tdCls} colSpan={11}>
                    {dIdx + 1}. {dir.name}
                  </td>
                </tr>
                {state.indicators.filter(i => i.directionId === dir.id).map((ind) => (
                  <tr key={ind.id} className={ind.isGroup ? "bg-slate-50 text-slate-700 font-medium" : ""}>
                    <td className={`${tdCls} ${!ind.isGroup ? 'pl-8' : 'pl-4'}`}>
                      {ind.name}
                    </td>
                    <td className={`${tdCls} text-center`}>{ind.unit || ''}</td>
                    {!ind.isGroup ? (
                      <>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'v2024'))}</td>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'v2025'))}</td>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'v2026'))}</td>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'cons2027'))}</td>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'base2027'))}</td>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'cons2028'))}</td>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'base2028'))}</td>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'cons2029'))}</td>
                        <td className={`${tdCls} text-center`}>{fmt(getAggValue(ind.id, 'base2029'))}</td>
                      </>
                    ) : (
                      <td className={tdCls} colSpan={9}></td>
                    )}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewOmsuReportView() {
  const { state } = useStore();
  const [selectedInd, setSelectedInd] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  const toggleDir = (id: string) => {
    setExpandedDirs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeInd = state.indicators.find(i => i.id === selectedInd);
  
  const thCls = 'p-2 text-xs font-medium text-center border bg-slate-50';
  const tdCls = 'p-2 text-sm border text-right';
  
  const fmt = (v: number | undefined | null) => {
    if (v === undefined || v === null) return '—';
    return v.toLocaleString('ru-RU', { maximumFractionDigits: 5 });
  };

  const activeOmsus = state.omsus.filter(o => o.isActive);

  return (
    <div className="flex flex-col h-full bg-white rounded border shadow-sm mt-4">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 uppercase">
            {state.campaign.module === 'ukaz' ? 'КОНТРОЛЬ ИСПОЛНЕНИЯ УКАЗА ПРЕЗИДЕНТА РФ №607' : 'ПРОГНОЗ СОЦИАЛЬНО-ЭКОНОМИЧЕСКОГО РАЗВИТИЯ НА 2027-2029 ГОДЫ'}
          </h2>
          <div className="text-sm text-slate-500 mt-1">
            Выходные таблицы по муниципальному прогнозу для ЦИОГВ
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4 text-green-700" />
          Скачать эксель
        </Button>
      </div>

      <div className="flex flex-1 min-h-[600px]">
        {/* Левая панель - Дерево */}
        <div className="w-80 border-r overflow-y-auto bg-slate-50 p-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-2">Показатели</div>
          {state.directions.map((dir, dIdx) => {
            const dirInds = state.indicators.filter(i => i.directionId === dir.id);
            if (dirInds.length === 0) return null;
            const isExpanded = expandedDirs[dir.id];
            
            return (
              <div key={dir.id} className="mb-1">
                <button
                  onClick={() => toggleDir(dir.id)}
                  className="w-full flex items-center gap-1.5 p-1.5 hover:bg-slate-200 rounded text-sm text-left text-slate-800"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <Folder className="h-4 w-4 text-blue-400 fill-blue-100" />
                  <span className="truncate font-medium">{dIdx + 1}. {dir.name}</span>
                </button>
                {isExpanded && (
                  <div className="ml-6 border-l pl-2 py-1 space-y-1">
                    {dirInds.map(ind => (
                      <button
                        key={ind.id}
                        onClick={() => !ind.isGroup && setSelectedInd(ind.id)}
                        disabled={ind.isGroup}
                        className={`w-full flex items-center gap-2 p-1.5 rounded text-sm text-left transition-colors ${
                          selectedInd === ind.id ? 'bg-[#1e5c8f] text-white' : ind.isGroup ? 'text-slate-500 font-medium' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {!ind.isGroup && <FileText className={`h-3.5 w-3.5 shrink-0 ${selectedInd === ind.id ? 'text-blue-200' : 'text-slate-400'}`} />}
                        <span className="truncate" title={ind.name}>{ind.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Правая панель - Таблица */}
        <div className="flex-1 p-4 overflow-x-auto">
          {activeInd ? (
            <div>
              <div className="mb-4">
                <div className="font-semibold text-slate-800">
                  Показатель: {activeInd.name}
                </div>
                <div className="text-sm text-slate-600">
                  Единица измерения: {activeInd.unit || '—'}
                </div>
              </div>
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr>
                    <th className={`${thCls} text-left w-64 sticky left-0 z-10`} rowSpan={2}>Муниципальные образования</th>
                    <th className={thCls} colSpan={2}>Отчет</th>
                    <th className={thCls} rowSpan={2}>Оценка<br/>2026</th>
                    <th className={thCls} colSpan={2}>2027</th>
                    <th className={thCls} colSpan={2}>2028</th>
                    <th className={thCls} colSpan={2}>2029</th>
                  </tr>
                  <tr>
                    <th className={thCls}>2024</th>
                    <th className={thCls}>2025</th>
                    <th className={thCls}>1 вариант<br/>(консервативный)</th>
                    <th className={thCls}>2 вариант<br/>(базовый)</th>
                    <th className={thCls}>1 вариант<br/>(консервативный)</th>
                    <th className={thCls}>2 вариант<br/>(базовый)</th>
                    <th className={thCls}>1 вариант<br/>(консервативный)</th>
                    <th className={thCls}>2 вариант<br/>(базовый)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOmsus.map(omsu => {
                    const vals = state.omsuValues[omsu.id]?.[activeInd.id];
                    return (
                      <tr key={omsu.id} className="hover:bg-slate-50">
                        <td className="p-2 text-sm border font-medium text-slate-700 bg-white sticky left-0 z-10">{omsu.name}</td>
                        <td className={tdCls}>{fmt(vals?.v2024)}</td>
                        <td className={tdCls}>{fmt(vals?.v2025)}</td>
                        <td className={tdCls}>{fmt(vals?.v2026)}</td>
                        <td className={tdCls}>{fmt(vals?.cons2027)}</td>
                        <td className={tdCls}>{fmt(vals?.base2027)}</td>
                        <td className={tdCls}>{fmt(vals?.cons2028)}</td>
                        <td className={tdCls}>{fmt(vals?.base2028)}</td>
                        <td className={tdCls}>{fmt(vals?.cons2029)}</td>
                        <td className={tdCls}>{fmt(vals?.base2029)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <FileText className="h-16 w-16 opacity-20" />
              <p>Выберите показатель в левом меню для просмотра значений</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportView() {
  const { state } = useStore();
  
  if (state.campaign.module === 'rating') {
    return <OldReportView />;
  }
  
  return <NewOmsuReportView />;
}
