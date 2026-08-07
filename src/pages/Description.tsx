import { FlowDiagram, FlowLegend, type FlowStep, type FlowLoop, type FlowNote } from '@/components/FlowDiagram';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings2, ClipboardCheck, Building2, Landmark, BookOpen } from 'lucide-react';

// ===== Общий процесс =====
const GENERAL_STEPS: FlowStep[] = [
  { kind: 'start', text: 'Начало отчётного периода (квартал / год)' },
  { kind: 'task', text: 'Передача перечня показателей и формул расчёта рейтинга', actor: 'МЭФ' },
  { kind: 'task', text: 'Настройка форм сбора и сводных форм рейтинга', actor: 'Администратор КФ' },
  { kind: 'task', text: 'Установка даты запуска и контрольных сроков', actor: 'МЭФ' },
  { kind: 'task', text: 'Автоматическая рассылка уведомлений и форм (12 ОМСУ, 5 ЦИО)', actor: 'КФ' },
  { kind: 'task', text: 'Заполнение показателей, подписание ЭЦП, отправка на согласование', actor: 'ОМСУ' },
  { kind: 'decision', text: 'Данные ОМСУ согласованы?', actor: 'ЦИО' },
  { kind: 'task', text: 'Внесение собственных значений по показателям, подписание ЭЦП', actor: 'ЦИО' },
  { kind: 'decision', text: 'Данные ЦИО согласованы?', actor: 'МЭФ' },
  { kind: 'task', text: 'Автоматический расчёт итогового сводного рейтинга', actor: 'КФ' },
  { kind: 'end', text: 'Рейтинг сформирован и опубликован' },
];
const GENERAL_LOOPS: FlowLoop[] = [
  { from: 6, to: 5, label: 'возврат на доработку (ОМСУ может отозвать до согласования)' },
  { from: 8, to: 7, label: 'возврат на доработку (ЦИО может отозвать до согласования)' },
];
const GENERAL_NOTES: FlowNote[] = [
  { at: 9, text: 'Предварительный рейтинг — в любой момент по введённым данным' },
];

// ===== ОМСУ =====
const OMSU_STEPS: FlowStep[] = [
  { kind: 'start', text: 'Получено уведомление о начале сбора' },
  { kind: 'task', text: 'Заполнить значения показателей в форме (срок — до дедлайна ОМСУ)', actor: 'ОМСУ' },
  { kind: 'task', text: 'Подписать данные ЭЦП и отправить отраслевому ЦИО', actor: 'ОМСУ' },
  { kind: 'decision', text: 'ЦИО согласовал показатель?', actor: 'ЦИО' },
  { kind: 'end', text: 'Показатель согласован, изменение заблокировано' },
];
const OMSU_LOOPS: FlowLoop[] = [
  { from: 3, to: 1, label: 'возврат ЦИО с комментарием — доработать и отправить повторно' },
];
const OMSU_NOTES: FlowNote[] = [
  { at: 4, text: 'Отозвать показатель можно только до согласования' },
];

// ===== ЦИО =====
const CIO_STEPS: FlowStep[] = [
  { kind: 'start', text: 'Поступили подписанные ЭЦП данные ОМСУ' },
  { kind: 'task', text: 'Проверить значения ОМСУ по показателям своей отрасли', actor: 'ЦИО' },
  { kind: 'decision', text: 'Данные ОМСУ корректны?', actor: 'ЦИО' },
  { kind: 'task', text: 'Согласовать — изменение показателя ОМСУ блокируется', actor: 'ЦИО' },
  { kind: 'task', text: 'Внести собственные значения по тем же показателям (справочно — среднее по ОМСУ)', actor: 'ЦИО' },
  { kind: 'task', text: 'Подписать ЭЦП и отправить на согласование в МЭФ', actor: 'ЦИО' },
  { kind: 'decision', text: 'МЭФ согласовал данные?', actor: 'МЭФ' },
  { kind: 'end', text: 'Данные ЦИО согласованы' },
];
const CIO_LOOPS: FlowLoop[] = [
  { from: 2, to: 1, label: 'возврат ОМСУ на доработку с комментарием' },
  { from: 6, to: 4, label: 'возврат МЭФ — доработать (или отозвать) и отправить повторно' },
];

