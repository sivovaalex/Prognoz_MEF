import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarClock, PlayCircle, StopCircle, Send } from 'lucide-react';

/** Вкладка «Управление сбором» ПЗ: в точности как вкладка «Управление» раздела «Показатели» —
 *  параметры сбора (дата запуска и дата окончания), запуск/остановка, историчность сборов */
export function NoteCollection() {
  const { state, dispatch } = useStore();
  const cam = state.noteCampaign;
  const [periodName, setPeriodName] = useState(cam.period ?? 'Пояснительная записка за 2026 год');
  const [startDate, setStartDate] = useState(cam.startDate ?? '2026-02-01T09:00');
  const [dlEnd, setDlEnd] = useState(cam.deadline);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Управление сбором пояснительной записки</h2>
        <p className="text-sm text-muted-foreground">
          Куратор отчёта: запуск сбора, контроль сроков
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Параметры сбора</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setHistoryModalOpen(true)}>Историчность сборов</Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 items-center gap-2">
              <Label>Период сбора</Label>
              <Input
                type="text"
                placeholder="Введите период сбора..."
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 items-center gap-2">
              <Label>Дата запуска сбора</Label>
              <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-2">
              <Label>Дата окончания сбора</Label>
              <Input type="datetime-local" value={dlEnd} onChange={(e) => setDlEnd(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  dispatch({ type: 'NOTE_CAMPAIGN_SCHEDULE', startDate, deadline: dlEnd, period: periodName })
                }
              >
                <CalendarClock className="h-4 w-4 mr-1" /> Сохранить даты
              </Button>
              {cam.status === 'collecting' ? (
                <>
                  <Button variant="destructive" onClick={() => dispatch({ type: 'NOTE_CAMPAIGN_STOP' })}>
                    <StopCircle className="h-4 w-4 mr-1" /> Остановить сбор
                  </Button>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Сбор запущен {cam.launchedAt}
                  </Badge>
                </>
              ) : (
                cam.status !== 'completed' && (
                  <Button onClick={() => dispatch({ type: 'NOTE_CAMPAIGN_LAUNCH' })}>
                    <PlayCircle className="h-4 w-4 mr-1" /> Запустить сбор
                  </Button>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              В указанную дату КФ автоматически рассылает уведомления и формы: {state.omsus.length} ОМСУ и {state.cios.length} ЦИО.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Историчность сборов</DialogTitle>
          </DialogHeader>
          <div className="py-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left p-2">Дата и время запуска</th>
                  <th className="text-left p-2">Период сбора</th>
                  <th className="text-left p-2">Статус</th>
                  <th className="text-left p-2">Инициатор</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-slate-50">
                  <td className="p-2">2025-02-01 09:00</td>
                  <td className="p-2">Пояснительная записка за 2025 год</td>
                  <td className="p-2"><Badge variant="outline" className="text-green-700 border-green-300">Завершён</Badge></td>
                  <td className="p-2">Куратор МЭФ</td>
                </tr>
                {cam.status !== 'draft' && (
                  <tr className="border-b hover:bg-slate-50">
                    <td className="p-2">{cam.launchedAt || '2026-02-01 09:00'}</td>
                    <td className="p-2">{cam.period || 'Пояснительная записка за 2026 год'}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                        {cam.status === 'collecting' ? 'В процессе' : 'Завершён'}
                      </Badge>
                    </td>
                    <td className="p-2">Куратор МЭФ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}