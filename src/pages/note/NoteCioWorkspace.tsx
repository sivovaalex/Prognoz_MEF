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
  const [comment, setComment] = useState('');

  const munData = state.noteOmsuValues[munId] ?? {};
  const deadline = state.noteCampaign.deadlineCio.split('-').reverse().join('.');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Согласование пояснительной записки — {cio.short}</h2>
        <p className="text-sm text-slate-500">
          {cio.name} · срок согласования: {deadline}
        </p>
      </div>

      {/* Выбор территории */}
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

      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        Ячейки, отправленные ОМСУ на согласование, согласуются по отдельности: под каждой ячейкой нажмите «Согласовать» или «Вернуть».
        Комментарий при возврате отобразится у ОМСУ в ячейке рядом со значением; после повторной отправки и согласования он исчезнет.
        Возврат можно отменить, пока ОМСУ не отправил ячейку снова.
      </div>

      <NoteTable
        templates={active}
        directions={state.directions}
        indicators={state.indicators}
        mode="approve"
        omsuData={munData}
        onApproveCell={(tplId, cellKey) => dispatch({ type: 'NOTE_CIO_APPROVE', templateId: tplId, munId, cellKey, actor: cio.short })}
        onRevokeCell={(tplId, cellKey) => dispatch({ type: 'NOTE_CIO_REVOKE', templateId: tplId, munId, cellKey, actor: cio.short })}
        onReturnCell={(tplId, cellKey) => { setReturnTarget({ tplId, cellKey }); setComment(''); }}
        onUndoReturnCell={(tplId, cellKey) => dispatch({ type: 'NOTE_CIO_UNDO_RETURN', templateId: tplId, munId, cellKey, actor: cio.short })}
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
    </div>
  );
}