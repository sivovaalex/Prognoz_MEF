import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from '@/lib/store';
import { NewsProvider, useNews } from '@/context/NewsContext';
import { ROLES, CURRENT_OMSU } from '@/lib/data';
import type { RoleId, AppState } from '@/lib/types';
import { Setup } from '@/pages/Setup';
import { OmsuForm } from '@/pages/OmsuForm';
import { CioWorkspace } from '@/pages/CioWorkspace';
import { MefManage } from '@/pages/MefManage';
import { RatingView, ZatoRatingView } from '@/pages/RatingView';
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
import { NoteAdmin } from '@/pages/note/NoteAdmin';
import { NoteCollection } from '@/pages/note/NoteCollection';
import { NoteOmsuWorkspace } from '@/pages/note/NoteOmsuWorkspace';
import { NoteCioWorkspace } from '@/pages/note/NoteCioWorkspace';
import { NoteOutputTables } from '@/pages/note/NoteOutputTables';
import { RatingMonitoringView } from '@/pages/RatingMonitoringView';
import { ContactsView } from '@/pages/ContactsView';
import { NewsListPage } from '@/pages/news/NewsListPage';
import { NewsEditPage } from '@/pages/news/NewsEditPage';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Landmark, UserRound, Home as HomeIcon, LogOut } from 'lucide-react';

type PageId = 'setup' | 'omsu' | 'cio' | 'mef-manage' | 'rating' | 'rating-zato' | 'report' | 'about' | 'users' | 'dicts' | 'output-tables' | 'mef-workspace'
  | 'note-admin' | 'note-collection' | 'note-omsu' | 'note-cio' | 'note-output'
  | 'rating-monitoring' | 'news' | 'news-create' | 'news-edit'
  | 'contacts-omsu' | 'contacts-cio' | 'contacts-mef';
type BlockId = 'mun' | 'obl' | 'params' | 'form2p' | 'long_term' | 'news_block' | 'admin_block' | 'ukaz_main' | 'rating_monitoring' | 'rating_main' | 'rating_view' | 'rating_contacts';

const BLOCK_LABELS: Record<BlockId, string> = {
  mun: 'Муниципальный прогноз',
  obl: 'Областной прогноз',
  params: 'Параметры СЭР',
  form2p: 'Форма 2П',
  long_term: 'Долгосрочный прогноз',
  news_block: 'Новости',
  admin_block: 'Администрирование',
  ukaz_main: 'Указ Президента РФ №607',
  rating_monitoring: 'Мониторинг хода сбора',
  rating_main: 'Показатели',
  rating_view: 'Рейтинг ОМСУ',
  rating_contacts: 'Контакты',
};

const getBlocks = (role: RoleId, module: ModuleId, settings: AppState['blockSettings']): BlockId[] => {
  let blocks: BlockId[] = [];
  if (module === 'ukaz') {
    blocks = role === 'admin' ? ['ukaz_main', 'news_block', 'admin_block'] : ['ukaz_main', 'news_block'];
  } else if (module === 'rating') {
    if (role === 'admin') blocks = ['rating_monitoring', 'rating_main', 'rating_view', 'rating_contacts', 'news_block', 'admin_block'];
    else if (role === 'mef') blocks = ['rating_monitoring', 'rating_main', 'rating_view', 'rating_contacts', 'news_block'];
    else if (role === 'cio') blocks = ['rating_monitoring', 'rating_main', 'rating_view', 'rating_contacts', 'news_block'];
    else blocks = ['rating_main', 'rating_view', 'rating_contacts', 'news_block']; // В личном кабинете ОМСУ ход сбора не отображается
  } else {
    if (role === 'admin') blocks = ['mun', 'obl', 'params', 'form2p', 'long_term', 'news_block', 'admin_block'];
    else if (role === 'mef' || role === 'cio') blocks = ['mun', 'obl', 'params', 'form2p', 'long_term', 'news_block'];
    else blocks = ['mun', 'obl', 'params', 'form2p', 'long_term', 'news_block']; // OMSU base blocks, filtered below
  }
  
  if (role !== 'admin' && role !== 'mef') {
    blocks = blocks.filter(b => {
      if (b === 'news_block' || b === 'rating_contacts') return true;
      if (b === 'rating_monitoring') return role !== 'omsu';
      if (b === 'rating_view' || b === 'admin_block') return true;
      return settings[b] && settings[b].approvers.includes(role);
    });
  }
  return blocks.length ? blocks : ['mun'];
};

