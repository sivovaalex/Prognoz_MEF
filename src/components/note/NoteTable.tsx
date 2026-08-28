import { Fragment } from 'react';
import type { NoteTemplate, NoteOmsuData, NoteCioData, Direction, Indicator, NoteCellStatus } from '@/lib/types';
import { noteCellKey, noteTemplateName } from '@/lib/types';
import { NOTE_STATUS_META } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, CheckCircle2, Undo2, PenLine } from 'lucide-react';

export type NoteMode = 'edit' | 'approve' | 'readonly';

interface NoteTableProps {
  templates: NoteTemplate[];
  directions: Direction[];
  indicators: Indicator[];
  mode: NoteMode;
  omsuData: Record<string, NoteOmsuData>; // templateId -> данные одной территории
  cioData?: Record<string, NoteCioData>;  // templateId -> данные ЦИО (режим approve)
  onCellChange?: (templateId: string, cellKey: string, value: string) => void;
  onSendCell?: (templateId: string, cellKey: string) => void;      // ОМСУ: отправка ячейки на согласование (edit)
  onRecallCell?: (templateId: string, cellKey: string) => void;    // ОМСУ: отзыв ячейки (edit)
  onApproveCell?: (templateId: string, cellKey: string) => void;   // ЦИО: согласование ячейки (approve)
  onReturnCell?: (templateId: string, cellKey: string) => void;    // ЦИО: возврат ячейки (approve)
  onEditNote?: (templateId: string) => void;
}

