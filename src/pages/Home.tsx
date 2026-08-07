import { ArrowRight, BarChart3, ClipboardCheck, ListOrdered } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { GERB_MO } from '@/assets/gerb-mo';

export type ModuleId = 'ser' | 'rating' | 'ukaz';

interface ModuleCard {
  id: ModuleId;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string; // градиент углового декора
  ring: string; // цвет кольца-декора (статический класс Tailwind)
  iconTint: string;
  ready: boolean;
}

const MODULES: ModuleCard[] = [
  {
    id: 'ser',
    title: 'Прогноз СЭР МО',
    description:
      'Сбор данных по показателям ОМСУ и ЦИО для формирования прогноза социально-экономического развития Московской области',
    icon: BarChart3,
    accent: 'from-sky-100/80 to-blue-200/70',
    ring: 'border-sky-200/60',
    iconTint: 'bg-sky-50 text-sky-700',
    ready: true,
  },
  {
    id: 'rating',
    title: 'Формирование Рейтинга ОМСУ',
    description:
      'Сбор и согласование значений показателей, расчёт и публикация рейтинга муниципальных образований Московской области',
    icon: ListOrdered,
    accent: 'from-amber-100/80 to-orange-200/60',
    ring: 'border-amber-200/60',
    iconTint: 'bg-amber-50 text-amber-700',
    ready: false,
  },
  {
    id: 'ukaz',
    title: 'Контроль исполнения Указа Президента РФ №607',
    description:
      'Мониторинг исполнения Указа Президента Российской Федерации №607 по территориям Московской области',
    icon: ClipboardCheck,
    accent: 'from-violet-100/80 to-purple-200/60',
    ring: 'border-violet-200/60',
    iconTint: 'bg-violet-50 text-violet-700',
    ready: false,
  },
];

export function Home({ onOpen }: { onOpen: (m: ModuleId) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f9fd] via-[#eef3f9] to-[#e6edf6] flex flex-col">
      <main className="flex-1 flex flex-col items-center px-4 pt-10 pb-14">
        <img src={GERB_MO} alt="Герб Московской области" className="h-28 w-auto select-none" draggable={false} />

        <h1 className="mt-6 max-w-4xl text-center text-lg md:text-2xl font-bold uppercase leading-snug tracking-wide text-[#1b3a5c]">
          Мониторинг социально-экономического развития Московской области
          с использованием типового регионального сегмента ГАС&nbsp;«Управление»
        </h1>
        <p className="mt-3 text-sm md:text-base text-slate-500">
          Автоматизированная информационно-аналитическая система
        </p>

        <div className="mt-10 grid w-full max-w-6xl gap-6 md:grid-cols-3">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => onOpen(m.id)}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {/* угловой декор */}
              <div
                className={`pointer-events-none absolute bottom-0 right-0 h-28 w-28 bg-gradient-to-tr ${m.accent}`}
                style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
              />
              <div
                className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full border-[10px] ${m.ring}`}
              />

              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${m.iconTint}`}>
                <m.icon className="h-6 w-6" />
              </div>

              <div className="text-sm md:text-base font-bold uppercase leading-snug tracking-wide text-[#1b3a5c]">
                {m.title}
              </div>
              <p className="mt-2 min-h-[60px] text-xs md:text-sm leading-relaxed text-slate-500">
                {m.description}
              </p>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium">
                {m.ready ? (
                  <span className="flex items-center gap-1.5 text-sky-700 transition-colors group-hover:text-sky-900">
                    Открыть модуль
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">В разработке</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/70 py-3">
        <div className="px-4 text-center text-xs text-slate-400">
          Прототип стартовой страницы портала ГАС «Управление» Московской области. Данные демонстрационные.
        </div>
      </footer>
    </div>
  );
}