// ===== МЭФ =====
const MEF_STEPS: FlowStep[] = [
  { kind: 'start', text: 'Подготовка отчётного периода' },
  { kind: 'task', text: 'Передать перечень показателей и формулы расчёта в КФ', actor: 'МЭФ' },
  { kind: 'task', text: 'Установить дату запуска сбора и сроки этапов', actor: 'МЭФ' },
  { kind: 'task', text: 'Контроль хода сбора: мониторинг наполняемости, сроки', actor: 'МЭФ' },
  { kind: 'decision', text: 'Данные ЦИО корректны?', actor: 'МЭФ' },
  { kind: 'decision', text: 'Все показатели согласованы (ОМСУ + ЦИО)?' },
  { kind: 'task', text: 'Сформировать итоговый сводный рейтинг', actor: 'МЭФ' },
  { kind: 'end', text: 'Рейтинг опубликован' },
];
const MEF_LOOPS: FlowLoop[] = [
  { from: 4, to: 3, label: 'возврат ЦИО на доработку с комментарием' },
  { from: 5, to: 3, label: 'ожидание / напоминания участникам' },
];
const MEF_NOTES: FlowNote[] = [
  { at: 6, text: 'Предварительный рейтинг доступен в любой момент до итогового' },
];

// ===== Администратор КФ =====
const ADMIN_STEPS: FlowStep[] = [
  { kind: 'start', text: 'Получен перечень показателей от МЭФ' },
  { kind: 'task', text: 'Настроить показатели: формулы, единицы, оптимум, веса', actor: 'Администратор КФ' },
  { kind: 'task', text: 'Привязать каждый показатель к отраслевому ЦИО', actor: 'Администратор КФ' },
  { kind: 'task', text: 'Настроить расчёт сводных форм рейтинга', actor: 'Администратор КФ' },
  { kind: 'task', text: 'Сопровождение сбора: корректировка настроек при изменениях МЭФ', actor: 'Администратор КФ' },
  { kind: 'end', text: 'Формы готовы к запуску сбора' },
];

const ROLE_CARDS = [
  {
    icon: Settings2,
    color: '#475569',
    name: 'Администратор КФ',
    org: 'ЦИОГВ, ГО МО',
    duties: [
      'Настройка показателей, формул, весов и оптимумов по данным МЭФ',
      'Привязка показателей к отраслевым ЦИО',
      'Настройка расчёта сводных форм рейтинга',
      'Сопровождение сбора, корректировка настроек',
    ],
    access: 'Полный доступ к настройкам и рейтингу',
  },
  {
    icon: Landmark,
    color: '#7c3aed',
    name: 'МЭФ (куратор / согласующий)',
    org: 'Министерство экономики и финансов МО',
    duties: [
      'Передача перечня показателей и формул на отчётный период',
      'Установка даты запуска сбора и контрольных сроков',
      'Согласование собственных данных ЦИО (или возврат на доработку)',
      'Формирование предварительного рейтинга в ходе сбора',
      'Формирование и публикация итогового сводного рейтинга',
    ],
    access: 'Полный доступ ко всем данным и рейтингу',
  },
  {
    icon: Building2,
    color: '#c2410c',
    name: 'Отраслевой ЦИО',
    org: 'например, Мининвест МО',
    duties: [
      'Согласование подписанных ЭЦП показателей ОМСУ своей отрасли',
      'Возврат показателей ОМСУ на доработку с комментарием',
      'Внесение собственных значений по показателям отрасли (со справочным средним по ОМСУ)',
      'Подписание ЭЦП и отправка данных на согласование в МЭФ',
      'Отзыв своих данных на изменение до согласования МЭФ',
    ],
    access: 'Только показатели своей отрасли, без доступа к рейтингу',
  },
  {
    icon: ClipboardCheck,
    color: '#0f766e',
    name: 'ОМСУ',
    org: 'органы местного самоуправления',
    duties: [
      'Заполнение значений показателей в срок',
      'Подписание данных ЭЦП и отправка отраслевому ЦИО',
      'Отзыв показателя на изменение до согласования ЦИО',
      'Доработка по комментариям ЦИО и повторная отправка',
    ],
    access: 'Только данные своего муниципалитета, без доступа к рейтингу',
  },
];

