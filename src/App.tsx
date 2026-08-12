import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from '@/lib/store';
import { ROLES } from '@/lib/data';
import type { RoleId, AppState } from '@/lib/types';
import { Overview } from '@/pages/Overview';
import { Setup } from '@/pages/Setup';
import { OmsuForm } from '@/pages/OmsuForm';
import { CioWorkspace } from '@/pages/CioWorkspace';
import { MefManage } from '@/pages/MefManage';
import { RatingView } from '@/pages/RatingView';
import { ReportView } from '@/pages/ReportView';
import { Description } from '@/pages/Description';
import { Home } from '@/pages/Home';
import { UserManagement } from '@/pages/UserManagement';
import { DictsManagement } from '@/pages/DictsManagement';
import { OutputTablesView } from '@/pages/OutputTablesView';
import type { ModuleId } from '@/pages/Home';
import { ModuleStub } from '@/pages/ModuleStub';
import { Login } from '@/pages/Login';
import { MefWorkspace } from '@/pages/MefWorkspace';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Landmark, UserRound, Home as HomeIcon } from 'lucide-react';

type PageId = 'overview' | 'setup' | 'omsu' | 'cio' | 'mef-manage' | 'rating' | 'report' | 'about' | 'users' | 'dicts' | 'output-tables' | 'mef-workspace';
type BlockId = 'mun' | 'obl' | 'params' | 'form2p' | 'long_term' | 'admin_block' | 'ukaz_main' | 'rating_main' | 'rating_view';

const BLOCK_LABELS: Record<BlockId, string> = {
  mun: 'Муниципальный прогноз',
  obl: 'Областной прогноз',
  params: 'Параметры СЭР',
  form2p: 'Форма 2П',
  long_term: 'Долгосрочный прогноз',
  admin_block: 'Администрирование',
  ukaz_main: 'Указ Президента РФ №607',
  rating_main: 'Показатели',
  rating_view: 'Рейтинг ОМСУ',
};

const getBlocks = (role: RoleId, module: ModuleId, settings: AppState['blockSettings']): BlockId[] => {
  let blocks: BlockId[] = [];
  if (module === 'ukaz') {
    blocks = role === 'admin' ? ['ukaz_main', 'admin_block'] : ['ukaz_main'];
  } else if (module === 'rating') {
    if (role === 'admin') blocks = ['rating_main', 'rating_view', 'admin_block'];
    else if (role === 'mef') blocks = ['rating_main', 'rating_view'];
    else blocks = ['rating_main'];
  } else {
    if (role === 'admin') blocks = ['mun', 'obl', 'params', 'form2p', 'long_term', 'admin_block'];
    else if (role === 'mef' || role === 'cio') blocks = ['mun', 'obl', 'params', 'form2p', 'long_term'];
    else blocks = ['mun', 'obl', 'params', 'form2p', 'long_term']; // OMSU base blocks, filtered below
  }
  
  if (role !== 'admin' && role !== 'mef') {
    blocks = blocks.filter(b => b === 'rating_view' || b === 'admin_block' || (settings[b] && settings[b].approvers.includes(role)));
  }
  return blocks.length ? blocks : ['mun'];
};

const NAV: Record<RoleId, { id: PageId; label: string }[]> = {
  admin: [
    { id: 'overview', label: 'Обзор сбора' },
    { id: 'setup', label: 'Настройка показателей' },
    { id: 'mef-manage', label: 'Управление' },
    { id: 'output-tables', label: 'Выходные таблицы' },
  ],
  mef: [
    { id: 'overview', label: 'Обзор сбора' },
    { id: 'mef-manage', label: 'Управление' },
    { id: 'output-tables', label: 'Выходные таблицы' },
    { id: 'mef-workspace', label: 'Рабочее место МЭФ' },
  ],
  cio: [
    { id: 'cio', label: 'Рабочее место ЦИО' },
  ],
  omsu: [
    { id: 'omsu', label: 'Рабочее место ОМСУ' },
  ],
};

const DEFAULT_PAGE: Record<RoleId, PageId> = {
  admin: 'setup',
  mef: 'mef-manage',
  cio: 'cio',
  omsu: 'omsu',
};

const STUB_TITLES: Record<Exclude<ModuleId, 'ser'>, string> = {
  rating: 'Формирование Рейтинга ОМСУ',
  ukaz: 'Контроль исполнения Указа Президента РФ №607',
};

