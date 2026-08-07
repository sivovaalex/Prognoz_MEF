import { useState } from 'react';
import { useStore } from '@/lib/store';
import { CIOS, MUNICIPALITIES } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PlayCircle, StopCircle, CalendarClock, Send, BarChart3 } from 'lucide-react';
import { approvalStats, allApproved } from '@/lib/rating';

/** Вкладка «Управление» МЭФ: управление сбором, сроки, готовность к рейтингу */
export function MefManage({ goRating }: { goRating: () => void }) {
  const { state, dispatch } = useStore();
  const [startDate, setStartDate] = useState(state.campaign.startDate ?? '2026-07-20');
  const [dlOmsu, setDlOmsu] = useState(state.campaign.deadlineOmsu);
  const [dlCio, setDlCio] = useState(state.campaign.deadlineCio);
  const [dlMef, setDlMef] = useState(state.campaign.deadlineMef);

  const stats = approvalStats(state);
  const complete = allApproved(state);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Управление сбором</h2>
        <p className="text-sm text-muted-foreground">
          Куратор рейтинга: запуск сбора, контроль сроков, предварительный и итоговый рейтинг
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Параметры сбора</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 items-center gap-2">
              <Label>Дата запуска сбора</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-2">
              <Label>Срок заполнения ОМСУ</Label>
              <Input type="date" value={dlOmsu} onChange={(e) => setDlOmsu(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-2">
              <Label>Срок согласования ЦИО</Label>
              <Input type="date" value={dlCio} onChange={(e) => setDlCio(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 items-center gap-2">
              <Label>Срок согласования МЭФ</Label>
              <Input type="date" value={dlMef} onChange={(e) => setDlMef(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  dispatch({ type: 'CAMPAIGN_SCHEDULE', startDate, deadlineOmsu: dlOmsu, deadlineCio: dlCio, deadlineMef: dlMef })
                }
              >
                <CalendarClock className="h-4 w-4 mr-1" /> Сохранить даты
              </Button>
              {state.campaign.status === 'collecting' ? (
                <>
                  <Button variant="destructive" onClick={() => dispatch({ type: 'CAMPAIGN_STOP' })}>
                    <StopCircle className="h-4 w-4 mr-1" /> Остановить сбор
                  </Button>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Сбор запущен {state.campaign.launchedAt}
                  </Badge>
                </>
              ) : (
                state.campaign.status !== 'completed' && (
                  <Button onClick={() => dispatch({ type: 'CAMPAIGN_LAUNCH' })}>
                    <PlayCircle className="h-4 w-4 mr-1" /> Запустить сбор
                  </Button>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              В указанную дату КФ автоматически рассылает уведомления и формы: {MUNICIPALITIES.length} ОМСУ и {CIOS.length} ЦИО.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Готовность к итоговому рейтингу</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="text-green-700 border-green-300">Согласовано ЦИО: {stats.approved}/{stats.total}</Badge>
              <Badge variant="outline" className="text-amber-700 border-amber-300">На согласовании: {stats.pending}</Badge>
              <Badge variant="outline" className="text-gray-600">Не заполнено/черновики: {stats.empty + stats.draft}</Badge>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium">Предварительный рейтинг</div>
              <p className="text-xs text-muted-foreground mb-2">
                Доступен в любой момент: рассчитывается по введённым данным (согласованным и несогласованным).
              </p>
              <Button variant="outline" size="sm" onClick={goRating}>
                <BarChart3 className="h-4 w-4 mr-1" /> Сформировать предварительный рейтинг
              </Button>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium">Итоговый рейтинг</div>
              <p className="text-xs text-muted-foreground mb-2">
                {complete
                  ? 'Все показатели согласованы. Можно формировать итоговый сводный рейтинг.'
                  : 'Доступен после согласования всех показателей: ОМСУ — отраслевыми ЦИО, ЦИО — МЭФ.'}
              </p>
              <Button size="sm" disabled={!complete} onClick={() => { dispatch({ type: 'PUBLISH_FINAL' }); goRating(); }}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Сформировать итоговый рейтинг
              </Button>
              {state.finalPublished && (
                <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">Опубликован</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
