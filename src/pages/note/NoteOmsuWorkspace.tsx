import { useState } from 'react';
import { useStore } from '@/lib/store';
import { CURRENT_OMSU } from '@/lib/data';
import { NoteTable } from '@/components/note/NoteTable';
import { SignDialog } from '@/components/SignDialog';
import { Badge } from '@/components/ui/badge';

export function NoteOmsuWorkspace() {
  const { state, dispatch } = useStore();
  const munId = CURRENT_OMSU;
  const mun = state.omsus.find((m) => m.id === munId)!;
  const [signTarget, setSignTarget] = useState<{ tplId: string; cellKey: string } | null>(null);

  const active = state.noteTemplates.filter((t) => t.isActive);
  const myData = state.noteOmsuValues[munId] ?? {};
  const st = (tplId: string) => myData[tplId]?.status ?? 'not_filled';
  const stats = {
    approved: active.filter((t) => st(t.id) === 'approved').length,
    pending: active.filter((t) => st(t.id) === 'pending_cio').length,
    returned: active.filter((t) => st(t.id) === 'returned').length,
    draft: active.filter((t) => st(t.id) === 'draft').length,
  };
  const deadline = state.noteCampaign.deadlineOmsu.split('-').reverse().join('.');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Пояснительная записка — {mun.name}</h2>
          <p className="text-sm text-slate-500">
            Заполнение показателей пояснительной записки · срок заполнения: {deadline}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="border-green-300 text-green-700">Согласовано: {stats.approved}/{active.length}</Badge>
          <Badge variant="outline" className="border-amber-300 text-amber-700">На согласовании: {stats.pending}</Badge>
          <Badge variant="outline" className="border-rose-300 text-rose-700">Возвращено: {stats.returned}</Badge>
          <Badge variant="outline" className="border-sky-300 text-sky-700">Черновики: {stats.draft}</Badge>
        </div>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        Заполните данные шаблонов и отправляйте ячейки на согласование ЦИО с подписью ЭЦП — каждая ячейка согласуется отдельно.
        Возвращённые ячейки можно доработать и отправить повторно.
      </div>

      <NoteTable
        templates={active}
        directions={state.directions}
        indicators={state.indicators}
        mode="edit"
        omsuData={myData}
        onCellChange={(tplId, key, value) =>
          dispatch({ type: 'NOTE_SET_CELL', munId, templateId: tplId, cellKey: key, value })
        }
        onSendCell={(tplId, cellKey) => setSignTarget({ tplId, cellKey })}
        onRecallCell={(tplId, cellKey) =>
          dispatch({ type: 'NOTE_RECALL', munId, templateId: tplId, cellKeys: [cellKey], actor: mun.name })
        }
      />

      <SignDialog
        open={!!signTarget}
        onOpenChange={(v) => !v && setSignTarget(null)}
        title="Подписание ЭЦП"
        onSigned={() => {
          if (signTarget) dispatch({ type: 'NOTE_SIGN_SEND', munId, templateId: signTarget.tplId, cellKeys: [signTarget.cellKey], actor: 'Иванов А.Р.' });
        }}
      />
    </div>
  );
}