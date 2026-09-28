import React from 'react';
import {
  Newspaper,
  LineChart,
  ClipboardList,
  Award,
  MessageSquareQuote,
  FileText,
  FileCheck2,
} from 'lucide-react';

export type NavMenuItemId =
  | 'news'
  | 'monitoring'
  | 'input-approval'
  | 'omsu-indicators'
  | 'governor-appeals'
  | 'ukaz-548'
  | 'ukaz-193';

interface NewsNavMenuProps {
  activeItem?: NavMenuItemId;
  onSelectItem?: (itemId: NavMenuItemId) => void;
}

interface MenuItem {
  id: NavMenuItemId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  targetModule?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'news',
    label: 'Раздел новостей',
    icon: Newspaper,
  },
  {
    id: 'monitoring',
    label: 'Мониторинг и анализ целевых показателей',
    icon: LineChart,
    targetModule: 'ser',
  },
  {
    id: 'input-approval',
    label: 'Раздел ввода и согласования по целевым показателям',
    icon: ClipboardList,
    targetModule: 'ser',
  },
  {
    id: 'omsu-indicators',
    label: 'Ключевые показатели оценки деятельности ОМСУ',
    icon: Award,
    targetModule: 'rating',
  },
  {
    id: 'governor-appeals',
    label: 'Обращения губернатора',
    icon: MessageSquareQuote,
  },
  {
    id: 'ukaz-548',
    label: 'Указ Президента РФ № 548',
    icon: FileText,
    targetModule: 'ukaz',
  },
  {
    id: 'ukaz-193',
    label: 'Указ Президента РФ № 193',
    icon: FileCheck2,
    targetModule: 'ukaz',
  },
];

export const NewsNavMenu: React.FC<NewsNavMenuProps> = ({
  activeItem = 'news',
  onSelectItem,
}) => {
  return (
    <nav className="bg-gradient-to-r from-[#174673] via-[#1d578f] to-[#256cae] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center overflow-x-auto no-scrollbar py-1 gap-1">
          {MENU_ITEMS.map((item) => {
            const isActive = activeItem === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem && onSelectItem(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all relative ${
                  isActive
                    ? 'bg-white text-[#174673] font-semibold shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#174673]' : 'text-blue-200'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#174673]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
