import React, { createContext, useContext, useReducer } from 'react';
import { VALUE_FIELDS, emptyValueFields } from './types';
import type { AppState, Indicator, RoleId, ValueFieldKey } from './types';
import { INITIAL_STATE } from './data';

/** Заполнено ли хотя бы одно поле значения */
function hasAnyValue(v: Record<ValueFieldKey, number | null>): boolean {
  return VALUE_FIELDS.some((f) => v[f.key] !== null);
}

const r2 = (v: number) => Math.round(v * 100) / 100;
function calcForecasts(v2026: number) {
  return {
    cons2027: r2(v2026 * 1.0),
    base2027: r2(v2026 * 1.02),
    cons2028: r2(v2026 * 1.01),
    base2028: r2(v2026 * 1.04),
    cons2029: r2(v2026 * 1.02),
    base2029: r2(v2026 * 1.06),
  };
}

export type Action =
  | { type: 'OMSU_SET_VALUE'; munId: string; indId: string; field: ValueFieldKey; value: number | null }
  | { type: 'OMSU_SIGN_SEND'; munId: string; indId: string; actor: string }
  | { type: 'OMSU_RECALL'; munId: string; indId: string; actor: string }
  | { type: 'CIO_APPROVE'; munId: string; indId: string; actor: string }
  | { type: 'CIO_RETURN'; munId: string; indId: string; actor: string; comment: string }
  | { type: 'CIO_SET_OWN'; cioIndId: string; cioId: string; field: ValueFieldKey; value: number | null }
  | { type: 'CIO_SIGN_OWN'; cioIndId: string; cioId: string; actor: string }
  | { type: 'CIO_RECALL_OWN'; cioIndId: string; cioId: string; actor: string }
  | { type: 'MEF_APPROVE'; cioIndId: string; cioId: string; actor: string }
  | { type: 'MEF_RETURN'; cioIndId: string; cioId: string; actor: string; comment: string }
  | { type: 'CAMPAIGN_SCHEDULE'; startDate: string; deadlineOmsu: string; deadlineCio: string; deadlineMef: string }
  | { type: 'CAMPAIGN_LAUNCH' }
  | { type: 'CAMPAIGN_STOP' }
  | { type: 'SET_RATING_MODE'; mode: 'preview' | 'final' }
  | { type: 'PUBLISH_FINAL' }
  | { type: 'ADD_INDICATOR'; indicator: Indicator }
  | { type: 'UPDATE_INDICATOR'; indicator: Indicator }
  | { type: 'NOTIFY'; text: string; forRoles: RoleId[] };

function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

