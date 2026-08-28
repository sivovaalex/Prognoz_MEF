import { useState } from 'react';
import { useStore } from '@/lib/store';
import { CURRENT_CIO } from '@/lib/data';
import { NoteTable } from '@/components/note/NoteTable';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function NoteCioWorkspace() {
  const { state, dispatch } = useStore();
  const cio = state.cios.find((c) => c.id === CURRENT_CIO)!;
  const active = state.noteTemplates.filter((t) => t.isActive);
  const muns = state.omsus.filter((m) => m.isActive !== false);
  const [munId, setMunId] = useState(muns[0]?.id ?? '');
  const [returnTarget, setReturnTarget] = useState<{ tplId: string; cellKey: string } | null>(null);
  const [noteTarget, setNoteTarget] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [note, setNote] = useState('');

  const munData = state.noteOmsuValues[munId] ?? {};
  const cioData = Object.fromEntries(
    active.map((t) => [t.id, state.noteCioValues[t.id]?.[munId] ?? { note: '', status: 'none' as const, updatedAt: null }]),
  );
  const deadline = state.noteCampaign.deadlineCio.split('-').reverse().join('.');

  // сводка по территориям: сколько шаблонов на согласовании / согласовано
  const munSummary = muns.map((m) => {
    const data = state.noteOmsuValues[m.id] ?? {};
    return {
      mun: m,
      pending: active.filter((t) => data[t.id]?.status === 'pending_cio').length,
      approved: active.filter((t) => data[t.id]?.status === 'approved').length,
      returned: active.filter((t) => data[t.id]?.status === 'returned').length,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Согласование пояснительной записки — {cio.short}</h2>
        <p className="text-sm text-slate-500">
          {cio.name} · срок согласования: {deadline}
        </p>
      </div>

      {/* Выбор территории */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Select value={munId} onValueChange={setMunId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Территория" /></SelectTrigger>
            <SelectContent>
              {muns.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {munSummary.map(({ mun: m, pending, approved, returned }) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMunId(m.id)}
              className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                m.id === munId
                  ? 'border-blue-400 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              title="Показать территорию"
            >
              {m.name}: <span className="font-medium text-amber-700">{pending} на согл.</span> ·{' '}
              <span className="font-medium text-emerald-700">{approved} согл.</span>
              {returned > 0 && <> · <span className="font-medium text-rose-700">{returned} возв.</span></>}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        Ячейки, отправленные ОМСУ на согласование, согласуются по отдельности: под каждой ячейкой нажмите «Согласовать» или «Вернуть» (с комментарием).
      </div>

      <NoteTable
        templates={active}
        directions={state.directions}
        indicators={state.indicators}
        mode="approve"
        omsuData={munData}
        cioData={cioData}
        onApproveCell={(tplId, cellKey) => dispatch({ type: 'NOTE_CIO_APPROVE', templateId: tplId, munId, cellKey, actor: cio.short })}
        onReturnCell={(tplId, cellKey) => { setReturnTarget({ tplId, cellKey }); setComment(''); }}
        onEditNote={(tplId) => { setNoteTarget(tplId); setNote(state.noteCioValues[tplId]?.[munId]?.note ?? ''); }}
      />
      {/* Возврат ОМСУ на доработку */}
      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Возврат ячейки ОМСУ на доработку</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Комментарий для ОМСУ (обязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Отмена</Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              disabled={!comment.trim()}
              onClick={() => {
                if (returnTarget) {
                  dispatch({ type: 'NOTE_CIO_RETURN', templateId: returnTarget.tplId, cellKey: returnTarget.cellKey, munId, actor: cio.short, comment: comment.trim() });
                  setReturnTarget(null);
                }
              }}
            >
              Вернуть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Примечание ЦИО */}
      <Dialog open={!!noteTarget} onOpenChange={(v) => !v && setNoteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Примечание ЦИО</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Примечание к пояснительной записке"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)}>Отмена</Button>
            <Button
              className="bg-[#1e5c8f] text-white hover:bg-[#1e5c8f]/90"
              onClick={() => {
                if (noteTarget) {
                  dispatch({ type: 'NOTE_CIO_SET_NOTE', templateId: noteTarget, munId, note: note.trim() });
                  setNoteTarget(null);
                }
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}