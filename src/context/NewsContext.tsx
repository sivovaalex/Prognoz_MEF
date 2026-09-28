import React, { createContext, useContext, useState, useEffect } from 'react';
import type { NewsItem, NewsRoleId, NewsRoleInfo, AttachedFile } from '@/types/news';
import { INITIAL_NEWS, NEWS_ROLES } from '@/types/news';

interface NewsContextType {
  news: NewsItem[];
  currentRole: NewsRoleId;
  currentRoleInfo: NewsRoleInfo;
  userName: string;
  hasFullAccess: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  isReadOnly: boolean;
  setRole: (role: NewsRoleId) => void;
  addNews: (newsData: { title: string; date: string; content: string; attachedFile?: AttachedFile | null }) => string;
  updateNews: (id: string, newsData: { title: string; date: string; content: string; attachedFile?: AttachedFile | null }) => boolean;
  deleteNews: (id: string) => boolean;
  getNewsById: (id: string) => NewsItem | undefined;
  resetNewsToDefaults: () => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

const STORAGE_KEY_NEWS = 'prognoz_mef_news_data';
const STORAGE_KEY_ROLE = 'prognoz_mef_active_role';

const ROLE_USERNAMES: Record<NewsRoleId, string> = {
  admin: 'Иванов И.И. (Администратор)',
  mef: 'Кузнецова О.В. (МЭФ МО)',
  omsu: 'Смирнов А.С. (ОМСУ Балашиха)',
  cio: 'Васильев П.Н. (Мининвест МО)',
};

export const NewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [news, setNews] = useState<NewsItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NEWS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load news from storage', e);
    }
    return INITIAL_NEWS;
  });

  const [currentRole, setCurrentRole] = useState<NewsRoleId>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROLE);
      if (stored && ['admin', 'mef', 'omsu', 'cio'].includes(stored)) {
        return stored as NewsRoleId;
      }
    } catch (e) {
      console.error('Failed to load role from storage', e);
    }
    return 'admin';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NEWS, JSON.stringify(news));
    } catch (e) {
      console.error('Failed to save news to storage', e);
    }
  }, [news]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, currentRole);
    } catch (e) {
      console.error('Failed to save role to storage', e);
    }
  }, [currentRole]);

  const currentRoleInfo = NEWS_ROLES.find((r) => r.id === currentRole) || NEWS_ROLES[0];
  const hasFullAccess = currentRole === 'admin' || currentRole === 'mef';
  const canEdit = hasFullAccess;
  const canCreate = hasFullAccess;
  const canDelete = hasFullAccess;
  const isReadOnly = !hasFullAccess;
  const userName = ROLE_USERNAMES[currentRole] || 'Пользователь системы';

  const setRole = (role: NewsRoleId) => {
    setCurrentRole(role);
  };

  const addNews = (newsData: { title: string; date: string; content: string; attachedFile?: AttachedFile | null }): string => {
    if (!hasFullAccess) {
      console.warn('Action not allowed for role:', currentRole);
      return '';
    }

    const newId = `news-${Date.now()}`;
    const newItem: NewsItem = {
      id: newId,
      title: newsData.title.trim() || 'Без заголовка',
      date: newsData.date.trim() || new Date().toLocaleDateString('ru-RU'),
      content: newsData.content,
      attachedFile: newsData.attachedFile || null,
      author: currentRoleInfo.fullName,
      createdAt: new Date().toLocaleString('ru-RU'),
    };

    setNews((prev) => [newItem, ...prev]);
    return newId;
  };

  const updateNews = (id: string, newsData: { title: string; date: string; content: string; attachedFile?: AttachedFile | null }): boolean => {
    if (!hasFullAccess) {
      console.warn('Action not allowed for role:', currentRole);
      return false;
    }

    let found = false;
    setNews((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          found = true;
          return {
            ...item,
            title: newsData.title.trim() || item.title,
            date: newsData.date.trim() || item.date,
            content: newsData.content,
            attachedFile: newsData.attachedFile !== undefined ? newsData.attachedFile : item.attachedFile,
            updatedAt: new Date().toLocaleString('ru-RU'),
          };
        }
        return item;
      })
    );
    return found;
  };

  const deleteNews = (id: string): boolean => {
    if (!hasFullAccess) {
      console.warn('Action not allowed for role:', currentRole);
      return false;
    }

    setNews((prev) => prev.filter((item) => item.id !== id));
    return true;
  };

  const getNewsById = (id: string): NewsItem | undefined => {
    return news.find((item) => item.id === id);
  };

  const resetNewsToDefaults = () => {
    setNews(INITIAL_NEWS);
    localStorage.removeItem(STORAGE_KEY_NEWS);
  };

  return (
    <NewsContext.Provider
      value={{
        news,
        currentRole,
        currentRoleInfo,
        userName,
        hasFullAccess,
        canEdit,
        canCreate,
        canDelete,
        isReadOnly,
        setRole,
        addNews,
        updateNews,
        deleteNews,
        getNewsById,
        resetNewsToDefaults,
      }}
    >
      {children}
    </NewsContext.Provider>
  );
};

export const useNews = (): NewsContextType => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
};
