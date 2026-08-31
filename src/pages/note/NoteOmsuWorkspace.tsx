import { useState } from 'react';
import { useStore } from '@/lib/store';
import { CURRENT_OMSU } from '@/lib/data';
import { NoteTable } from '@/components/note/NoteTable';
import { SignDialog } from '@/components/SignDialog';

export function NoteOmsuWorkspace() {
  const { state, dispatch } = useStore();
  const munId = CURRENT_OMSU;
  const mun = state.omsus.find((m) => m.id === munId)!;
  const [signTarget, setSignTarget] = useState<{ tplId: string; cellKey: string } | null>(null);

  const active = state.noteTemplates.filter((t) => t.isActive);
  const myData = state.noteOmsuValues[munId] ?? {};
  const deadline = state.noteCampaign.deadlineOmsu.split('-').reverse().join('.');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Пояснительная записка — {mun.name}</h2>
        <p className="text-sm text-slate-500">
          Заполнение показателей пояснительной записки · срок заполнения: {deadline}
        </p>
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