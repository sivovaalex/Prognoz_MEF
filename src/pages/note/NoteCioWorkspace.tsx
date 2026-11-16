import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { CURRENT_CIO } from '@/lib/data';
import { NoteTable } from '@/components/note/NoteTable';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { noteTemplateCellKeys, isNoteCellFilled } from '@/lib/types';
import { Flag, ShieldCheck } from 'lucide-react';

export function NoteCioWorkspace() {
  const { state, dispatch } = useStore();
  const cio = state.cios.find((c) => c.id === CURRENT_CIO) || state.cios[0];
  const active = state.noteTemplates.filter((t) => t.isActive);
  const muns = state.omsus.filter((m) => m.isActive !== false);
  const [munId, setMunId] = useState(muns[0]?.id ?? '');
  const [returnTarget, setReturnTarget] = useState<{ tplId: string; cellKey: string } | null>(null);
  const [comment, setComment] = useState('');

  const munData = state.noteOmsuValues[munId] ?? {};
  const selectedMun = muns.find((m) => m.id === munId);
  const deadline = state.noteCampaign.deadlineCio.split('-').reverse().join('.');

  // Статистика согласования и утверждения по выбранной территории
  const stats = useMemo(() => {
    let totalCells = 0;
    let filledCells = 0;
    let agreedCells = 0;
    let pendingCells = 0;
    let greenCells = 0;
    let blueCells = 0;

    active.forEach((t) => {
      const keys = noteTemplateCellKeys(t);
      const data = munData[t.id];
      const cells = data?.cells || {};
      const cst = data?.cellStatus || {};
      const comments = data?.cellComments || {};
      const omsuApp = data?.omsuApproved || {};
      const cioApp = data?.cioApproved || {};

      keys.forEach((k) => {
        totalCells++;
        if (isNoteCellFilled(cells[k])) filledCells++;
        if (cst[k] === 'pending_cio') pendingCells++;
        if (cst[k] === 'agreed' || cst[k] === 'approved' || comments[k]?.includes('Согласовано')) agreedCells++;
        if (omsuApp[k]) greenCells++;
        if (cioApp[k]) blueCells++;
      });
    });

    return { totalCells, filledCells, pendingCells, agreedCells, greenCells, blueCells };
  }, [active, munData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Согласование, контроль и утверждение пояснительной записки — {cio.short}
          </h2>
          <p className="text-sm text-slate-500">
            {cio.name} · Срок согласования: <span className="font-medium text-slate-700">{deadline}</span>
          </p>
        </div>

        {/* Сводные показатели */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900 shadow-sm">
            <span>На согласовании:</span> <span className="font-bold">{stats.pendingCells}</span>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-900 shadow-sm flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
            <span>Зелёный флажок ОМСУ:</span>
            <span className="font-bold">{stats.greenCells} / {stats.totalCells}</span>
          </div>
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-900 shadow-sm flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
            <span>Синий флажок ЦИО/МЭФ:</span>
            <span className="font-bold">{stats.blueCells} / {stats.totalCells}</span>
          </div>
        </div>
      </div>

      {/* Панель выбора территории */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Муниципальное образование:</span>
        <div className="w-80">
          <Select value={munId} onValueChange={setMunId}>
            <SelectTrigger className="h-9 font-medium text-slate-800">
              <SelectValue placeholder="Выберите территорию" />
            </SelectTrigger>
            <SelectContent>
              {muns.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedMun && (
          <span className="text-xs text-slate-500">
            Полномочия: согласование («Согласовано» / замечания), контроль и утверждение (синие флажки 🔵), снятие утверждения.
          </span>
        )}
      </div>

      {/* Информационный баннер обязанностей вышестоящего уровня */}
      <div className="rounded-md border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-xs text-indigo-950">
        <div className="font-semibold text-indigo-900 mb-0.5 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          Полномочия ответственного лица вышестоящего уровня (ЦИО/МЭФ):
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-slate-700">
          <li>
            <strong>Согласование формы ввода</strong>: ответственное лицо согласовывает ячейки (пишет «Согласовано» в поле комментарий) или вносит замечания.
          </li>
          <li>
            <strong>Контроль и утверждение</strong>: после того как ОМСУ проставил зелёные флажки 🟢, вышестоящий уровень проводит контроль и утверждает данные <strong className="text-blue-700">синими флажками 🔵</strong> (по ячейкам или блокам).
          </li>
          <li>
            <strong>Снятие утверждения</strong>: снять утверждение (отозвать синий флажок) может <strong>только ответственное лицо вышестоящего уровня</strong>.
          </li>
          <li>
            Выгрузка в выходные таблицы разрешена только для ячеек, утверждённых синими флажками.
          </li>
        </ul>
      </div>

      <NoteTable
        templates={active}
        directions={state.directions}
        indicators={state.indicators}
        mode="approve"
        omsuData={munData}
        onAgreeCell={(tplId, cellKey, commentText) =>
          dispatch({
            type: 'NOTE_CIO_AGREE',
            templateId: tplId,
            munId,
            cellKeys: [cellKey],
            actor: cio.short,
            comment: commentText || 'Согласовано',
          })
        }
        onAgreeBlock={(tplId, cellKeys) =>
          dispatch({
            type: 'NOTE_CIO_AGREE',
            templateId: tplId,
            munId,
            cellKeys,
            actor: cio.short,
            comment: 'Согласовано',
          })
        }
        onReturnCell={(tplId, cellKey, remark) => {
          dispatch({
            type: 'NOTE_CIO_RETURN',
            templateId: tplId,
            munId,
            cellKey,
            actor: cio.short,
            comment: remark,
          });
        }}
        onUndoReturnCell={(tplId, cellKey) =>
          dispatch({ type: 'NOTE_CIO_UNDO_RETURN', templateId: tplId, munId, cellKey, actor: cio.short })
        }
        onCioApproveCell={(tplId, cellKey) =>
          dispatch({
            type: 'NOTE_CIO_APPROVE_FLAGS',
            templateId: tplId,
            munId,
            cellKeys: [cellKey],
            actor: cio.short,
          })
        }
        onCioApproveBlock={(tplId, cellKeys) =>
          dispatch({
            type: 'NOTE_CIO_APPROVE_FLAGS',
            templateId: tplId,
            munId,
            cellKeys,
            actor: cio.short,
          })
        }
        onRevokeCell={(tplId, cellKey, target) =>
          dispatch({
            type: 'NOTE_CIO_REVOKE',
            templateId: tplId,
            munId,
            cellKeys: [cellKey],
            actor: cio.short,
            target,
          })
        }
        onRevokeBlock={(tplId, cellKeys) =>
          dispatch({
            type: 'NOTE_CIO_REVOKE',
            templateId: tplId,
            munId,
            cellKeys,
            actor: cio.short,
            target: 'cio',
          })
        }
      />

      {/* Диалог внесения замечаний */}
      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Внесение замечаний в поле комментарий</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <span className="text-xs text-slate-600">
              Укажите замечания для ОМСУ. Текст будет сохранён в поле комментарий ячейки:
            </span>
            <Textarea
              placeholder="Например: Уточните причины изменения показателей за отчётный период..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {[
                'Уточните причины отклонения показателей',
                'Не указан перечень предприятий отрасли',
                'Требуется детализация прогноза на плановый период',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="rounded bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700"
                  onClick={() => setComment(sample)}
                >
                  + {sample}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Отмена</Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              disabled={!comment.trim()}
              onClick={() => {
                if (returnTarget) {
                  dispatch({
                    type: 'NOTE_CIO_RETURN',
                    templateId: returnTarget.tplId,
                    cellKey: returnTarget.cellKey,
                    munId,
                    actor: cio.short,
                    comment: comment.trim(),
                  });
                  setReturnTarget(null);
                }
              }}
            >
              Сохранить замечание
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
