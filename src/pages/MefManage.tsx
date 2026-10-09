import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, StopCircle, CalendarClock, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CollectionFormSettings } from '@/components/CollectionFormSettings';

/** Вкладка «Управление сбором» МЭФ: управление сбором, сроки, настройки форм */
export function MefManage({ block }: { block?: string; goRating?: () => void; goReport?: () => void }) {
  const { state, dispatch } = useStore();
  const [periodName, setPeriodName] = useState(state.campaign.period ?? '');
  const [startDate, setStartDate] = useState(state.campaign.startDate ?? '2026-07-20');
  const [dlMef, setDlMef] = useState(state.campaign.deadlineMef);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  useEffect(() => {
    setPeriodName(state.campaign.period ?? '');
    setStartDate(state.campaign.startDate ?? '2026-07-20');
    setDlMef(state.campaign.deadlineMef);
  }, [state.campaign.module, state.campaign.period, state.campaign.startDate, state.campaign.deadlineMef]);

  const isRating = state.campaign.module === 'rating';
  const isUkaz = state.campaign.module === 'ukaz';
  const activeBlock = block || (isUkaz ? 'ukaz_main' : isRating ? 'rating_main' : 'mun');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Управление сбором</h2>
        <p className="text-sm text-muted-foreground">
          Куратор отчёта: запуск сбора, контроль сроков и параметров кампании сбора данных
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-start">
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
              <Input type="datetime-local" value={dlMef} onChange={(e) => setDlMef(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  dispatch({
                    type: 'CAMPAIGN_SCHEDULE',
                    startDate,
                    deadlineOmsu: state.campaign.deadlineOmsu,
                    deadlineCio: state.campaign.deadlineCio,
                    deadlineMef: dlMef,
                    period: periodName,
                  })
                }
              >
                <CalendarClock className="h-4 w-4 mr-1" /> Сохранить даты
              </Button>
              {state.campaign.status === 'collecting' ? (
                <>
                  <Button variant="destructive" onClick={() => dispatch({ type: 'CAMPAIGN_STOP' })}>
                    <StopCircle className="h-4 w-4 mr-1" /> Завершить сбор
                  </Button>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Сбор запущен {state.campaign.launchedAt}
                  </Badge>
                </>
              ) : (
                <Button onClick={() => dispatch({ type: 'CAMPAIGN_LAUNCH' })}>
                  <PlayCircle className="h-4 w-4 mr-1" /> {state.campaign.status === 'completed' ? 'Запустить новый сбор' : 'Запустить сбор'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              В указанную дату КФ автоматически рассылает уведомления и формы: {state.omsus.length} ОМСУ и {state.cios.length} ЦИО. Предварительный отчёт формируется автоматически по мере занесения данных, а итоговый отчёт — автоматически при завершении кампании.
            </p>
          </CardContent>
        </Card>

        <CollectionFormSettings block={activeBlock} />
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
                  <td className="p-2">2024-01-15 10:00</td>
                  <td className="p-2">{isRating ? '4 квартал 2024 года' : isUkaz ? 'Мониторинг исполнения Указа №607 за 2023 год' : 'Прогноз СЭР на 2025–2027 годы (оценка 2024)'}</td>
                  <td className="p-2"><Badge variant="outline" className="text-green-700 border-green-300">Завершён</Badge></td>
                  <td className="p-2">Система</td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="p-2">2025-02-10 09:30</td>
                  <td className="p-2">{isRating ? '4 квартал 2025 года' : isUkaz ? 'Мониторинг исполнения Указа №607 за 2024 год' : 'Прогноз СЭР на 2026–2028 годы (оценка 2025)'}</td>
                  <td className="p-2"><Badge variant="outline" className="text-green-700 border-green-300">Завершён</Badge></td>
                  <td className="p-2">МЭФ</td>
                </tr>
                {state.campaign.status !== 'draft' && (
                  <tr className="border-b hover:bg-slate-50">
                    <td className="p-2">{state.campaign.launchedAt || '20.07.2026 09:00'}</td>
                    <td className="p-2">{state.campaign.period}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                        {state.campaign.status === 'collecting' ? 'В процессе' : 'Завершён'}
                      </Badge>
                    </td>
                    <td className="p-2">МЭФ</td>
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
