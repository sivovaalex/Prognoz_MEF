import { Fragment, useState } from 'react';
import type { NoteTemplate, NoteOmsuData, Direction, Indicator } from '@/lib/types';
import { noteCellKey, noteTemplateName, noteRowCellSpans, noteTemplateCellKeys, isNoteCellFilled } from '@/lib/types';
import { NOTE_STATUS_META, NOTE_REPORTING_YEAR } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Undo2, PenLine, Flag, ShieldCheck, AlertCircle, MessageSquare, RotateCcw,
} from 'lucide-react';

export type NoteMode = 'edit' | 'approve' | 'readonly';

export interface NoteTableProps {
  templates: NoteTemplate[];
  directions: Direction[];
  indicators: Indicator[];
  mode: NoteMode;
  omsuData: Record<string, NoteOmsuData>; // templateId -> данные одной территории
  reportingYear?: number; // отчётный год документа (подпись над таблицей)
  onCellChange?: (templateId: string, cellKey: string, value: string) => void;
  onSendCell?: (templateId: string, cellKey: string) => void;         // ОМСУ: отправка ячейки на согласование
  onSendBlock?: (templateId: string, cellKeys: string[]) => void;     // ОМСУ: отправка всех ячеек блока
  onRecallCell?: (templateId: string, cellKey: string) => void;       // ОМСУ: отзыв ячейки
  onAgreeCell?: (templateId: string, cellKey: string, comment?: string) => void;      // ЦИО: согласование (пишет «Согласовано»)
  onAgreeBlock?: (templateId: string, cellKeys: string[]) => void;                    // ЦИО: согласование всего блока
  onReturnCell?: (templateId: string, cellKey: string, comment: string) => void;      // ЦИО: возврат с замечаниями
  onUndoReturnCell?: (templateId: string, cellKey: string) => void;                   // ЦИО: отмена возврата
  onOmsuApproveCell?: (templateId: string, cellKey: string) => void;  // ОМСУ: утверждение ячейки (зелёный флажок)
  onOmsuApproveBlock?: (templateId: string, cellKeys: string[]) => void;// ОМСУ: утверждение блока (зелёные флажки)
  onCioApproveCell?: (templateId: string, cellKey: string) => void;   // ЦИО: утверждение ячейки (синий флажок)
  onCioApproveBlock?: (templateId: string, cellKeys: string[]) => void;// ЦИО: утверждение блока (синие флажки)
  onRevokeCell?: (templateId: string, cellKey: string, target?: 'cio' | 'all') => void; // ЦИО: снять утверждение (только вышестоящий уровень!)
  onRevokeBlock?: (templateId: string, cellKeys: string[]) => void;   // ЦИО: снять утверждение блока
}

