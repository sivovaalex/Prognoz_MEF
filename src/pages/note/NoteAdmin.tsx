import { Fragment, useState } from 'react';
import { useStore } from '@/lib/store';
import type { NoteTemplate } from '@/lib/types';
import { noteTemplateName } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoteTable } from '@/components/note/NoteTable';
import { Plus, Pencil, Power, Trash2 } from 'lucide-react';

export function NoteAdmin() {
  const { state, dispatch } = useStore();
  const [modal, setModal] = useState<{ template: NoteTemplate | null; sectionId?: string } | null>(null);
  const indById = new Map(state.indicators.map((i) => [i.id, i]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Администрирование пояснительной записки</h2>
          <p className="text-sm text-slate-500">Шаблоны показателей пояснительной записки по разделам</p>
        </div>
        <Button className="bg-[#1e5c8f] text-white hover:bg-[#1e5c8f]/90" onClick={() => setModal({ template: null })}>
          <Plus className="mr-1 h-4 w-4" /> Добавить показатель
        </Button>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        Показатель привязывается к общему дереву («Настройка показателей») или вводится вручную и определяет столбцы и строки данных,
        которые заполняет ОМСУ, а ЦИО согласовывает. Неактивные показатели не участвуют в сборе.
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500">
              <th className="w-16 px-3 py-2">№</th>
              <th className="px-3 py-2">Наименование показателя</th>
              <th className="w-40 px-3 py-2">Столбцы</th>
              <th className="w-80 px-3 py-2">Строки</th>
              <th className="w-28 px-3 py-2">Статус</th>
              <th className="w-20 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {state.directions.map((d) => {
              const tpls = state.noteTemplates.filter((t) => t.sectionId === d.id);
              if (tpls.length === 0) return null;
              return (
                <Fragment key={d.id}>
                  <tr>
                    <td colSpan={6} className="bg-[#1e5c8f] px-3 py-1.5 text-xs font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>{d.name}</span>
                        <button
                          type="button"
                          title="Добавить показатель в раздел"
                          className="rounded p-0.5 text-white/80 hover:bg-white/20 hover:text-white"
                          onClick={() => setModal({ template: null, sectionId: d.id })}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {tpls.map((t) => {
                    const ind = indById.get(t.indicatorId);
                    return (
                      <tr key={t.id} className={`border-t border-slate-100 ${t.isActive ? '' : 'opacity-50'}`}>
                        <td className="px-3 py-2 text-xs">{ind?.num ?? '—'}</td>
                        <td className="px-3 py-2 text-xs">{ind?.name ?? noteTemplateName(t, indById)}</td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            {t.columns.map((c) => (
                              <span key={c.id} className="text-slate-700">{c.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            {t.rows.map((r) => (
                              <span key={r.id} className="text-slate-700">
                                {r.name} —{' '}
                                <span className="text-slate-400">
                                  {(r.cellCount ?? 1) === 1 ? 'текст' : `текст (${r.cellCount} ячеек)`}
                                </span>
                              </span>
                            ))}
                            {t.rows.length === 0 && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={t.isActive
                              ? { color: '#047857', background: '#d1fae5' }
                              : { color: '#64748b', background: '#f1f5f9' }}
                          >
                            {t.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button type="button" title="Редактировать" className="text-slate-400 hover:text-blue-700" onClick={() => setModal({ template: t })}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" title={t.isActive ? 'Деактивировать' : 'Активировать'} className="text-slate-400 hover:text-blue-700" onClick={() => dispatch({ type: 'NOTE_TOGGLE_TEMPLATE', id: t.id })}>
                              <Power className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <NoteTemplateModal initial={modal.template} presetSectionId={modal.sectionId} onClose={() => setModal(null)} />}
    </div>
  );
}
/** ПЗ (админ): стандартные столбцы числового показателя */
const STD_COLS = (): { id: string; name: string }[] => [
  { id: 'c1', name: 'Отчёт' },
  { id: 'c2', name: 'Оценка' },
  { id: 'c3', name: 'Прогноз' },
];

function NoteTemplateModal({ initial, presetSectionId, onClose }: { initial: NoteTemplate | null; presetSectionId?: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const isNew = !initial;
  const isCustomInitial = !!initial && !state.indicators.some((i) => i.id === initial.indicatorId);
  const [customMode, setCustomMode] = useState(isCustomInitial);
  const [customName, setCustomName] = useState(isCustomInitial ? (initial?.label ?? '') : '');
  const [sectionId, setSectionId] = useState(initial?.sectionId ?? presetSectionId ?? state.directions[0]?.id ?? '');
  const [indicatorId, setIndicatorId] = useState(isCustomInitial ? '' : (initial?.indicatorId ?? ''));
  const [columns, setColumns] = useState(
    initial ? initial.columns.map((c) => ({ ...c })) : [{ id: 'c1', name: 'Отчёт' }, { id: 'c2', name: 'Оценка' }, { id: 'c3', name: 'Прогноз' }],
  );
  const [rows, setRows] = useState(initial ? initial.rows.map((r) => ({ ...r })) : []);
  const [label, setLabel] = useState(initial?.label ?? '');
  const [error, setError] = useState('');

  const sectionIndicators = state.indicators.filter((i) => i.directionId === sectionId && !i.isGroup);
  const usedIndicatorIds = new Set(state.noteTemplates.filter((t) => t.id !== initial?.id).map((t) => t.indicatorId));

  const addColumn = () => {
    setColumns((cs) => [...cs, { id: `c${Date.now()}`, name: '' }]);
  };
  const removeColumn = (id: string) => {
    setColumns((cs) => cs.filter((c) => c.id !== id));
  };
  const setColumnName = (id: string, name: string) => setColumns((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c)));

  const addRow = () => setRows((rs) => [...rs, { id: `r${Date.now()}`, name: '' }]);
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const setRow = (id: string, patch: Partial<{ name: string; cellCount?: number }>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addCell = (id: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cellCount: (r.cellCount ?? columns.length) + 1 } : r)));
  const removeCell = (id: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cellCount: Math.max(1, (r.cellCount ?? columns.length) - 1) } : r)));

  const save = () => {
    if (!sectionId) { setError('Выберите раздел'); return; }
    if (customMode) {
      if (!customName.trim()) { setError('Введите наименование показателя'); return; }
    } else if (!indicatorId) {
      setError('Выберите показатель из общего дерева'); return;
    } else if (usedIndicatorIds.has(indicatorId)) {
      setError('Этот показатель уже добавлен в другой раздел'); return;
    }
    if (columns.length === 0 || columns.some((c) => !c.name.trim())) { setError('Заполните названия всех столбцов'); return; }
    if (rows.some((r) => !r.name.trim())) { setError('Заполните названия всех строк'); return; }
    const template: NoteTemplate = {
      id: initial?.id ?? `nt${Date.now()}`,
      indicatorId: customMode ? (isCustomInitial && initial ? initial.indicatorId : `custom-${Date.now()}`) : indicatorId,
      sectionId,
      columns,
      rows,
      ...(customMode ? { label: customName.trim() } : label.trim() ? { label: label.trim() } : {}),
    };
    dispatch(isNew ? { type: 'NOTE_ADD_TEMPLATE', template } : { type: 'NOTE_UPDATE_TEMPLATE', template });
    onClose();
  };

  // Черновик шаблона для живого предпросмотра (как показатель будет выглядеть в документе)
  const previewLabel = customMode
    ? customName.trim() || 'Показатель (введите наименование)'
    : indicatorId
      ? (label.trim() || undefined)
      : 'Показатель (выберите из общего дерева)';
  const previewTemplate: NoteTemplate = {
    id: 'preview',
    indicatorId: indicatorId || 'preview-ind',
    sectionId,
    columns: columns.length > 0 ? columns : STD_COLS(),
    rows,
    ...(previewLabel ? { label: previewLabel } : {}),
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Новый показатель пояснительной записки' : 'Редактирование показателя'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Раздел показателя</label>
            <Select value={sectionId} onValueChange={(v) => { setSectionId(v); setIndicatorId(''); }}>
              <SelectTrigger><SelectValue placeholder="Выберите раздел" /></SelectTrigger>
              <SelectContent>
                {state.directions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Наименование показателя</label>
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-600">
                  <input type="radio" name="indSource" checked={!customMode} onChange={() => setCustomMode(false)} className="h-3.5 w-3.5 accent-[#1e5c8f]" />
                  Из общего дерева
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-600">
                  <input type="radio" name="indSource" checked={customMode} onChange={() => setCustomMode(true)} className="h-3.5 w-3.5 accent-[#1e5c8f]" />
                  Ввести вручную
                </label>
              </div>
            </div>
            {customMode ? (
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Введите наименование показателя"
                className="h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <Select value={indicatorId} onValueChange={setIndicatorId}>
                <SelectTrigger><SelectValue placeholder="Выберите показатель из общего дерева" /></SelectTrigger>
                <SelectContent>
                  {sectionIndicators.map((i) => (
                    <SelectItem key={i.id} value={i.id} disabled={usedIndicatorIds.has(i.id)}>
                      {i.num} {i.name}{usedIndicatorIds.has(i.id) ? ' (уже добавлен)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {!customMode && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Наименование в документе (необязательно)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="По умолчанию — имя показателя без префикса «Справочно:»"
                className="h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="border-t pt-3">
            <div className="mb-2 text-sm font-medium">Конфигурация данных, заполняемых ОМСУ</div>
            <div className="mb-1 text-xs font-medium text-slate-500">Столбцы</div>
            <div className="flex flex-col gap-2">
              {columns.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <input
                    value={c.name}
                    onChange={(e) => setColumnName(c.id, e.target.value)}
                    placeholder="Название столбца"
                    className="h-9 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button type="button" title="Удалить столбец" className="text-slate-400 hover:text-rose-600" onClick={() => removeColumn(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50" onClick={addColumn}>
                <Plus className="mr-1 h-4 w-4" /> Добавить столбец
              </Button>
            </div>

            <div className="mb-1 mt-4 text-xs font-medium text-slate-500">Строки</div>
            {rows.length === 0 && (
              <div className="mb-2 text-xs text-slate-400">Без строк — только строка показателя с подшапкой столбцов.</div>
            )}
            <div className="flex flex-col gap-2">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-col gap-1.5 rounded-md border border-slate-200 p-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={r.name}
                      onChange={(e) => setRow(r.id, { name: e.target.value })}
                      placeholder="Наименование строки"
                      className="h-9 min-w-[160px] flex-1 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="button" title="Удалить строку" className="text-slate-400 hover:text-rose-600" onClick={() => removeRow(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Ячейки (ввод ОМСУ):</span>
                    {Array.from({ length: r.cellCount ?? columns.length }, (_, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                        {i + 1}
                        <button type="button" title="Убрать ячейку" className="text-slate-400 hover:text-rose-600" onClick={() => removeCell(r.id)}>
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => addCell(r.id)}
                      disabled={(r.cellCount ?? columns.length) >= columns.length}
                      title={(r.cellCount ?? columns.length) >= columns.length ? 'Максимум — по числу столбцов' : 'Добавить ячейку'}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] text-slate-500 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-500"
                    >
                      <Plus className="h-3 w-3" /> Ячейка
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50" onClick={addRow}>
                <Plus className="mr-1 h-4 w-4" /> Добавить строку
              </Button>
            </div>
          </div>

          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-[44%]">
            <div className="text-sm font-medium">Предпросмотр — как показатель будет выглядеть в документе</div>
            <div className="max-h-[62vh] overflow-auto rounded-md border border-slate-200 bg-white p-2">
              <NoteTable
                templates={[previewTemplate]}
                directions={state.directions}
                indicators={state.indicators}
                mode="readonly"
                omsuData={{}}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-[#1e5c8f] text-white hover:bg-[#1e5c8f]/90" onClick={save}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}