import React from 'react';
import { GERB_MO } from '@/assets/gerb-mo';
import { useNews } from '@/context/NewsContext';
import { NEWS_ROLES } from '@/types/news';
import { LogOut, User, Shield } from 'lucide-react';

interface NewsHeaderProps {
  breadcrumbs?: { label: string; onClick?: () => void }[];
  onLogout?: () => void;
  onNavigateHome?: () => void;
}

export const NewsHeader: React.FC<NewsHeaderProps> = ({
  breadcrumbs = [
    { label: 'Московская область' },
    { label: 'Раздел новостей' },
    { label: 'Новостная страница' },
  ],
  onLogout,
  onNavigateHome,
}) => {
  const { currentRole, currentRoleInfo, userName, setRole, hasFullAccess } = useNews();

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      {/* Top utility / role bar */}
      <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">Типовой региональный сегмент ГАС «Управление» Московской области</span>
        </div>

        {/* Role Switcher in the top bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium mr-1">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>Текущая роль:</span>
          </div>

          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            {NEWS_ROLES.map((r) => {
              const isActive = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  title={r.description}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {r.name}
                  {r.hasFullAccess ? ' ⚡' : ' 👁'}
                </button>
              );
            })}
          </div>

          <div
            className={`text-[11px] px-2 py-0.5 rounded font-medium ml-2 ${
              hasFullAccess
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                : 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
            }`}
          >
            {hasFullAccess ? 'Полный доступ (Редактор)' : 'Только просмотр (Чтение)'}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Coat of arms & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateHome}
            title="На главную"
            className="shrink-0 transition-transform hover:scale-105 focus:outline-none"
          >
            <img
              src={GERB_MO}
              alt="Герб Московской области"
              className="h-14 w-auto object-contain drop-shadow-sm select-none"
              draggable={false}
            />
          </button>

          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-[#1b3a5c] uppercase tracking-tight leading-snug">
              Мониторинг показателей развития Московской области
            </h1>

            {/* Breadcrumbs */}
            <nav className="flex items-center flex-wrap gap-1.5 mt-1 text-xs text-slate-500 font-medium">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-slate-400">/</span>}
                    {crumb.onClick && !isLast ? (
                      <button
                        onClick={crumb.onClick}
                        className="hover:text-blue-700 hover:underline transition-colors"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className={isLast ? 'text-slate-800 font-semibold' : 'text-slate-500'}>
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right: User name, Role badge, and Logout link */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
              <User className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {userName}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span>{currentRoleInfo.organization}</span>
              </div>
            </div>
          </div>

          {/* Logout button / link */}
          <button
            onClick={onLogout}
            title="Выйти из системы"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 px-2.5 py-1.5 rounded-md hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
          >
            <LogOut className="h-4 w-4 text-slate-500 hover:text-red-600" />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
};