export function NoteStatusBadge({ status }: { status: NoteOmsuData['status'] }) {
  const m = NOTE_STATUS_META[status] || NOTE_STATUS_META.not_filled;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

/**
 * Таблица пояснительной записки с поддержкой:
 * 1. Редактирование и отправка на согласование (ОМСУ)
 * 2. Согласование ответственным лицом ЦИО/МЭФ («Согласовано» или замечания в поле комментарий)
 * 3. Контроль на пустые ячейки (пустых ячеек быть не должно!)
 * 4. Утверждение нижестоящим уровнем (ОМСУ) — зелёные флажки 🟢 (по ячейкам и блокам)
 * 5. Контроль и утверждение вышестоящим уровнем (ЦИО/МЭФ) — синие флажки 🔵 (по ячейкам и блокам)
 * 6. Снятие утверждения (только ответственное лицо вышестоящего уровня!)
 * 7. Выходные таблицы: отображаются только ячейки с синими флажками; без синего флажка ячейка пустая!
 */
export function NoteTable(props: NoteTableProps) {
  const { templates, directions, indicators, mode, omsuData, reportingYear = NOTE_REPORTING_YEAR } = props;
  const indById = new Map(indicators.map((i) => [i.id, i]));

  // Хранит состояние запуска проверки на пустые ячейки для шаблонов: templateId -> boolean
  const [checkedBlocks, setCheckedBlocks] = useState<Record<string, boolean>>({});

  /** Контроль блока на пустые ячейки */
  const runBlockControl = (templateId: string) => {
    setCheckedBlocks((prev) => ({ ...prev, [templateId]: true }));
  };

  /** Анализ состояния ячеек шаблона */
  const getTemplateStats = (t: NoteTemplate) => {
    const data = omsuData[t.id];
    const keys = noteTemplateCellKeys(t);
    const cells = data?.cells || {};
    const cellStatus = data?.cellStatus || {};
    const cellComments = data?.cellComments || {};
    const omsuApproved = data?.omsuApproved || {};
    const cioApproved = data?.cioApproved || {};

    const total = keys.length;
    const filledKeys = keys.filter((k) => isNoteCellFilled(cells[k]));
    const emptyKeys = keys.filter((k) => !isNoteCellFilled(cells[k]));
    const isAllFilled = total > 0 && emptyKeys.length === 0;

    // Согласованные ячейки (статус agreed/approved или комментарий содержит «Согласовано»)
    const agreedKeys = keys.filter(
      (k) =>
        isNoteCellFilled(cells[k]) &&
        (cellStatus[k] === 'agreed' || cellStatus[k] === 'approved' || cellComments[k]?.includes('Согласовано')),
    );

    // Ячейки на согласовании у ЦИО
    const pendingKeys = keys.filter((k) => cellStatus[k] === 'pending_cio');

    // Ячейки с зелёными флажками (ОМСУ утверждено)
    const greenKeys = keys.filter((k) => !!omsuApproved[k]);

    // Ячейки с синими флажками (ЦИО/МЭФ утверждено)
    const blueKeys = keys.filter((k) => !!cioApproved[k]);

    // Ячейки, готовые к утверждению ОМСУ (зеленый флажок): согласованы, заполнены, но еще без зеленого флажка
    const readyForOmsuApprovalKeys = agreedKeys.filter((k) => !omsuApproved[k]);

    // Ячейки, готовые к утверждению ЦИО (синий флажок): с зеленым флажком, но еще без синего
    const readyForCioApprovalKeys = greenKeys.filter((k) => !cioApproved[k]);

    return {
      total,
      filledCount: filledKeys.length,
      emptyKeys,
      isAllFilled,
      agreedKeys,
      pendingKeys,
      greenKeys,
      blueKeys,
      readyForOmsuApprovalKeys,
      readyForCioApprovalKeys,
    };
  };

  /** Поячеечные действия ОМСУ (режим edit) */
  const renderOmsuCellControls = (t: NoteTemplate, key: string) => {
    const data = omsuData[t.id];
    const value = data?.cells[key] ?? '';
    const cst = data?.cellStatus[key];
    const comment = data?.cellComments[key];
    const isGreen = !!data?.omsuApproved?.[key];
    const isBlue = !!data?.cioApproved?.[key];
    const filled = isNoteCellFilled(value);
    const isAgreed = cst === 'agreed' || cst === 'approved' || comment?.includes('Согласовано');

    return (
      <div className="flex flex-col gap-1 px-1 pt-1.5 border-t border-slate-100 mt-1">
        {/* Индикатор статуса согласования и комментарий */}
        <div className="flex items-center justify-between gap-1 text-[11px]">
          {isBlue ? (
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
              <Flag className="h-3 w-3 fill-blue-600 text-blue-600" /> Синий флажок (Утверждено ЦИО/МЭФ)
            </span>
          ) : isGreen ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              <Flag className="h-3 w-3 fill-emerald-600 text-emerald-600" /> Зелёный флажок (Утверждено ОМСУ)
            </span>
          ) : isAgreed ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5">
              <CheckCircle2 className="h-3 w-3 text-teal-600" /> Согласовано ЦИО
            </span>
          ) : cst === 'pending_cio' ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              <MessageSquare className="h-3 w-3 text-amber-600" /> На согласовании ЦИО
            </span>
          ) : cst === 'returned' ? (
            <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
              <AlertCircle className="h-3 w-3 text-rose-600" /> Замечания ЦИО
            </span>
          ) : (
            <span className="text-slate-500 text-[10px]">Черновик</span>
          )}
        </div>

        {/* Текст комментария ЦИО при наличии */}
        {comment && (
          <div
            className={`rounded px-1.5 py-0.5 text-[10px] leading-tight ${
              comment.includes('Согласовано')
                ? 'bg-teal-50 text-teal-800 border border-teal-100'
                : 'bg-rose-50 text-rose-800 border border-rose-200 font-medium'
            }`}
          >
            {comment.includes('Согласовано') ? 'Комментарий ЦИО: ' : 'Замечание ЦИО: '}
            {comment}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {/* Отправка на согласование */}
          {(!cst || cst === 'draft' || cst === 'returned') && !isGreen && (
            <Button
              size="sm"
              variant="outline"
              disabled={!filled}
              className="h-6 gap-1 px-2 text-[10px] text-blue-700 border-blue-200 hover:bg-blue-50 disabled:opacity-50"
              title={!filled ? 'Заполните текст перед отправкой' : 'Направить на согласование ЦИО'}
              onClick={() => props.onSendCell?.(t.id, key)}
            >
              <PenLine className="h-3 w-3" /> {cst === 'returned' ? 'Отправить повторно' : 'На согласование'}
            </Button>
          )}

          {/* Отзыв с согласования */}
          {cst === 'pending_cio' && !isGreen && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-[10px] text-slate-600"
              onClick={() => props.onRecallCell?.(t.id, key)}
            >
              <Undo2 className="h-3 w-3" /> Отозвать
            </Button>
          )}

          {/* Утверждение данных ОМСУ (зелёный флажок) — активируется ("загорается") после согласования */}
          {isAgreed && !isGreen && (
            <Button
              size="sm"
              disabled={!filled}
              className="h-6 gap-1.5 px-2.5 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300 disabled:opacity-50"
              title={!filled ? 'Пустая ячейка! Заполните текст' : 'Утвердить данные (проставить зелёный флажок)'}
              onClick={() => props.onOmsuApproveCell?.(t.id, key)}
            >
              <Flag className="h-3 w-3 fill-white text-white" /> Утвердить ячейку 🟢
            </Button>
          )}

          {/* Важно: если утверждение уже проставлено, ОМСУ не может его снять */}
          {isGreen && (
            <span className="text-[10px] text-emerald-800 italic" title="Снять утверждение может только ответственное лицо вышестоящего уровня">
              Утверждено ОМСУ (фиксация)
            </span>
          )}
        </div>
      </div>
    );
  };

  /** Поячеечные действия ЦИО/МЭФ (режим approve) */
  const renderCioCellControls = (t: NoteTemplate, key: string) => {
    const data = omsuData[t.id];
    const value = data?.cells[key] ?? '';
    const cst = data?.cellStatus[key];
    const comment = data?.cellComments[key];
    const isGreen = !!data?.omsuApproved?.[key];
    const isBlue = !!data?.cioApproved?.[key];
    const filled = isNoteCellFilled(value);

    return (
      <div className="flex flex-col gap-1 px-1 pt-1.5 border-t border-slate-100 mt-1">
        {/* Индикатор текущего состояния */}
        <div className="flex items-center justify-between gap-1 text-[11px]">
          {isBlue ? (
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
              <Flag className="h-3 w-3 fill-blue-600 text-blue-600" /> Синий флажок (Допущено к выгрузке)
            </span>
          ) : isGreen ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              <Flag className="h-3 w-3 fill-emerald-600 text-emerald-600" /> Зелёный флажок ОМСУ (Готово к утверждению)
            </span>
          ) : cst === 'agreed' || cst === 'approved' || comment?.includes('Согласовано') ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5">
              <CheckCircle2 className="h-3 w-3 text-teal-600" /> Согласовано ЦИО
            </span>
          ) : cst === 'pending_cio' ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              <MessageSquare className="h-3 w-3 text-amber-600" /> Ожидает согласования
            </span>
          ) : cst === 'returned' ? (
            <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
              <AlertCircle className="h-3 w-3 text-rose-600" /> Возвращено с замечаниями
            </span>
          ) : (
            <span className="text-slate-400 text-[10px]">Черновик ОМСУ</span>
          )}
        </div>

        {/* Отображение комментария */}
        {comment && (
          <div
            className={`rounded px-1.5 py-0.5 text-[10px] leading-tight ${
              comment.includes('Согласовано')
                ? 'bg-teal-50 text-teal-800 border border-teal-100 font-medium'
                : 'bg-rose-50 text-rose-800 border border-rose-200 font-medium'
            }`}
          >
            {comment.includes('Согласовано') ? 'Поле комментарий: ' : 'Замечание: '}
            {comment}
          </div>
        )}

        {/* Кнопки действий ЦИО */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {/* Согласование (написать «Согласовано») или возврат с замечаниями */}
          {cst === 'pending_cio' && !isBlue && (
            <>
              <Button
                size="sm"
                className="h-6 gap-1 bg-teal-600 px-2 text-[10px] font-medium text-white hover:bg-teal-700"
                title="Согласовать ячейку (в комментарий вносится «Согласовано»)"
                onClick={() => props.onAgreeCell?.(t.id, key, 'Согласовано')}
              >
                <CheckCircle2 className="h-3 w-3" /> Согласовано
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 text-[10px] text-rose-700 border-rose-200 hover:bg-rose-50"
                title="Внести замечания в поле комментарий"
                onClick={() => {
                  const remark = window.prompt('Введите текстовое замечание к ячейке:');
                  if (remark && remark.trim()) {
                    props.onReturnCell?.(t.id, key, remark.trim());
                  }
                }}
              >
                <AlertCircle className="h-3 w-3" /> Замечание
              </Button>
            </>
          )}

          {/* Контроль и утверждение вышестоящего уровня (синий флажок 🔵) */}
          {isGreen && !isBlue && (
            <Button
              size="sm"
              disabled={!filled}
              className="h-6 gap-1.5 px-2.5 text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-2 ring-blue-300"
              title="Утвердить данные ЦИО/МЭФ (проставить синий флажок). Данные будут допущены к выгрузке."
              onClick={() => props.onCioApproveCell?.(t.id, key)}
            >
              <Flag className="h-3 w-3 fill-white text-white" /> Утвердить (синий флажок 🔵)
            </Button>
          )}

          {/* Снять утверждение — доступно ТОЛЬКО вышестоящему уровню! */}
          {isBlue && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-[10px] text-slate-700 border-slate-300 hover:bg-slate-100"
              title="Снять утверждение (удалить синий флажок)"
              onClick={() => {
                if (window.confirm('Снять утверждение с данной ячейки?')) {
                  props.onRevokeCell?.(t.id, key, 'cio');
                }
              }}
            >
              <RotateCcw className="h-3 w-3 text-slate-600" /> Снять утверждение
            </Button>
          )}

          {/* Если утверждено только ОМСУ, ЦИО также может снять утверждение ОМСУ при необходимости */}
          {isGreen && !isBlue && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-rose-700"
              title="Снять утверждение ОМСУ (вернуть на этап заполнения)"
              onClick={() => {
                if (window.confirm('Снять зелёный флажок ОМСУ и вернуть ячейку на доработку?')) {
                  props.onRevokeCell?.(t.id, key, 'all');
                }
              }}
            >
              <RotateCcw className="h-3 w-3 mr-0.5" /> Снять утверждение ОМСУ
            </Button>
          )}

          {/* Отмена возврата с замечанием */}
          {cst === 'returned' && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-[10px] text-slate-600"
              onClick={() => props.onUndoReturnCell?.(t.id, key)}
            >
              <Undo2 className="h-3 w-3" /> Отменить замечание
            </Button>
          )}
        </div>
      </div>
    );
  };

  /** Отрисовка ячейки данных */
  const renderCell = (
    t: NoteTemplate,
    rowId: string,
    subIdx: number,
    colIdx: number,
    opts: { long?: boolean; center?: boolean; placeholder?: string; noApproval?: boolean } = {},
  ) => {
    const key = noteCellKey(rowId, subIdx, colIdx);
    const value = omsuData[t.id]?.cells[key] ?? '';
    const isGreen = !!omsuData[t.id]?.omsuApproved?.[key];
    const isBlue = !!omsuData[t.id]?.cioApproved?.[key];

    // Требование 8 для выходных таблиц (mode === 'readonly'):
    // Информация допускается к выгрузке, когда ячейки утверждены синими флажками.
    // Если синий флажок не стоит, ячейка пустая и текст не отображается!
    if (mode === 'readonly') {
      const hasBlue = isBlue;
      const textToDisplay = hasBlue ? value : '';

      return (
        <div className="p-1 min-h-[36px] flex flex-col justify-center">
          {hasBlue && isNoteCellFilled(textToDisplay) ? (
            <div className="whitespace-pre-wrap text-xs text-slate-800 leading-relaxed">
              {textToDisplay}
            </div>
          ) : (
            <div
              className="text-center text-[11px] text-slate-400 italic bg-slate-50/70 border border-dashed border-slate-200 rounded py-2 px-1"
              title="Ячейка не отображается: отсутствует утверждение синим флажком ответственного лица ЦИО/МЭФ"
            >
              [Данные не утверждены синим флажком]
            </div>
          )}
        </div>
      );
    }

    // Режим согласования ЦИО (mode === 'approve')
    if (mode === 'approve') {
      return (
        <div className="p-1 min-h-[44px]">
          <div className="whitespace-pre-wrap px-2 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded min-h-[34px]">
            {isNoteCellFilled(value) ? value : <span className="text-slate-400 italic">Ячейка не заполнена ОМСУ</span>}
          </div>
          {!opts.noApproval && renderCioCellControls(t, key)}
        </div>
      );
    }

    // Режим ввода ОМСУ (mode === 'edit'):
    // Все доступные ячейки открыты для внесения данных/редактирования.
    // Если утверждено (зеленый флажок или синий флажок), редактирование фиксируется (снять может только ЦИО).
    const isLocked = isGreen || isBlue;

    return (
      <div className="p-1">
        {opts.long ? (
          <Textarea
            value={value}
            disabled={isLocked}
            rows={2}
            placeholder="Введите текст пояснительной записки..."
            onChange={(e) => props.onCellChange?.(t.id, key, e.target.value)}
            className={`min-h-[42px] w-full resize-y border-slate-300 px-2.5 py-1.5 text-xs focus:ring-1 ${
              isLocked ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        ) : (
          <Input
            value={value}
            disabled={isLocked}
            placeholder={opts.placeholder || 'Введите значение...'}
            onChange={(e) => props.onCellChange?.(t.id, key, e.target.value)}
            className={`h-8 w-full border-slate-300 px-2 text-xs ${
              isLocked ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : 'bg-white'
            } ${opts.center ? 'text-center' : ''}`}
          />
        )}
        {!opts.noApproval && renderOmsuCellControls(t, key)}
      </div>
    );
  };

  /** Отрисовка шаблона показателя и панели контроля/утверждения блока */
  const renderTemplate = (t: NoteTemplate) => {
    const name = noteTemplateName(t, indById);
    const stats = getTemplateStats(t);
    const isControlRun = !!checkedBlocks[t.id];
    const rows: React.ReactNode[] = [];

    const labelTd = (label: React.ReactNode, rowSpan?: number) => (
      <td rowSpan={rowSpan} className="w-[320px] border border-slate-300 px-3 py-2 align-top bg-white">
        {label}
      </td>
    );

    // Панель управления блоком (в режимах edit и approve)
    const blockControlHeader = (
      <div className="mt-1 flex flex-col gap-1.5 border-t border-slate-200 pt-2 text-[11px]">
        {/* Индикаторы статуса блока */}
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">Блок данных:</span>
            <span
              className={`rounded px-1.5 py-0.2 font-semibold ${
                stats.blueKeys.length === stats.total && stats.total > 0
                  ? 'bg-blue-100 text-blue-800'
                  : stats.greenKeys.length === stats.total && stats.total > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : stats.agreedKeys.length === stats.total && stats.total > 0
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {stats.blueKeys.length === stats.total && stats.total > 0
                ? '🔵 Полностью утверждён ЦИО'
                : stats.greenKeys.length === stats.total && stats.total > 0
                ? '🟢 Утверждён ОМСУ (зелёные флажки)'
                : stats.agreedKeys.length === stats.total && stats.total > 0
                ? 'Согласован ЦИО'
                : `Заполнено: ${stats.filledCount} из ${stats.total}`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>🟢 ОМСУ: {stats.greenKeys.length}/{stats.total}</span>
            <span>🔵 ЦИО: {stats.blueKeys.length}/{stats.total}</span>
          </div>
        </div>

        {/* Результат проверки на пустые ячейки при клике на Контроль */}
        {isControlRun && (
          <div
            className={`rounded p-1.5 text-[11px] flex items-start gap-1.5 leading-snug ${
              stats.isAllFilled
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200 font-medium'
            }`}
          >
            {stats.isAllFilled ? (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-800">Контроль на пустые ячейки пройден успешно!</div>
                  <div>Все ячейки блока ({stats.total} шт.) заполнены. Возможность «Утвердить данные» активна.</div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-800">
                    Контроль не пройден: обнаружены пустые ячейки ({stats.emptyKeys.length} из {stats.total})!
                  </div>
                  <div>В соответствии с регламентом пустых ячеек быть не должно. Заполните все поля блока.</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Кнопки управления блоком в режиме edit (ОМСУ) */}
        {mode === 'edit' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {/* Кнопка контроля на пустые ячейки */}
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-[10px] text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
              onClick={() => runBlockControl(t.id)}
            >
              <ShieldCheck className="h-3 w-3 text-blue-600" /> Контроль на пустые ячейки
            </Button>

            {/* Отправить весь блок на согласование */}
            {stats.filledCount > 0 && stats.greenKeys.length < stats.total && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 text-[10px] text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100"
                onClick={() => {
                  const allKeys = noteTemplateCellKeys(t);
                  props.onSendBlock?.(t.id, allKeys);
                }}
              >
                <PenLine className="h-3 w-3" /> Направить блок на согласование
              </Button>
            )}

            {/* Кнопка "Утвердить данные (блок)" — "загорается" (активируется), если контроль пройден */}
            <Button
              size="sm"
              disabled={!stats.isAllFilled || stats.readyForOmsuApprovalKeys.length === 0}
              className={`h-6 gap-1 px-2.5 text-[10px] font-semibold text-white transition-all ${
                stats.isAllFilled && stats.readyForOmsuApprovalKeys.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 shadow animate-pulse'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
              }`}
              title={
                !stats.isAllFilled
                  ? 'Контроль на пустые ячейки не пройден (пустых ячеек быть не должно!)'
                  : stats.readyForOmsuApprovalKeys.length === 0
                  ? 'Нет согласованных ячеек для утверждения'
                  : 'Утвердить данные блока (проставить зелёные флажки 🟢)'
              }
              onClick={() => {
                props.onOmsuApproveBlock?.(t.id, stats.readyForOmsuApprovalKeys);
              }}
            >
              <Flag className="h-3 w-3 fill-white text-white" /> Утвердить блок 🟢
            </Button>
          </div>
        )}

        {/* Кнопки управления блоком в режиме approve (ЦИО) */}
        {mode === 'approve' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {/* Согласовать весь блок */}
            {stats.pendingKeys.length > 0 && (
              <Button
                size="sm"
                className="h-6 gap-1 bg-teal-600 hover:bg-teal-700 text-white px-2 text-[10px] font-medium"
                title="Согласовать все ячейки блока на согласовании (внести «Согласовано»)"
                onClick={() => props.onAgreeBlock?.(t.id, stats.pendingKeys)}
              >
                <CheckCircle2 className="h-3 w-3" /> Согласовать весь блок
              </Button>
            )}

            {/* Контроль и утверждение блока ЦИО (синие флажки) */}
            <Button
              size="sm"
              disabled={stats.readyForCioApprovalKeys.length === 0}
              className={`h-6 gap-1 px-2.5 text-[10px] font-semibold text-white ${
                stats.readyForCioApprovalKeys.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300 shadow'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
              }`}
              title={
                stats.readyForCioApprovalKeys.length === 0
                  ? 'Для утверждения ЦИО требуется предварительное утверждение ОМСУ (зелёные флажки)'
                  : 'Утвердить блок ЦИО/МЭФ (проставить синие флажки 🔵)'
              }
              onClick={() => props.onCioApproveBlock?.(t.id, stats.readyForCioApprovalKeys)}
            >
              <Flag className="h-3 w-3 fill-white text-white" /> Утвердить блок (синие флажки 🔵)
            </Button>

            {/* Снять утверждение блока — доступно только ЦИО */}
            {stats.blueKeys.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 text-[10px] text-slate-700 border-slate-300 hover:bg-slate-100"
                onClick={() => {
                  if (window.confirm('Снять синие флажки утверждения со всех ячеек блока?')) {
                    props.onRevokeBlock?.(t.id, stats.blueKeys);
                  }
                }}
              >
                <RotateCcw className="h-3 w-3 text-slate-600" /> Снять утверждение блока
              </Button>
            )}
          </div>
        )}
      </div>
    );

    // Строка заголовка показателя
    rows.push(
      <tr key="ind" className="border-t border-slate-300">
        {labelTd(
          <div>
            <div className="text-xs font-semibold text-slate-900">{name}</div>
            {mode !== 'readonly' && blockControlHeader}
          </div>,
        )}
        {t.columns.map((c) => (
          <td
            key={c.id}
            className="border border-slate-300 bg-slate-100/80 px-2 py-1.5 text-center text-[11px] font-semibold text-slate-700"
          >
            {c.name}
          </td>
        ))}
      </tr>,
    );

    // Дополнительные строки блока
    t.rows.forEach((r) => {
      const spans = noteRowCellSpans(t, r);
      rows.push(
        <tr key={r.id}>
          {labelTd(<div className="text-xs text-slate-700">{r.name}</div>)}
          {spans.map((span, i) => (
            <td key={i} colSpan={span} className="border border-slate-300 p-1 align-top bg-white">
              {renderCell(t, r.id, 0, i, { long: true })}
            </td>
          ))}
        </tr>,
      );
    });

    return <Fragment key={t.id}>{rows}</Fragment>;
  };

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-800">
          Форма пояснительной записки · Отчетный год: <span className="text-blue-700">{reportingYear}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Зелёный флажок — Утверждено ОМСУ
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" /> Синий флажок — Утверждено ЦИО/МЭФ (допуск к выгрузке)
          </span>
        </div>
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
                  <td colSpan={1 + cols} className="bg-[#cfe0f4] px-3 py-1.5 text-xs font-bold text-slate-900 border-t border-b border-blue-200">
                    {d.name}
                  </td>
                </tr>
                <tr>
                  <td className="w-[320px] border border-slate-300 bg-slate-100 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-600">
                    Наименование показателя
                  </td>
                  <td colSpan={cols} className="border border-slate-300 bg-slate-100 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-600">
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
