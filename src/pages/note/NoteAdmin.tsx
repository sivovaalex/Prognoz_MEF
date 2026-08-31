import { Fragment, useState } from 'react';
import { useStore } from '@/lib/store';
import type { NoteTemplate, NoteRowKind, NoteIndicatorRowKind } from '@/lib/types';
import { noteTemplateName } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Power, Trash2 } from 'lucide-react';

export function NoteAdmin() {
  const { state, dispatch } = useStore();
  const [modal, setModal] = useState<{ template: NoteTemplate | null } | null>(null);
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
        Шаблон привязывается к показателю общего дерева («Настройка показателей») и определяет столбцы и строки данных,
        которые заполняет ОМСУ. Неактивные шаблоны не участвуют в сборе.
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
                    <td colSpan={6} className="bg-[#1e5c8f] px-3 py-1.5 text-xs font-semibold text-white">{d.name}</td>
                  </tr>
                  {tpls.map((t) => {
                    const ind = indById.get(t.indicatorId);
                    return (
                      <tr key={t.id} className={`border-t border-slate-100 ${t.isActive ? '' : 'opacity-50'}`}>
                        <td className="px-3 py-2 text-xs">{ind?.num ?? '—'}</td>
                        <td className="px-3 py-2 text-xs">{ind?.name ?? t.indicatorId}</td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            {t.columns.map((c) => (
                              <span key={c.id} className="text-slate-700">{c.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            {t.indicatorRow !== 'none' && (
                              <span className="text-slate-700">
                                {noteTemplateName(t, indById)} —{' '}
                                <span className="text-slate-400">{t.indicatorRow === 'value' ? 'значения' : 'текст'}</span>
                              </span>
                            )}
                            {t.rows.map((r) => (
                              <span key={r.id} className="text-slate-700">
                                {r.name} —{' '}
                                <span className="text-slate-400">
                                  {r.kind === 'value'
                                    ? 'значения'
                                    : r.kind === 'text'
                                      ? `текст${r.mergeColumns ? ', объединённые столбцы' : ''}`
                                      : `предприятия (${r.subRowCount} строк)`}
                                </span>
                              </span>
                            ))}
                            {t.indicatorRow === 'none' && t.rows.length === 0 && (
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

      {modal && <NoteTemplateModal initial={modal.template} onClose={() => setModal(null)} />}
    </div>
  );
}
function NoteTemplateModal({ initial, onClose }: { initial: NoteTemplate | null; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const isNew = !initial;
  const [sectionId, setSectionId] = useState(initial?.sectionId ?? state.directions[0]?.id ?? '');
  const [indicatorId, setIndicatorId] = useState(initial?.indicatorId ?? '');
  const [columns, setColumns] = useState(
    initial ? initial.columns.map((c) => ({ ...c })) : [{ id: 'c1', name: 'Отчёт' }, { id: 'c2', name: 'Оценка' }, { id: 'c3', name: 'Прогноз' }],
  );
  const [rows, setRows] = useState(initial ? initial.rows.map((r) => ({ ...r })) : []);
  const [label, setLabel] = useState(initial?.label ?? '');
  const [indicatorRow, setIndicatorRow] = useState<NoteIndicatorRowKind>(initial?.indicatorRow ?? 'value');
  const [error, setError] = useState('');

  const sectionIndicators = state.indicators.filter((i) => i.directionId === sectionId && !i.isGroup);

  const addColumn = () => setColumns((cs) => [...cs, { id: `c${Date.now()}`, name: '' }]);
  const removeColumn = (id: string) => setColumns((cs) => cs.filter((c) => c.id !== id));
  const setColumnName = (id: string, name: string) => setColumns((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c)));

  const addRow = () => setRows((rs) => [...rs, { id: `r${Date.now()}`, name: '', kind: 'text' as NoteRowKind, subRowCount: 1, mergeColumns: true }]);
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const setRow = (id: string, patch: Partial<{ name: string; kind: NoteRowKind; subRowCount: number; mergeColumns: boolean }>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = () => {
    if (!sectionId || !indicatorId) { setError('Выберите раздел и показатель'); return; }
    if (columns.length === 0 || columns.some((c) => !c.name.trim())) { setError('Заполните названия всех столбцов'); return; }
    if (rows.some((r) => !r.name.trim() || r.subRowCount < 1)) { setError('Заполните названия строк (кол-во строк предприятий — не менее 1)'); return; }
    const template: NoteTemplate = {
      id: initial?.id ?? `nt${Date.now()}`,
      indicatorId,
      sectionId,
      columns,
      rows,
      indicatorRow,
      ...(label.trim() ? { label: label.trim() } : {}),
    };
    dispatch(isNew ? { type: 'NOTE_ADD_TEMPLATE', template } : { type: 'NOTE_UPDATE_TEMPLATE', template });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Новый показатель пояснительной записки' : 'Редактирование шаблона'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
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
            <label className="text-sm font-medium">Наименование показателя</label>
            <Select value={indicatorId} onValueChange={setIndicatorId}>
              <SelectTrigger><SelectValue placeholder="Выберите показатель из общего дерева" /></SelectTrigger>
              <SelectContent>
                {sectionIndicators.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.num} {i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Наименование в документе (необязательно)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="По умолчанию — имя показателя без префикса «Справочно:»"
              className="h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Строка показателя в документе</label>
            <Select value={indicatorRow} onValueChange={(v) => setIndicatorRow(v as NoteIndicatorRowKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="value">Значения (Отчёт / Оценка / Прогноз)</SelectItem>
                <SelectItem value="text">Текст (одна объединённая ячейка)</SelectItem>
                <SelectItem value="none">Без строки (таблица предприятий)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              <div className="mb-2 text-xs text-slate-400">Без строк — только строка показателя (вид зависит от «Строка показателя в документе»).</div>
            )}
            <div className="flex flex-col gap-2">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2">
                  <input
                    value={r.name}
                    onChange={(e) => setRow(r.id, { name: e.target.value })}
                    placeholder="Наименование строки"
                    className="h-9 min-w-[160px] flex-1 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={r.kind}
                    onChange={(e) => setRow(r.id, { kind: e.target.value as NoteRowKind })}
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    title="Тип строки"
                  >
                    <option value="value">Значения</option>
                    <option value="text">Текст</option>
                    <option value="enterprises">Предприятия</option>
                  </select>
                  {r.kind === 'text' && (
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={r.mergeColumns}
                        onChange={(e) => setRow(r.id, { mergeColumns: e.target.checked })}
                        className="h-4 w-4 accent-[#1e5c8f]"
                      />
                      Объединить столбцы
                    </label>
                  )}
                  {r.kind === 'enterprises' && (
                    <input
                      type="number"
                      min={1}
                      value={r.subRowCount}
                      onChange={(e) => setRow(r.id, { subRowCount: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-9 w-20 rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      title="Количество строк предприятий"
                    />
                  )}
                  <button type="button" title="Удалить строку" className="text-slate-400 hover:text-rose-600" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50" onClick={addRow}>
                <Plus className="mr-1 h-4 w-4" /> Добавить строку
              </Button>
            </div>
          </div>

          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-[#1e5c8f] text-white hover:bg-[#1e5c8f]/90" onClick={save}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}