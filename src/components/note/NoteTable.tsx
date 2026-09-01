import { Fragment } from 'react';
import type { NoteTemplate, NoteOmsuData, Direction, Indicator, NoteCellStatus } from '@/lib/types';
import { noteCellKey, noteTemplateName, noteRowCellSpans } from '@/lib/types';
import { NOTE_STATUS_META, NOTE_REPORTING_YEAR } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Undo2, PenLine } from 'lucide-react';

export type NoteMode = 'edit' | 'approve' | 'readonly';

interface NoteTableProps {
  templates: NoteTemplate[];
  directions: Direction[];
  indicators: Indicator[];
  mode: NoteMode;
  omsuData: Record<string, NoteOmsuData>; // templateId -> данные одной территории
  reportingYear?: number; // отчётный год документа (подпись над таблицей)
  onCellChange?: (templateId: string, cellKey: string, value: string) => void;
  onSendCell?: (templateId: string, cellKey: string) => void;      // ОМСУ: отправка ячейки на согласование (edit)
  onRecallCell?: (templateId: string, cellKey: string) => void;    // ОМСУ: отзыв ячейки (edit)
  onApproveCell?: (templateId: string, cellKey: string) => void;   // ЦИО: согласование ячейки (approve)
  onRevokeCell?: (templateId: string, cellKey: string) => void;    // ЦИО: отзыв согласования ячейки (approve)
  onReturnCell?: (templateId: string, cellKey: string) => void;    // ЦИО: возврат ячейки (approve)
  onUndoReturnCell?: (templateId: string, cellKey: string) => void; // ЦИО: отмена возврата ячейки (approve)
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

/**
 * Таблица пояснительной записки по форме выходного документа:
 * «Наименование показателя | Данные муниципальных образований».
 * Режимы: заполнение ОМСУ (edit), согласование ЦИО (approve), итоговый документ (readonly).
 */
export function NoteTable(props: NoteTableProps) {
  const { templates, directions, indicators, mode, omsuData, reportingYear = NOTE_REPORTING_YEAR } = props;
  const indById = new Map(indicators.map((i) => [i.id, i]));

  /** Поячеечные действия ОМСУ (режим edit): отправка / отзыв / статусы */
  const editControls = (t: NoteTemplate, key: string) => {
    const data = omsuData[t.id];
    const cst = data?.cellStatus[key];
    if (!cst) return null;
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
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Согласовано
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-5 gap-1 px-1.5 text-[10px] text-slate-600"
              title="Отозвать согласование — ячейка снова будет на согласовании"
              onClick={() => props.onRevokeCell?.(t.id, key)}
            >
              <Undo2 className="h-3 w-3" /> Отозвать
            </Button>
          </div>
        )}
        {cst === 'returned' && (
          <>
            <span className="text-[10px] leading-tight text-rose-600">Возвращено{comment ? `: ${comment}` : ''}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-5 gap-1 px-1.5 text-[10px] text-slate-600"
              title="Отменить возврат — комментарий будет удалён, ячейка снова будет на согласовании"
              onClick={() => props.onUndoReturnCell?.(t.id, key)}
            >
              <Undo2 className="h-3 w-3" /> Отменить возврат
            </Button>
          </>
        )}
      </div>
    );
  };

  /** Ячейка данных: значение (Input) или текст (Textarea);
   *  noApproval — ячейка вводится ОМСУ, но не участвует в согласовании ЦИО (напр., «Наименование предприятия») */
  const cell = (
    t: NoteTemplate,
    rowId: string,
    subIdx: number,
    colIdx: number,
    opts: { long?: boolean; center?: boolean; placeholder?: string; noApproval?: boolean } = {},
  ) => {
    const key = noteCellKey(rowId, subIdx, colIdx);
    const value = omsuData[t.id]?.cells[key] ?? '';
    const cst: NoteCellStatus | undefined = omsuData[t.id]?.cellStatus[key];
    const comment = omsuData[t.id]?.cellComments[key];
    const locked = !opts.noApproval && (cst === 'approved' || cst === 'pending_cio');
    if (mode !== 'edit') {
      // ЦИО видит только то, что ОМСУ отправил на согласование: черновик (не отправлен) скрыт
      const hidden = mode === 'approve' && !opts.noApproval && cst === 'draft';
      const shown = hidden ? '' : value;
      return (
        <div>
          <div className={`whitespace-pre-wrap px-2 py-1.5 text-xs text-slate-700 ${opts.center ? 'text-center' : ''}`}>
            {isFilled(shown) ? (
              shown
            ) : mode === 'readonly' && opts.placeholder ? (
              <span className="font-semibold text-slate-400">{opts.placeholder}</span>
            ) : mode === 'readonly' ? null : '—'}
          </div>
          {mode === 'approve' && !opts.noApproval && approveControls(t, key)}
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
        {!opts.noApproval && (
          <>
            {cst === 'returned' && comment && (
              <div className="whitespace-pre-wrap px-1 pt-1 text-[10px] leading-tight text-rose-600">
                Возвращено ЦИО: {comment}
              </div>
            )}
            {editControls(t, key)}
          </>
        )}
      </div>
    );
  };
  const renderTemplate = (t: NoteTemplate) => {
    const name = noteTemplateName(t, indById);
    const rows: React.ReactNode[] = [];

    const labelTd = (label: React.ReactNode, rowSpan?: number) => (
      <td rowSpan={rowSpan} className="w-[300px] border border-slate-300 px-2.5 py-1.5 align-top">{label}</td>
    );

    // Строка самого показателя: наименование + подшапка с названиями столбцов (постоянная)
    rows.push(
      <tr key="ind">
        {labelTd(<div className="text-xs font-semibold text-slate-800">{name}</div>)}
        {t.columns.map((c) => (
          <td key={c.id} className="border border-slate-300 bg-slate-50 px-2 py-1.5 text-center text-[11px] font-semibold text-slate-700">
            {c.name}
          </td>
        ))}
      </tr>,
    );

    // Дополнительные строки блока: у каждой строки N ячеек (поля ввода ОМСУ),
    // ячейки равномерно занимают все данные столбцы
    t.rows.forEach((r) => {
      const spans = noteRowCellSpans(t, r);
      rows.push(
        <tr key={r.id}>
          {labelTd(<div className="text-xs text-slate-700">{r.name}</div>)}
          {spans.map((span, i) => (
            <td key={i} colSpan={span} className="border border-slate-300 p-1 align-top">
              {cell(t, r.id, 0, i, { long: true })}
            </td>
          ))}
        </tr>,
      );
    });

    return <Fragment key={t.id}>{rows}</Fragment>;
  };

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-900">
        Отчетный год: {reportingYear}
      </div>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {directions.map((d) => {
            const tpls = templates.filter((t) => t.sectionId === d.id);
            if (tpls.length === 0) return null;
            const cols = Math.max(...tpls.map((t) => t.columns.length));
            return (
              <Fragment key={d.id}>
                <tr>
                  <td colSpan={1 + cols} className="bg-[#cfe0f4] px-3 py-1.5 text-xs font-bold text-slate-900">
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