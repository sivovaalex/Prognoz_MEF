import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PlayCircle, StopCircle, CalendarClock, Send, BarChart3 } from 'lucide-react';
import { approvalStats, allApproved } from '@/lib/rating';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/** Вкладка «Управление» МЭФ: управление сбором, сроки, готовность к отчёту */
export function MefManage({ goRating, goReport }: { goRating: () => void; goReport: () => void }) {
  const { state, dispatch } = useStore();
  const [startDate, setStartDate] = useState(state.campaign.startDate ?? '2026-07-20');
  const [dlMef, setDlMef] = useState(state.campaign.deadlineMef);

  const stats = approvalStats(state);
  const complete = allApproved(state);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [reportIntent, setReportIntent] = useState<'pre' | 'final'>('final');
  const [reportType, setReportType] = useState('ind');
  const [period, setPeriod] = useState('2024');

  const isRating = state.campaign.module === 'rating';
  const periods = isRating 
    ? ['2023 год', '1 квартал 2024', '2 квартал 2024', '3 квартал 2024', '4 квартал 2024', '2024 год']
    : ['2023 год', '2024 год', '2025 год', '2026 год'];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Управление сбором</h2>
        <p className="text-sm text-muted-foreground">
          Куратор отчёта: запуск сбора, контроль сроков, предварительный и итоговый отчёт
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
                  dispatch({ type: 'CAMPAIGN_SCHEDULE', startDate, deadlineOmsu: state.campaign.deadlineOmsu, deadlineCio: state.campaign.deadlineCio, deadlineMef: dlMef })
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
              В указанную дату КФ автоматически рассылает уведомления и формы: {state.omsus.length} ОМСУ и {state.cios.length} ЦИО.
            </p>
          </CardContent>
        </Card>

        {isRating && (
          <Card>
            <CardHeader><CardTitle className="text-base">Готовность к итоговому отчёту</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="text-green-700 border-green-300">Согласовано ЦИО: {stats.approved}/{stats.total}</Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-300">На согласовании: {stats.pending}</Badge>
                <Badge variant="outline" className="text-gray-600">Не заполнено/черновики: {stats.empty + stats.draft}</Badge>
              </div>
              <div className="rounded-md border p-3">
                <div className="font-medium">Предварительный отчёт</div>
                <p className="text-xs text-muted-foreground mb-2">
                  Доступен в любой момент: рассчитывается по введённым данным (согласованным и несогласованным).
                </p>
                <Button variant="outline" size="sm" onClick={() => { setReportIntent('pre'); setReportModalOpen(true); }}>
                  <BarChart3 className="h-4 w-4 mr-1" /> Сформировать предварительный отчёт
                </Button>
              </div>
              
              <div className="rounded-md border p-3">
                <div className="font-medium">Итоговый отчёт</div>
                <p className="text-xs text-muted-foreground mb-2">
                  {complete
                    ? 'Все показатели согласованы. Можно формировать итоговый сводный отчёт.'
                    : 'Обычно доступен после согласования всех показателей, но для тестирования кнопка разблокирована.'}
                </p>
                <Button size="sm" onClick={() => { setReportIntent('final'); setReportModalOpen(true); }}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Сформировать итоговый отчёт
                </Button>
                {state.finalPublished && (
                  <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">Опубликован</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reportIntent === 'pre' ? 'Формирование предварительного отчёта' : 'Формирование итогового отчёта'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Период</Label>
              <select 
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={period}
                onChange={e => setPeriod(e.target.value)}
              >
                {periods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {isRating && (
              <div className="space-y-2">
                <Label>Выберите тип отчёта:</Label>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                    <input
                      type="radio"
                      name="reportType"
                      value="cio"
                      checked={reportType === 'cio'}
                      disabled
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-4 h-4 text-[#1e5c8f] border-gray-300"
                    />
                    ЦИО
                  </label>
                  <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                    <input
                      type="radio"
                      name="reportType"
                      value="omsu"
                      checked={reportType === 'omsu'}
                      disabled
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-4 h-4 text-[#1e5c8f] border-gray-300"
                    />
                    ОМСУ
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportType"
                      value="ind"
                      checked={reportType === 'ind'}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-4 h-4 text-[#1e5c8f] border-gray-300"
                    />
                    показатель
                  </label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportModalOpen(false)}>Отмена</Button>
            <Button onClick={() => {
              if (reportIntent === 'final') {
                dispatch({ type: 'PUBLISH_FINAL' });
              }
              setReportModalOpen(false);
              if (reportType === 'ind') {
                goReport();
              } else {
                goRating();
              }
            }}>Сформировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <th className="text-left p-2">Период</th>
                  <th className="text-left p-2">Статус</th>
                  <th className="text-left p-2">Инициатор</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-slate-50">
                  <td className="p-2">2023-01-15 10:00</td>
                  <td className="p-2">2023 год</td>
                  <td className="p-2"><Badge variant="outline" className="text-green-700 border-green-300">Завершён</Badge></td>
                  <td className="p-2">Система</td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="p-2">2024-02-10 09:30</td>
                  <td className="p-2">1 квартал 2024</td>
                  <td className="p-2"><Badge variant="outline" className="text-green-700 border-green-300">Завершён</Badge></td>
                  <td className="p-2">МЭФ</td>
                </tr>
                {state.campaign.status !== 'draft' && (
                  <tr className="border-b hover:bg-slate-50">
                    <td className="p-2">{state.campaign.launchedAt || '2024-07-20 10:00'}</td>
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