function RoleSection({ title, intro, steps, loops, notes }: {
  title: string; intro: string; steps: FlowStep[]; loops?: FlowLoop[]; notes?: FlowNote[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{intro}</p>
      </CardHeader>
      <CardContent>
        <FlowDiagram steps={steps} loops={loops} notes={notes} />
      </CardContent>
    </Card>
  );
}

export function Description() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-700" />
          Описание системы — модуль «Прогноз СЭР МО»
        </h2>
        <p className="text-sm text-muted-foreground">
          Доработка ИС «Конструктор форм» для сбора данных и расчёта рейтинга муниципальных образований по показателям МЭФ
        </p>
      </div>

      {/* 1. Общий процесс */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. Общий процесс сбора данных</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-700">
            Сбор организован как сквозной процесс с тремя уровнями согласования. МЭФ задаёт состав показателей и формулы,
            администратор КФ настраивает формы, после чего куратор МЭФ запускает сбор. ОМСУ заполняют показатели и подписывают
            их ЭЦП — данные согласовывает отраслевой ЦИО (после согласования изменение блокируется, до согласования ОМСУ может
            отозвать показатель на изменение). Затем ЦИО вносит собственные значения по тем же показателям и направляет их в МЭФ
            (аналогично — с возможностью отзыва до согласования). Когда все данные согласованы, КФ автоматически рассчитывает
            итоговый сводный рейтинг; предварительный рейтинг куратор МЭФ может сформировать в любой момент по введённым данным.
          </p>
          <FlowLegend />
          <FlowDiagram steps={GENERAL_STEPS} loops={GENERAL_LOOPS} notes={GENERAL_NOTES} />
        </CardContent>
      </Card>

      {/* 2. Роли */}
      <div>
        <h3 className="text-base font-semibold mb-3">2. Роли участников процесса</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {ROLE_CARDS.map((r) => (
            <Card key={r.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <r.icon className="h-5 w-5" style={{ color: r.color }} />
                  {r.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{r.org}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="text-sm space-y-1 list-disc pl-5 text-slate-700">
                  {r.duties.map((d) => <li key={d}>{d}</li>)}
                </ul>
                <Badge variant="outline" style={{ color: r.color, borderColor: r.color }}>{r.access}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Диаграммы по ролям */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">3. Процесс по каждой роли</h3>
        <RoleSection
          title="ОМСУ — заполнение и отправка показателей"
          intro="Рабочий цикл ОМСУ: заполнение → ЭЦП → согласование ЦИО. До согласования доступен отзыв на изменение; при возврате — доработка по комментарию и повторная отправка."
          steps={OMSU_STEPS}
          loops={OMSU_LOOPS}
          notes={OMSU_NOTES}
        />
        <RoleSection
          title="Отраслевой ЦИО — согласование ОМСУ и собственные значения"
          intro="ЦИО согласовывает данные ОМСУ своей отрасли (или возвращает с комментарием), затем вносит собственные значения по тем же показателям и отправляет их в МЭФ."
          steps={CIO_STEPS}
          loops={CIO_LOOPS}
        />
        <RoleSection
          title="МЭФ — управление сбором и формирование рейтинга"
          intro="Куратор МЭФ запускает сбор, контролирует сроки, согласовывает данные ЦИО, в любой момент формирует предварительный рейтинг, а после полного согласования — итоговый."
          steps={MEF_STEPS}
          loops={MEF_LOOPS}
          notes={MEF_NOTES}
        />
        <RoleSection
          title="Администратор КФ — настройка и сопровождение"
          intro="Администратор настраивает показатели, формулы и сводные формы по данным МЭФ и сопровождает сбор."
          steps={ADMIN_STEPS}
        />
      </div>
    </div>
  );
}