let notifId = 100;

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'OMSU_SET_VALUE': {
      const cur = state.omsuValues[a.munId][a.indId];
      if (cur.status === 'approved' || cur.status === 'pending_cio') return state;
      const next = { ...cur, [a.field]: a.value, updatedAt: now(), comment: undefined };
      
      if (a.field === 'v2026') {
        if (typeof a.value === 'number') {
          Object.assign(next, calcForecasts(a.value));
        } else {
          Object.assign(next, { cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null });
        }
      }
      
      next.status = hasAnyValue(next) ? 'draft' : 'not_filled';
      return {
        ...state,
        omsuValues: {
          ...state.omsuValues,
          [a.munId]: {
            ...state.omsuValues[a.munId],
            [a.indId]: next,
          },
        },
      };
    }
    case 'OMSU_SIGN_SEND': {
      const cur = state.omsuValues[a.munId][a.indId];
      if (cur.v2026 === null) return state;
      if (cur.status !== 'draft' && cur.status !== 'returned') return state;
      return {
        ...state,
        omsuValues: {
          ...state.omsuValues,
          [a.munId]: {
            ...state.omsuValues[a.munId],
            [a.indId]: { ...cur, status: 'pending_cio', updatedAt: now(), signedBy: a.actor, comment: undefined },
          },
        },
        history: [...state.history, { at: now(), actor: `ОМСУ (${a.actor})`, action: `Показатель подписан ЭЦП и направлен на согласование отраслевому ЦИО` }],
      };
    }
    case 'OMSU_RECALL': {
      const cur = state.omsuValues[a.munId][a.indId];
      if (cur.status !== 'pending_cio') return state;
      return {
        ...state,
        omsuValues: {
          ...state.omsuValues,
          [a.munId]: {
            ...state.omsuValues[a.munId],
            [a.indId]: { ...cur, status: 'draft', updatedAt: now() },
          },
        },
        history: [...state.history, { at: now(), actor: `ОМСУ (${a.actor})`, action: `Показатель отозван с согласования для изменения` }],
      };
    }
    case 'CIO_APPROVE': {
      const cur = state.omsuValues[a.munId][a.indId];
      if (cur.status !== 'pending_cio') return state;
      return {
        ...state,
        omsuValues: {
          ...state.omsuValues,
          [a.munId]: {
            ...state.omsuValues[a.munId],
            [a.indId]: { ...cur, status: 'approved', updatedAt: now() },
          },
        },
        history: [...state.history, { at: now(), actor: `ЦИО (${a.actor})`, action: `Показатель ОМСУ согласован. Изменение заблокировано` }],
      };
    }
    case 'CIO_RETURN': {
      const cur = state.omsuValues[a.munId][a.indId];
      if (cur.status !== 'pending_cio') return state;
      return {
        ...state,
        omsuValues: {
          ...state.omsuValues,
          [a.munId]: {
            ...state.omsuValues[a.munId],
            [a.indId]: { ...cur, status: 'returned', updatedAt: now(), comment: a.comment },
          },
        },
        notifications: [...state.notifications, { id: ++notifId, at: now(), text: `Показатель возвращён ЦИО на доработку: ${a.comment}`, forRoles: ['omsu'] }],
        history: [...state.history, { at: now(), actor: `ЦИО (${a.actor})`, action: `Показатель ОМСУ возвращён на доработку` }],
      };
    }
    case 'CIO_SET_OWN': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (cur && (cur.status === 'approved' || cur.status === 'pending_mef')) return state;
      const base0 = cur ?? { ...emptyValueFields(), status: 'not_filled' as const, updatedAt: null };
      const next = { ...base0, [a.field]: a.value, updatedAt: now(), comment: undefined };
      
      if (a.field === 'v2026') {
        if (typeof a.value === 'number') {
          Object.assign(next, calcForecasts(a.value));
        } else {
          Object.assign(next, { cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null });
        }
      }

      next.status = hasAnyValue(next) ? 'draft' : 'not_filled';
      return {
        ...state,
        cioValues: {
          ...state.cioValues,
          [a.cioIndId]: {
            ...(state.cioValues[a.cioIndId] ?? {}),
            [a.cioId]: next,
          },
        },
      };
    }
    case 'CIO_SIGN_OWN': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (!cur || cur.v2026 === null) return state;
      if (cur.status !== 'draft' && cur.status !== 'returned') return state;
      return {
        ...state,
        cioValues: {
          ...state.cioValues,
          [a.cioIndId]: { ...state.cioValues[a.cioIndId], [a.cioId]: { ...cur, status: 'pending_mef', updatedAt: now(), signedBy: a.actor } },
        },
        history: [...state.history, { at: now(), actor: `ЦИО (${a.actor})`, action: `Собственный показатель подписан ЭЦП и направлен на согласование в МЭФ` }],
      };
    }
    case 'CIO_RECALL_OWN': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (!cur || cur.status !== 'pending_mef') return state;
      return {
        ...state,
        cioValues: {
          ...state.cioValues,
          [a.cioIndId]: { ...state.cioValues[a.cioIndId], [a.cioId]: { ...cur, status: 'draft', updatedAt: now() } },
        },
      };
    }
    case 'MEF_APPROVE': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (!cur || cur.status !== 'pending_mef') return state;
      return {
        ...state,
        cioValues: {
          ...state.cioValues,
          [a.cioIndId]: { ...state.cioValues[a.cioIndId], [a.cioId]: { ...cur, status: 'approved', updatedAt: now() } },
        },
        history: [...state.history, { at: now(), actor: `МЭФ (${a.actor})`, action: `Данные ЦИО согласованы` }],
      };
    }
    case 'MEF_RETURN': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (!cur || cur.status !== 'pending_mef') return state;
      return {
        ...state,
        cioValues: {
          ...state.cioValues,
          [a.cioIndId]: { ...state.cioValues[a.cioIndId], [a.cioId]: { ...cur, status: 'returned', updatedAt: now(), comment: a.comment } },
        },
        notifications: [...state.notifications, { id: ++notifId, at: now(), text: `Показатель ЦИО возвращён МЭФ на доработку: ${a.comment}`, forRoles: ['cio'] }],
      };
    }
    case 'CAMPAIGN_SCHEDULE':
      return {
        ...state,
        campaign: { ...state.campaign, status: 'scheduled', startDate: a.startDate, deadlineOmsu: a.deadlineOmsu, deadlineCio: a.deadlineCio, deadlineMef: a.deadlineMef },
        history: [...state.history, { at: now(), actor: 'Куратор МЭФ', action: `Установлена дата запуска сбора: ${a.startDate}` }],
      };
    case 'CAMPAIGN_LAUNCH':
      return {
        ...state,
        campaign: { ...state.campaign, status: 'collecting', launchedAt: now() },
        notifications: [...state.notifications, { id: ++notifId, at: now(), text: `Начат сбор данных «${state.campaign.name} — ${state.campaign.period}». Формы разосланы ОМСУ и ЦИО`, forRoles: ['omsu', 'cio', 'mef'] }],
        history: [...state.history, { at: now(), actor: 'КФ (автоматически)', action: 'Разосланы уведомления и формы ОМСУ и ЦИО' }],
      };
    case 'CAMPAIGN_STOP':
      return {
        ...state,
        campaign: { ...state.campaign, status: 'scheduled' },
        notifications: [...state.notifications, { id: ++notifId, at: now(), text: `Сбор данных «${state.campaign.name} — ${state.campaign.period}» остановлен куратором МЭФ`, forRoles: ['omsu', 'cio', 'mef'] }],
        history: [...state.history, { at: now(), actor: 'Куратор МЭФ', action: 'Остановлен сбор данных' }],
      };
    case 'SET_RATING_MODE':
      return { ...state, ratingMode: a.mode };
    case 'PUBLISH_FINAL':
      return {
        ...state,
        finalPublished: true,
        campaign: { ...state.campaign, status: 'completed' },
        history: [...state.history, { at: now(), actor: 'Куратор МЭФ', action: 'Сформирован и опубликован итоговый сводный рейтинг' }],
      };
    case 'ADD_INDICATOR':
      return { ...state, indicators: [...state.indicators, a.indicator] };
    case 'UPDATE_INDICATOR':
      return { ...state, indicators: state.indicators.map((i) => (i.id === a.indicator.id ? a.indicator : i)) };
    case 'NOTIFY':
      return { ...state, notifications: [...state.notifications, { id: ++notifId, at: now(), text: a.text, forRoles: a.forRoles }] };
    default:
      return state;
  }
}

const StoreCtx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> }>({
  state: INITIAL_STATE,
  dispatch: () => undefined,
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  return useContext(StoreCtx);
}
