import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { NOTE_REPORTING_YEAR, buildNoteArchiveOmsuValues, NOTE_DEFAULT_PERIODS } from '@/lib/data';
import { noteTemplateName, noteTemplateCellKeys } from '@/lib/types';
import { NoteTable } from '@/components/note/NoteTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Flag, Download, Printer, Info } from 'lucide-react';

export function NoteOutputTables({ fixedMunId }: { fixedMunId?: string }) {
  const { state } = useStore();
  const muns = state.omsus.filter((m) => m.isActive !== false);
  const [munId, setMunId] = useState(fixedMunId ?? muns[0]?.id ?? '');
  const mun = state.omsus.find((m) => m.id === munId);

  // Периоды сбора пояснительной записки
  const notePeriods = useMemo(() => {
    const curName = state.noteCampaign.period || NOTE_DEFAULT_PERIODS[0].name;
    return [
      { id: 'cur', name: `${curName} (текущий сбор)`, year: NOTE_REPORTING_YEAR, isCurrent: true },
      ...NOTE_DEFAULT_PERIODS.slice(1).map((p) => ({ ...p, isCurrent: false })),
    ];
  }, [state.noteCampaign.period]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('cur');
  const selectedPeriod = notePeriods.find((p) => p.id === selectedPeriodId) || notePeriods[0];
  const year = selectedPeriod.year;
  const isArchive = !selectedPeriod.isCurrent;

  // Архив — снимок документа за прошлый год (все разделы, данные завершённой кампании)
  const templates = isArchive
    ? state.noteTemplates
    : state.noteTemplates.filter((t) => t.isActive);

  const archiveData = useMemo(
    () =>
      isArchive
        ? buildNoteArchiveOmsuValues(year, state.noteTemplates, state.omsus.filter((m) => m.isActive !== false))
        : null,
    [isArchive, year, state.noteTemplates, state.omsus],
  );
  const munData = isArchive ? (archiveData?.[munId] ?? {}) : state.noteOmsuValues[munId] ?? {};

  // Фильтр «Показатели» (только для текущего года): 'all' — все показатели, иначе выбранный показатель ПЗ
  const [indFilter, setIndFilter] = useState<string>('all');
  const indById = new Map(state.indicators.map((i) => [i.id, i]));
  const filterValue = indFilter === 'all' || templates.some((t) => t.id === indFilter) ? indFilter : 'all';
  const shown = !isArchive && filterValue !== 'all' ? templates.filter((t) => t.id === filterValue) : templates;

  // Статистика допуска к выгрузке (наличие синих флажков)
  const stats = useMemo(() => {
    let totalCells = 0;
    let blueApprovedCells = 0;
    let hiddenCells = 0;

    shown.forEach((t) => {
      const keys = noteTemplateCellKeys(t);
      const data = munData[t.id];
      const cioApp = data?.cioApproved || {};

      keys.forEach((k) => {
        totalCells++;
        if (cioApp[k]) {
          blueApprovedCells++;
        } else {
          hiddenCells++;
        }
      });
    });

    return { totalCells, blueApprovedCells, hiddenCells };
  }, [shown, munData]);

  // Функция экспорта утверждённых данных в CSV / Excel формат
  const exportToCsv = () => {
    const rows: string[][] = [
      ['Отчетный год', String(year)],
      ['Муниципальное образование', mun?.name || munId],
      ['Период сбора', selectedPeriod.name],
      [''],
      ['Раздел', 'Показатель', 'Строка блока', 'Столбец', 'Текст пояснительной записки (только утверждённые синим флажком)', 'Статус утверждения'],
    ];

    state.directions.forEach((d) => {
      const dirTpls = shown.filter((t) => t.sectionId === d.id);
      dirTpls.forEach((t) => {
        const name = noteTemplateName(t, indById);
        const data = munData[t.id];
        const cells = data?.cells || {};
        const cioApp = data?.cioApproved || {};

        t.rows.forEach((r) => {
          t.columns.forEach((col, cIdx) => {
            const key = `${r.id}:0:${cIdx}`;
            const hasBlue = !!cioApp[key];
            const text = hasBlue ? cells[key] || '' : ''; // Если нет синего флажка, ячейка пустая!
            rows.push([
              `"${d.name.replace(/"/g, '""')}"`,
              `"${name.replace(/"/g, '""')}"`,
              `"${r.name.replace(/"/g, '""')}"`,
              `"${col.name.replace(/"/g, '""')}"`,
              `"${text.replace(/"/g, '""')}"`,
              hasBlue ? '"Утверждено (синий флажок)"' : '"Не утверждено (скрыто)"',
            ]);
          });
        });
      });
    });

    const csvContent = '\uFEFF' + rows.map((r) => r.join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Пояснительная_записка_${mun?.name || munId}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Итоговые таблицы пояснительной записки{fixedMunId && mun ? ` — ${mun.name}` : ''}
          </h2>
          <p className="text-sm text-slate-500">
            Формирование выходных таблиц по утверждённым данным · Отчетный год: <span className="font-medium text-slate-700">{year}</span>
          </p>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs text-slate-700 border-slate-300"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 text-slate-600" /> Печать
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            onClick={exportToCsv}
          >
            <Download className="h-4 w-4" /> Выгрузить в Excel (CSV)
          </Button>
        </div>
      </div>

      {/* Фильтры и селекторы */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
        {!fixedMunId && (
          <div className="w-64">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Территория</span>
            <Select value={munId} onValueChange={setMunId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Территория" /></SelectTrigger>
              <SelectContent>
                {muns.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="w-80">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">Период сбора</span>
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Период сбора" /></SelectTrigger>
            <SelectContent>
              {notePeriods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!isArchive && (
          <div className="w-80">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Фильтр по показателям</span>
            <Select value={filterValue} onValueChange={setIndFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Показатели" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все показатели</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{noteTemplateName(t, indById)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Сводка допуска к выгрузке */}
        <div className="ml-auto flex items-center gap-3 text-xs pt-3 sm:pt-0">
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-900 shadow-sm flex items-center gap-1.5 font-medium">
            <Flag className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
            <span>Допущено к выгрузке (синий флажок 🔵):</span>
            <span className="font-bold">{stats.blueApprovedCells} / {stats.totalCells}</span>
          </div>
          {stats.hiddenCells > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 shadow-sm">
              <span>Скрыто (без синего флажка):</span> <span className="font-bold text-slate-800">{stats.hiddenCells}</span>
            </div>
          )}
        </div>
      </div>

      {/* Обязательный регламентный баннер по Требованию 8 */}
      <div className="rounded-md border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-950 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-blue-900">Регламент отображения выходных данных пояснительной записки:</div>
          <div className="text-slate-700 mt-0.5">
            Информация считается согласованной и допускается к выгрузке в выходных данных пояснительной записки,{' '}
            <strong>когда все ячейки утверждены («зафлажкованы» синими флажками 🔵)</strong>. Если синий флажок не стоит, то ячейка остаётся пустой и текст не отображается.
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Нет данных для отображения
        </div>
      ) : (
        <NoteTable
          templates={shown}
          directions={state.directions}
          indicators={state.indicators}
          mode="readonly"
          omsuData={munData}
          reportingYear={year}
        />
      )}
    </div>
  );
}
