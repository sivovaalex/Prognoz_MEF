import React from 'react';
import { useStore } from '@/lib/store';
import { DIRECTIONS } from '@/lib/data';
import type { IndicatorValues } from '@/lib/types';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReportView() {
  const { state } = useStore();
  
  const thCls = 'p-2 text-xs font-medium text-center border bg-slate-50';
  const tdCls = 'p-2 text-sm border';
  
  const fmt = (v: number | null) => {
    if (v === null) return '—';
    // Format large numbers with spaces
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
          ПРОГНОЗ СОЦИАЛЬНО-ЭКОНОМИЧЕСКОГО РАЗВИТИЯ МОСКОВСКОЙ ОБЛАСТИ НА 2027 - 2029 ГОДЫ
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
            {DIRECTIONS.map((dir, dIdx) => (
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