const NAV: Record<RoleId, { id: PageId; label: string }[]> = {
  admin: [
    { id: 'setup', label: 'Настройка показателей' },
    { id: 'mef-manage', label: 'Управление сбором' },
    { id: 'output-tables', label: 'Выходные таблицы' },
  ],
  mef: [
    { id: 'mef-manage', label: 'Управление сбором' },
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

/** Вкладки подраздела «Пояснительная записка» (внутри блока «Муниципальный прогноз») */
const NOTE_NAV: Record<RoleId, { id: PageId; label: string }[]> = {
  admin: [
    { id: 'note-admin', label: 'Администрирование пояснительной записки' },
    { id: 'note-collection', label: 'Управление сбором' },
    { id: 'note-output', label: 'Выходные таблицы пояснительной записки' },
  ],
  mef: [
    { id: 'note-collection', label: 'Управление сбором' },
    { id: 'note-output', label: 'Выходные таблицы пояснительной записки' },
  ],
  cio: [
    { id: 'note-cio', label: 'Рабочее место ЦИО (ПЗ)' },
    { id: 'note-output', label: 'Выходные таблицы пояснительной записки' },
  ],
  omsu: [
    { id: 'note-omsu', label: 'Рабочее место ОМСУ (ПЗ)' },
    { id: 'note-output', label: 'Выходные таблицы пояснительной записки' },
  ],
};

const STUB_TITLES: Record<Exclude<ModuleId, 'ser'>, string> = {
  rating: 'Формирование Рейтинга ОМСУ',
  ukaz: 'Контроль исполнения Указа Президента РФ №607',
};

function Shell({
  activeModule,
  onHome,
  onLogout,
}: {
  activeModule: ModuleId;
  onHome: () => void;
  onLogout: () => void;
}) {
  const { state, dispatch } = useStore();
  const { currentRole: newsRole, setRole: setNewsRole } = useNews();
  const [role, setRole] = useState<RoleId>(newsRole as RoleId);
  const [page, setPage] = useState<PageId>('setup');
  const [block, setBlock] = useState<BlockId>('mun');
  const [subSection, setSubSection] = useState<'ind' | 'note'>('ind');
  const [currentOmsuId, setCurrentOmsuId] = useState<string>(CURRENT_OMSU);
  const [editNewsId, setEditNewsId] = useState<string | null>(null);

  // Synchronize role with NewsContext
  useEffect(() => {
    if (newsRole && newsRole !== role) {
      setRole(newsRole as RoleId);
    }
  }, [newsRole]);

  const currentOmsu = state.omsus.find((m) => m.id === currentOmsuId) || state.omsus.find((m) => m.id === CURRENT_OMSU);
  const isZatoOmsu = !!currentOmsu?.isZato;

  useEffect(() => {
    dispatch({ type: 'SET_MODULE', module: activeModule });
    const b = getBlocks(role, activeModule, state.blockSettings);
    setBlock(b[0]);
    if (b[0] === 'rating_monitoring') {
      setPage('rating-monitoring');
    } else if (b[0] === 'news_block') {
      setPage('news');
    } else {
      setPage(DEFAULT_PAGE[role]);
    }
    setSubSection('ind');
  }, [activeModule, dispatch]);

  const roleInfo = ROLES.find((r) => r.id === role)!;
  const notifs = state.notifications.filter((n) => n.forRoles.includes(role)).slice(-8).reverse();
  const availableBlocks = getBlocks(role, activeModule, state.blockSettings);

  const switchRole = (r: RoleId) => {
    setRole(r);
    setNewsRole(r);
    const avail = getBlocks(r, activeModule, state.blockSettings);
    const targetBlock = avail.includes(block) ? block : avail[0];
    setBlock(targetBlock);
    if (targetBlock === 'rating_monitoring') {
      setPage('rating-monitoring');
    } else if (targetBlock === 'news_block') {
      setPage('news');
    } else if (targetBlock === 'rating_contacts') {
      setPage(r === 'cio' ? 'contacts-cio' : 'contacts-omsu');
    } else if (targetBlock === 'rating_view' && r === 'omsu') {
      setPage(isZatoOmsu ? 'rating-zato' : 'rating');
    } else if (targetBlock === 'admin_block') {
      setPage('users');
    } else {
      setPage(DEFAULT_PAGE[r]);
    }
    setSubSection('ind');
  };

  const switchBlock = (b: BlockId) => {
    setBlock(b);
    if (b === 'admin_block') {
      setPage('users');
    } else if (b === 'news_block') {
      setPage('news');
    } else if (b === 'rating_monitoring') {
      setPage('rating-monitoring');
    } else if (b === 'rating_contacts') {
      setPage(role === 'cio' ? 'contacts-cio' : 'contacts-omsu');
    } else if (b === 'rating_view') {
      if (role === 'omsu') {
        setPage(isZatoOmsu ? 'rating-zato' : 'rating');
      } else {
        setPage('rating');
      }
    } else {
      setPage(DEFAULT_PAGE[role]);
    }
    setSubSection('ind');
  };

  const switchSubSection = (ss: 'ind' | 'note') => {
    setSubSection(ss);
    setPage(ss === 'note' ? NOTE_NAV[role][0].id : NAV[role][0].id);
  };

  // Build activeNav for the current block
  let activeNav = block === 'admin_block'
    ? [
        { id: 'users' as PageId, label: 'Управление пользователями' },
        { id: 'dicts' as PageId, label: 'Справочники' },
      ]
    : block === 'news_block'
      ? [
          { id: 'news' as PageId, label: 'Список новостей' },
        ]
    : block === 'rating_monitoring'
      ? [
          { id: 'rating-monitoring' as PageId, label: 'Мониторинг хода сбора данных' },
        ]
    : block === 'rating_contacts'
      ? (role === 'cio'
          ? [{ id: 'contacts-cio' as PageId, label: 'Контакты ЦИО по Рейтингу' }]
          : role === 'omsu'
            ? [{ id: 'contacts-omsu' as PageId, label: 'Контакты ОМСУ по Рейтингу' }]
            : [
                { id: 'contacts-omsu' as PageId, label: 'Контакты ОМСУ по Рейтингу' },
                { id: 'contacts-cio' as PageId, label: 'Контакты ЦИО по Рейтингу' },
                { id: 'contacts-mef' as PageId, label: 'Контакты МЭФ' },
              ]
        )
    : block === 'rating_view'
      ? (role === 'admin' || role === 'mef'
          ? [
              { id: 'rating' as PageId, label: 'Рейтинг ОМСУ' },
              { id: 'rating-zato' as PageId, label: 'Рейтинг ОМСУ ЗАТО' },
            ]
          : isZatoOmsu
            ? [{ id: 'rating-zato' as PageId, label: 'Рейтинг ОМСУ ЗАТО' }]
            : [{ id: 'rating' as PageId, label: 'Рейтинг ОМСУ' }]
        )
      : block === 'mun' && subSection === 'note'
        ? NOTE_NAV[role]
        : NAV[role];

  // Filter NAV tabs based on block settings
  if (block !== 'admin_block' && block !== 'news_block' && block !== 'rating_view' && block !== 'rating_monitoring' && block !== 'rating_contacts') {
    const approvers = state.blockSettings[block]?.approvers || [];
    activeNav = activeNav.filter(item => {
      if (item.id === 'omsu' || item.id === 'note-omsu') return approvers.includes('omsu');
      if (item.id === 'cio' || item.id === 'note-cio') return approvers.includes('cio');
      if (item.id === 'mef-workspace') return approvers.includes('mef');
      return true;
    });
  }

  const isNewsView = page === 'news' || page === 'news-create' || page === 'news-edit';

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
                Модуль «{activeModule === 'ukaz' ? 'Указ Президента РФ №607' : activeModule === 'rating' ? 'Формирование Рейтинга ОМСУ' : 'Прогноз СЭР МО'}» · служба техподдержки: support.mosreg.ru
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
              <span>Главная</span>
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

            {role === 'omsu' && (
              <div className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1">
                <span className="text-xs text-white/80 shrink-0 font-medium">ОМСУ:</span>
                <Select
                  value={currentOmsuId}
                  onValueChange={(v) => {
                    setCurrentOmsuId(v);
                    const selMun = state.omsus.find((m) => m.id === v);
                    if (block === 'rating_view') {
                      setPage(selMun?.isZato ? 'rating-zato' : 'rating');
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-[190px] border-0 bg-transparent text-white focus:ring-0 [&>span]:text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.omsus.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} {m.isZato ? '(ЗАТО)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            <button
              onClick={onLogout}
              title="Выйти из системы"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors bg-white/10 hover:bg-white/20 text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Выйти</span>
            </button>
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

        {/* Подразделы блока «Муниципальный прогноз» */}
        {block === 'mun' && (
          <div className="bg-[#eef4f9] border-b border-slate-200">
            <div className="w-full px-4 flex gap-1 pt-1">
              {([['ind', 'Показатели'], ['note', 'Пояснительная записка']] as const).map(([ss, label]) => (
                <button
                  key={ss}
                  onClick={() => switchSubSection(ss)}
                  className={`px-4 py-1.5 text-sm font-semibold border-b-2 transition-colors ${subSection === ss
                    ? 'border-[#1e5c8f] text-[#1e5c8f]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Вкладки активного блока */}
        <div className="bg-white border-b border-slate-200">
          <div className="w-full px-4 flex gap-1">
            {activeNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  page === item.id || (item.id === 'news' && isNewsView)
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
      {!isNewsView && (
        <div className="w-full px-4 py-2">
          <div className="rounded-md bg-white border px-3 py-2 text-xs text-muted-foreground flex flex-wrap gap-x-4">
            <span><b className="text-slate-700">{roleInfo.name}</b> · {roleInfo.org}</span>
            <span>Блок: <b className="text-slate-700">{BLOCK_LABELS[block]}</b></span>
            <span>{roleInfo.description}</span>
          </div>
        </div>
      )}

      <main className="w-full pb-10">
        {page === 'rating-monitoring' && <div className="px-4"><RatingMonitoringView role={role} /></div>}
        {(page === 'contacts-omsu' || page === 'contacts-cio' || page === 'contacts-mef') && (
          <div className="px-4"><ContactsView activeTab={page} role={role} /></div>
        )}
        {page === 'setup' && <div className="px-4"><Setup block={block} /></div>}
        {page === 'omsu' && <div className="px-4"><OmsuForm /></div>}
        {page === 'cio' && <div className="px-4"><CioWorkspace key={block} block={block} hideOmsuApprove={!(state.blockSettings[block]?.approvers || []).includes('omsu')} /></div>}
        {page === 'mef-manage' && <div className="px-4"><MefManage block={block} goRating={() => setPage('rating')} goReport={() => setPage('report')} /></div>}
        {page === 'rating' && <div className="px-4"><RatingView role={role} /></div>}
        {page === 'rating-zato' && <div className="px-4"><ZatoRatingView role={role} /></div>}
        {page === 'report' && <div className="px-4"><ReportView /></div>}
        {page === 'output-tables' && <div className="px-4"><OutputTablesView /></div>}
        {page === 'mef-workspace' && <div className="px-4"><MefWorkspace key={block} block={block} /></div>}
        {page === 'note-admin' && <div className="px-4"><NoteAdmin /></div>}
        {page === 'note-collection' && <div className="px-4"><NoteCollection /></div>}
        {page === 'note-omsu' && <div className="px-4"><NoteOmsuWorkspace /></div>}
        {page === 'note-cio' && <div className="px-4"><NoteCioWorkspace /></div>}
        {page === 'note-output' && <div className="px-4">{role === 'omsu' ? <NoteOutputTables fixedMunId={CURRENT_OMSU} /> : <NoteOutputTables />}</div>}
        {page === 'about' && <div className="px-4"><Description /></div>}
        {page === 'users' && <div className="px-4"><UserManagement /></div>}
        {page === 'dicts' && <div className="px-4"><DictsManagement /></div>}

        {/* Раздел «Новости» */}
        {page === 'news' && (
          <div className="px-4">
            <NewsListPage
              onNavigateCreate={() => setPage('news-create')}
              onNavigateEdit={(id) => {
                setEditNewsId(id);
                setPage('news-edit');
              }}
            />
          </div>
        )}
        {page === 'news-create' && (
          <div className="px-4">
            <NewsEditPage
              newsId={null}
              onNavigateBack={() => setPage('news')}
            />
          </div>
        )}
        {page === 'news-edit' && (
          <div className="px-4">
            <NewsEditPage
              newsId={editNewsId}
              onNavigateBack={() => setPage('news')}
            />
          </div>
        )}
      </main>

      <footer className="border-t bg-white py-3">
        <div className="w-full px-4 text-xs text-muted-foreground">
          Прототип доработки ИС «Конструктор форм» — модуль «{activeModule === 'ukaz' ? 'Указ Президента РФ №607' : activeModule === 'rating' ? 'Формирование Рейтинга ОМСУ' : 'Прогноз СЭР МО'}». Данные демонстрационные.
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
      <NewsProvider>
        {view === 'login' && <Login onLogin={() => setView('home')} />}
        {view === 'home' && <Home onOpen={openModule} />}
        {view === 'stub' && <ModuleStub title={STUB_TITLES[stubModule] || 'Модуль в разработке'} onBack={() => setView('home')} />}
        {view === 'app' && (
          <Shell
            activeModule={activeModule}
            onHome={() => setView('home')}
            onLogout={() => setView('login')}
          />
        )}
      </NewsProvider>
    </StoreProvider>
  );
}