export function NoteStatusBadge({ status }: { status: NoteOmsuData['status'] }) {
  const m = NOTE_STATUS_META[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

const isFilled = (v: string | undefined) => !!v && v.trim() !== '' && v.trim() !== '—';

/** Число строк таблицы в блоке шаблона (для rowSpan колонки «Примечание») */
const blockRowSpan = (t: NoteTemplate): number => {
  let n = t.indicatorRow !== 'none' ? 1 : 0;
  t.rows.forEach((r) => { n += r.kind === 'enterprises' ? 1 + r.subRowCount : 1; });
  return n;
};

/**
 * Таблица пояснительной записки по форме выходного документа:
 * «Наименование показателя | Данные муниципальных образований | Примечание: ЦИО/В».
 * Режимы: заполнение ОМСУ (edit), согласование ЦИО (approve), итоговый документ (readonly).
 */
export function NoteTable(props: NoteTableProps) {
  const { templates, directions, indicators, mode, omsuData, cioData } = props;
  const indById = new Map(indicators.map((i) => [i.id, i]));
  const showNoteCol = mode === 'approve' || mode === 'readonly';

  /** Поячеечные действия ОМСУ (режим edit): отправка / отзыв / статусы */
  const editControls = (t: NoteTemplate, key: string) => {
    const data = omsuData[t.id];
    const cst = data?.cellStatus[key];
    if (!cst) return null;
    const comment = data?.cellComments[key];
    return (
      <div className="flex flex-wrap items-center gap-1 px-1 pt-1">
        {(cst === 'draft' || cst === 'returned') && (
          <Button size="sm" variant="outline" className="h-5 gap-1 px-1.5 text-[10px] text-blue-700" onClick={() => props.onSendCell?.(t.id, key)}>
            <PenLine className="h-3 w-3" /> {cst === 'returned' ? 'Отправить снова' : 'Отправить'}
          </Button>
        )}
        {cst === 'pending_cio' && (
          <Button size="sm" variant="outline" className="h-5 gap-1 px-1.5 text-[10px]" onClick={() => props.onRecallCell?.(t.id, key)}>
            <Undo2 className="h-3 w-3" /> Отозвать
          </Button>
        )}
        {cst === 'approved' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Согласовано
          </span>
        )}
        {cst === 'returned' && comment && (
          <span className="w-full text-[10px] leading-tight text-rose-600">{comment}</span>
        )}
      </div>
    );
  };

  /** Поячеечные действия ЦИО (режим approve): согласование / возврат */
  const approveControls = (t: NoteTemplate, key: string) => {
    const data = omsuData[t.id];
    const cst = data?.cellStatus[key];
    if (!cst) return null;
    const comment = data?.cellComments[key];
    return (
      <div className="flex flex-col items-start gap-1 px-1 pt-1">
        {cst === 'pending_cio' && (
          <div className="flex flex-wrap gap-1">
            <Button size="sm" className="h-5 gap-1 bg-emerald-600 px-1.5 text-[10px] hover:bg-emerald-700" onClick={() => props.onApproveCell?.(t.id, key)}>
              <CheckCircle2 className="h-3 w-3" /> Согласовать
            </Button>
            <Button size="sm" variant="outline" className="h-5 gap-1 px-1.5 text-[10px] text-rose-700" onClick={() => props.onReturnCell?.(t.id, key)}>
              <Undo2 className="h-3 w-3" /> Вернуть
            </Button>
          </div>
        )}
        {cst === 'approved' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Согласовано
          </span>
        )}
        {cst === 'returned' && (
          <span className="text-[10px] leading-tight text-rose-600">Возвращено{comment ? `: ${comment}` : ''}</span>
        )}
        {cst === 'draft' && (
          <span className="text-[10px] text-slate-400">Не отправлена на согласование</span>
        )}
      </div>
    );
  };

  /** Ячейка данных: значение (Input) или текст (Textarea) */
  const cell = (
    t: NoteTemplate,
    rowId: string,
    subIdx: number,
    colIdx: number,
    opts: { long?: boolean; center?: boolean; placeholder?: string } = {},
  ) => {
    const key = noteCellKey(rowId, subIdx, colIdx);
    const value = omsuData[t.id]?.cells[key] ?? '';
    const cst: NoteCellStatus | undefined = omsuData[t.id]?.cellStatus[key];
    const locked = cst === 'approved' || cst === 'pending_cio';
    if (mode !== 'edit') {
      return (
        <div>
          <div className={`whitespace-pre-wrap px-2 py-1.5 text-xs text-slate-700 ${opts.center ? 'text-center' : ''}`}>
            {isFilled(value) ? (
              value
            ) : mode === 'readonly' && opts.placeholder ? (
              <span className="font-semibold text-slate-400">{opts.placeholder}</span>
            ) : mode === 'readonly' ? null : '—'}
          </div>
          {mode === 'approve' && approveControls(t, key)}
        </div>
      );
    }
    return (
      <div>
        {opts.long ? (
          <Textarea
            value={value}
            disabled={locked}
            rows={2}
            onChange={(e) => props.onCellChange?.(t.id, key, e.target.value)}
            className="min-h-[38px] w-full resize-y border-slate-300 px-2 py-1 text-xs focus:ring-1 disabled:bg-slate-50"
          />
        ) : (
          <Input
            value={value}
            disabled={locked}
            placeholder={opts.placeholder}
            onChange={(e) => props.onCellChange?.(t.id, key, e.target.value)}
            className={`h-8 w-full border-slate-300 px-2 text-xs disabled:bg-slate-50 ${opts.center ? 'text-center' : ''}`}
          />
        )}
        {editControls(t, key)}
      </div>
    );
  };
  /** Колонка «Примечание: ЦИО/В» (режимы approve/readonly) */
  const noteCell = (t: NoteTemplate) => {
    const data = omsuData[t.id];
    const cio = cioData?.[t.id];
    const sts = Object.values(data?.cellStatus ?? {});
    const approved = sts.filter((s) => s === 'approved').length;
    const pending = sts.filter((s) => s === 'pending_cio').length;
    const returned = sts.filter((s) => s === 'returned').length;
    if (mode === 'readonly') {
      const allApproved = sts.length > 0 && sts.every((s) => s === 'approved');
      if (allApproved) return <div className="px-2 text-center text-xs font-semibold text-slate-800">СОГЛАСОВАНО</div>;
      if (cio?.note) return <div className="whitespace-pre-wrap px-2 text-[11px] text-slate-600">{cio.note}</div>;
      return null;
    }
    return (
      <div className="flex flex-col items-start gap-1">
        {sts.length > 0 && (
          <div className="flex flex-col gap-0.5 text-[11px] font-medium">
            <span className="text-emerald-700">{approved} согласовано</span>
            {pending > 0 && <span className="text-amber-700">{pending} на проверке</span>}
            {returned > 0 && <span className="text-rose-700">{returned} возвращено</span>}
          </div>
        )}
        {cio?.note && <div className="whitespace-pre-wrap text-[11px] text-slate-600">{cio.note}</div>}
        <button type="button" className="text-slate-400 hover:text-blue-700" title="Примечание ЦИО" onClick={() => props.onEditNote?.(t.id)}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };
  const renderTemplate = (t: NoteTemplate) => {
    const span = blockRowSpan(t);
    const name = noteTemplateName(t, indById);
    const data = omsuData[t.id];
    const status = data?.status ?? 'not_filled';
    const sts = Object.values(data?.cellStatus ?? {});
    const approvedCount = sts.filter((s) => s === 'approved').length;
    const rows: React.ReactNode[] = [];

    const labelTd = (label: React.ReactNode) => (
      <td className="w-[300px] border border-slate-300 px-2.5 py-1.5 align-top">{label}</td>
    );
    const noteTd = (
      <td rowSpan={span} className="w-36 border border-slate-300 px-1.5 py-1.5 align-middle">
        {noteCell(t)}
      </td>
    );

    // Строка самого показателя
    if (t.indicatorRow === 'value') {
      rows.push(
        <tr key="ind">
          {labelTd(
            <div>
              <div className="text-xs font-semibold text-slate-800">{name}</div>
              {mode === 'edit' && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <NoteStatusBadge status={status} />
                  {sts.length > 0 && (
                    <span className="text-[10px] text-slate-500">Ячейки: {approvedCount}/{sts.length} согл.</span>
                  )}
                </div>
              )}
            </div>,
          )}
          {t.columns.map((c, ci) => (
            <td key={c.id} className="border border-slate-300 p-1 align-top">
              {cell(t, 'ind', 0, ci, { center: true, placeholder: c.name })}
            </td>
          ))}
          {showNoteCol && noteTd}
        </tr>,
      );
    } else if (t.indicatorRow === 'text') {
      rows.push(
        <tr key="ind">
          {labelTd(<div className="text-xs font-semibold text-slate-800">{name}</div>)}
          <td colSpan={t.columns.length} className="border border-slate-300 p-1 align-top">
            {cell(t, 'ind', 0, 0, { long: true })}
          </td>
          {showNoteCol && noteTd}
        </tr>,
      );
    } else {
      // Таблица предприятий: подшапка с названиями столбцов
      rows.push(
        <tr key="ind">
          {labelTd(<div className="text-xs font-semibold text-slate-800">{name}</div>)}
          {t.columns.map((c) => (
            <td key={c.id} className="border border-slate-300 bg-slate-50 px-2 py-1.5 text-center text-[11px] font-semibold text-slate-700">
              {c.name}
            </td>
          ))}
          {showNoteCol && noteTd}
        </tr>,
      );
    }

    // Дополнительные строки блока
    t.rows.forEach((r) => {
      if (r.kind === 'enterprises') {
        // Строка-группа (вид производства) + строки предприятий
        rows.push(
          <tr key={`g-${r.id}`}>
            <td className="border border-slate-300" />
            <td className="border border-slate-300 bg-slate-50/70 px-2.5 py-1 text-xs font-semibold text-slate-800">{r.name}</td>
            {t.columns.slice(1).map((c) => (
              <td key={c.id} className="border border-slate-300" />
            ))}
          </tr>,
        );
        for (let s = 0; s < r.subRowCount; s++) {
          rows.push(
            <tr key={`e-${r.id}-${s}`}>
              <td className="border border-slate-300" />
              {t.columns.map((c, ci) => (
                <td key={c.id} className="border border-slate-300 p-1 align-top">
                  {cell(t, r.id, s, ci, { long: ci !== 0 })}
                </td>
              ))}
            </tr>,
          );
        }
      } else if (r.kind === 'text' && r.mergeColumns) {
        rows.push(
          <tr key={r.id}>
            {labelTd(<div className="text-xs text-slate-700">{r.name}</div>)}
            <td colSpan={t.columns.length} className="border border-slate-300 p-1 align-top">
              {cell(t, r.id, 0, 0, { long: true })}
            </td>
          </tr>,
        );
      } else {
        // value-строка (Отчёт/Оценка/Прогноз) или текст по столбцам
        rows.push(
          <tr key={r.id}>
            {labelTd(<div className="text-xs text-slate-700">{r.name}</div>)}
            {t.columns.map((c, ci) => (
              <td key={c.id} className="border border-slate-300 p-1 align-top">
                {cell(t, r.id, 0, ci, {
                  long: r.kind === 'text',
                  center: r.kind === 'value',
                  placeholder: r.kind === 'value' ? c.name : undefined,
                })}
              </td>
            ))}
          </tr>,
        );
      }
    });

    return <Fragment key={t.id}>{rows}</Fragment>;
  };

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {directions.map((d) => {
            const tpls = templates.filter((t) => t.sectionId === d.id);
            if (tpls.length === 0) return null;
            const cols = Math.max(...tpls.map((t) => t.columns.length));
            return (
              <Fragment key={d.id}>
                <tr>
                  <td colSpan={1 + cols + (showNoteCol ? 1 : 0)} className="bg-[#cfe0f4] px-3 py-1.5 text-xs font-bold text-slate-900">
                    {d.name}
                  </td>
                </tr>
                <tr>
                  <td className="w-[300px] border border-slate-300 bg-slate-50 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-600">
                    Наименование показателя
                  </td>
                  <td colSpan={cols} className="border border-slate-300 bg-slate-50 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-600">
                    Данные муниципальных образований
                  </td>
                  {showNoteCol && (
                    <td className="w-36 border border-slate-300 bg-slate-50 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-600">
                      Примечание: ЦИО/В
                    </td>
                  )}
                </tr>
                {tpls.map(renderTemplate)}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}