function Shell({ activeModule, onHome }: { activeModule: ModuleId, onHome: () => void }) {
  const { state, dispatch } = useStore();
  const [role, setRole] = useState<RoleId>('admin');
  const [page, setPage] = useState<PageId>('setup');
  const [block, setBlock] = useState<BlockId>('mun');

  useEffect(() => {
    dispatch({ type: 'SET_MODULE', module: activeModule });
    const b = getBlocks(role, activeModule, state.blockSettings);
    setBlock(b[0]);
    setPage(DEFAULT_PAGE[role]);
  }, [activeModule, dispatch]);

  const roleInfo = ROLES.find((r) => r.id === role)!;
  const notifs = state.notifications.filter((n) => n.forRoles.includes(role)).slice(-8).reverse();
  const availableBlocks = getBlocks(role, activeModule, state.blockSettings);

  const switchRole = (r: RoleId) => {
    setRole(r);
    setBlock(getBlocks(r, activeModule, state.blockSettings)[0]);
    setPage(DEFAULT_PAGE[r]);
  };

  const switchBlock = (b: BlockId) => {
    setBlock(b);
    setPage(b === 'admin_block' ? 'users' : DEFAULT_PAGE[role]);
  };

  let activeNav = block === 'admin_block'
    ? [
        { id: 'users' as PageId, label: 'Управление пользователями' },
        { id: 'dicts' as PageId, label: 'Справочники' },
      ]
    : block === 'rating_view'
      ? [{ id: 'rating' as PageId, label: 'Рейтинг ОМСУ' }]
      : NAV[role];
      
  // Filter NAV tabs based on block settings
  if (block !== 'admin_block' && block !== 'rating_view') {
    const approvers = state.blockSettings[block]?.approvers || [];
    activeNav = activeNav.filter(item => {
      if (item.id === 'omsu') return approvers.includes('omsu');
      if (item.id === 'cio') return approvers.includes('cio');
      if (item.id === 'mef-workspace') return approvers.includes('mef');
      return true;
    });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Шапка в стиле ГАС "Управление" МО */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#1e5c8f] via-[#2a6ea6] to-[#3a83bd] text-white shadow">
        <div className="w-full px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 shrink-0">
              <Landmark className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold leading-tight truncate">
                ГАС «Управление» МО · Конструктор форм
              </div>
              <div className="text-xs text-white/80">
                Модуль «{activeModule === 'ukaz' ? 'Указ Президента РФ №607' : 'Прогноз СЭР МО'}» · служба техподдержки: support.mosreg.ru
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={onHome}
              title="К списку модулей"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors bg-white/15 hover:bg-white/25 text-white"
            >
              <HomeIcon className="h-4 w-4" />
              К списку модулей
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
                  <Bell className="h-5 w-5" />
                  {notifs.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">
                      {notifs.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="border-b px-3 py-2 text-sm font-medium">Уведомления</div>
                <ul className="max-h-72 overflow-auto">
                  {notifs.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">Нет уведомлений</li>}
                  {notifs.map((n) => (
                    <li key={n.id} className="border-b px-3 py-2 text-sm last:border-0">
                      <div className="text-xs text-muted-foreground">{n.at}</div>
                      {n.text}
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2 rounded-md bg-white/10 px-2 py-1">
              <UserRound className="h-4 w-4" />
              <Select value={role} onValueChange={(v) => switchRole(v as RoleId)}>
                <SelectTrigger className="h-8 w-[240px] border-0 bg-transparent text-white focus:ring-0 [&>span]:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Блоки модуля */}
        <div className="bg-[#16486f]/60">
          <div className="w-full px-4 flex gap-1">
            {availableBlocks.map((b) => (
              <button
                key={b}
                onClick={() => switchBlock(b)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${block === b
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white'
                  }`}
              >
                {BLOCK_LABELS[b]}
              </button>
            ))}
          </div>
        </div>

        {/* Вкладки активного блока */}
        <div className="bg-white border-b border-slate-200">
          <div className="w-full px-4 flex gap-1">
            {activeNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${page === item.id
                    ? 'border-[#1e5c8f] text-[#1e5c8f]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Контекст роли */}
      <div className="w-full px-4 py-2">
        <div className="rounded-md bg-white border px-3 py-2 text-xs text-muted-foreground flex flex-wrap gap-x-4">
          <span><b className="text-slate-700">{roleInfo.name}</b> · {roleInfo.org}</span>
          <span>Блок: <b className="text-slate-700">{BLOCK_LABELS[block]}</b></span>
          <span>{roleInfo.description}</span>
        </div>
      </div>

      <main className="w-full px-4 pb-10">
        {page === 'overview' && <Overview role={role} />}
        {page === 'setup' && <Setup block={block} />}
        {page === 'omsu' && <OmsuForm />}
        {page === 'cio' && <CioWorkspace key={block} block={block} hideOmsuApprove={!(state.blockSettings[block]?.approvers || []).includes('omsu')} />}
        {page === 'mef-manage' && <MefManage goRating={() => setPage('rating')} goReport={() => setPage('report')} />}
        {page === 'rating' && <RatingView />}
        {page === 'report' && <ReportView />}
        {page === 'output-tables' && <OutputTablesView />}
        {page === 'mef-workspace' && <MefWorkspace />}
        {page === 'about' && <Description />}
        {page === 'users' && <UserManagement />}
        {page === 'dicts' && <DictsManagement />}
      </main>

      <footer className="border-t bg-white py-3">
        <div className="w-full px-4 text-xs text-muted-foreground">
          Прототип доработки ИС «Конструктор форм» — модуль «Прогноз СЭР МО». Данные демонстрационные.
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'login' | 'home' | 'app' | 'stub'>('login');
  const [activeModule, setActiveModule] = useState<ModuleId>('ser');
  const [stubModule, setStubModule] = useState<Exclude<ModuleId, 'ser' | 'ukaz' | 'rating'>>('rating' as any);

  const openModule = (m: ModuleId) => {
    if (m === 'ser' || m === 'ukaz' || m === 'rating') {
      setActiveModule(m);
      setView('app');
    } else {
      setStubModule(m as any);
      setView('stub');
    }
  };

  return (
    <StoreProvider>
      {view === 'login' && <Login onLogin={() => setView('home')} />}
      {view === 'home' && <Home onOpen={openModule} />}
      {view === 'stub' && <ModuleStub title={STUB_TITLES[stubModule]} onBack={() => setView('home')} />}
      {view === 'app' && <Shell activeModule={activeModule} onHome={() => setView('home')} />}
    </StoreProvider>
  );
}
