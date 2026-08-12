import React, { createContext, useContext, useReducer } from 'react';
import { VALUE_FIELDS, emptyValueFields } from './types';
import type { AppState, Indicator, Direction, RoleId, ValueFieldKey } from './types';
import { buildInitialState } from './data';

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
  | { type: 'MEF_SET_OWN'; cioIndId: string; cioId: string; field: ValueFieldKey; value: number | null }
  | { type: 'MEF_TERR_SET_VALUE'; cioId: string; indId: string; munId: string; field: ValueFieldKey; value: number | null }
  | { type: 'MEF_APPROVE'; cioIndId: string; cioId: string; actor: string }
  | { type: 'MEF_RETURN'; cioIndId: string; cioId: string; actor: string; comment: string }
  | { type: 'MEF_TERR_APPROVE'; cioId: string; indId: string; munId: string; actor: string }
  | { type: 'MEF_TERR_RETURN'; cioId: string; indId: string; munId: string; actor: string; comment: string }
  | { type: 'CAMPAIGN_SCHEDULE'; startDate: string; deadlineOmsu: string; deadlineCio: string; deadlineMef: string }
  | { type: 'CAMPAIGN_LAUNCH' }
  | { type: 'CAMPAIGN_STOP' }
  | { type: 'SET_RATING_MODE'; mode: 'preview' | 'final' }
  | { type: 'PUBLISH_FINAL' }
  | { type: 'ADD_INDICATOR'; indicator: Indicator }
  | { type: 'UPDATE_INDICATOR'; indicator: Indicator }
  | { type: 'ADD_DIRECTION'; direction: Direction }
  | { type: 'UPDATE_DIRECTION'; direction: Direction }
  | { type: 'NOTIFY'; text: string; forRoles: RoleId[] }
  | { type: 'SET_MODULE'; module: string }
  | { type: 'ADD_DICT_ITEM'; dict: 'cios' | 'omsus' | 'units'; item: any }
  | { type: 'UPDATE_DICT_ITEM'; dict: 'cios' | 'omsus' | 'units'; item: any }
  | { type: 'TOGGLE_DICT_ITEM'; dict: 'cios' | 'omsus' | 'units'; id: string }
  | { type: 'UPDATE_BLOCK_SETTINGS'; block: string; approvers: ('omsu' | 'cio' | 'mef')[] }
  | { type: 'CIO_TERR_SET_VALUE'; cioId: string; indId: string; munId: string; field: ValueFieldKey; value: number | null }
  | { type: 'CIO_TERR_SIGN'; cioId: string; indId: string; munId: string; actor: string }
  | { type: 'CIO_TERR_RECALL'; cioId: string; indId: string; munId: string; actor: string };

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
    case 'MEF_SET_OWN': {
      const cur = state.mefValues[a.cioIndId]?.[a.cioId] || { ...emptyValueFields(), status: 'not_filled', updatedAt: null };
      const next = { ...cur, [a.field]: a.value, updatedAt: now(), status: 'draft' as const };
      if (a.field === 'v2026') {
        if (typeof a.value === 'number') {
          Object.assign(next, calcForecasts(a.value));
        } else {
          Object.assign(next, { cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null });
        }
      }
      return {
        ...state,
        mefValues: {
          ...state.mefValues,
          [a.cioIndId]: { ...(state.mefValues[a.cioIndId] || {}), [a.cioId]: next },
        },
      };
    }
    case 'MEF_TERR_SET_VALUE': {
      const cur = state.mefTerritoryValues[a.cioId]?.[a.indId]?.[a.munId] || { ...emptyValueFields(), status: 'not_filled', updatedAt: null };
      const next = { ...cur, [a.field]: a.value, updatedAt: now(), status: 'draft' as const };
      if (a.field === 'v2026') {
        if (typeof a.value === 'number') {
          Object.assign(next, calcForecasts(a.value));
        } else {
          Object.assign(next, { cons2027: null, base2027: null, cons2028: null, base2028: null, cons2029: null, base2029: null });
        }
      }
      return {
        ...state,
        mefTerritoryValues: {
          ...state.mefTerritoryValues,
          [a.cioId]: {
            ...(state.mefTerritoryValues[a.cioId] || {}),
            [a.indId]: { ...(state.mefTerritoryValues[a.cioId]?.[a.indId] || {}), [a.munId]: next },
          },
        },
      };
    }
    case 'MEF_APPROVE': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (!cur || cur.status !== 'pending_mef') return state;
      const mefCur = state.mefValues[a.cioIndId]?.[a.cioId] || { ...emptyValueFields(), status: 'not_filled', updatedAt: null };
      return {
        ...state,
        cioValues: {
          ...state.cioValues,
          [a.cioIndId]: { ...state.cioValues[a.cioIndId], [a.cioId]: { ...cur, status: 'approved', updatedAt: now() } },
        },
        mefValues: {
          ...state.mefValues,
          [a.cioIndId]: { ...(state.mefValues[a.cioIndId] || {}), [a.cioId]: { ...mefCur, status: 'approved', updatedAt: now() } },
        },
        history: [...state.history, { at: now(), actor: `МЭФ (${a.actor})`, action: `Данные ЦИО согласованы` }],
      };
    }
    case 'MEF_RETURN': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (!cur || cur.status !== 'pending_mef') return state;
      const mefCur = state.mefValues[a.cioIndId]?.[a.cioId] || { ...emptyValueFields(), status: 'not_filled', updatedAt: null };
      return {
        ...state,
        cioValues: {
          ...state.cioValues,
          [a.cioIndId]: { ...state.cioValues[a.cioIndId], [a.cioId]: { ...cur, status: 'returned', updatedAt: now(), comment: a.comment } },
        },
        mefValues: {
          ...state.mefValues,
          [a.cioIndId]: { ...(state.mefValues[a.cioIndId] || {}), [a.cioId]: { ...mefCur, status: 'not_filled', updatedAt: now() } },
        },
        notifications: [...state.notifications, { id: ++notifId, at: now(), text: `Показатель ЦИО возвращён МЭФ на доработку: ${a.comment}`, forRoles: ['cio'] }],
      };
    }
    case 'MEF_TERR_APPROVE': {
      const cur = state.cioTerritoryValues[a.cioId]?.[a.indId]?.[a.munId];
      if (!cur || cur.status !== 'pending_mef') return state;
      const mefCur = state.mefTerritoryValues[a.cioId]?.[a.indId]?.[a.munId] || { ...emptyValueFields(), status: 'not_filled', updatedAt: null };
      return {
        ...state,
        cioTerritoryValues: {
          ...state.cioTerritoryValues,
          [a.cioId]: {
            ...state.cioTerritoryValues[a.cioId],
            [a.indId]: { ...state.cioTerritoryValues[a.cioId]?.[a.indId], [a.munId]: { ...cur, status: 'approved', updatedAt: now() } },
          },
        },
        mefTerritoryValues: {
          ...state.mefTerritoryValues,
          [a.cioId]: {
            ...(state.mefTerritoryValues[a.cioId] || {}),
            [a.indId]: { ...(state.mefTerritoryValues[a.cioId]?.[a.indId] || {}), [a.munId]: { ...mefCur, status: 'approved', updatedAt: now() } },
          },
        },
        history: [...state.history, { at: now(), actor: `МЭФ (${a.actor})`, action: `Данные территории ЦИО согласованы` }],
      };
    }
    case 'MEF_TERR_RETURN': {
      const cur = state.cioTerritoryValues[a.cioId]?.[a.indId]?.[a.munId];
      if (!cur || cur.status !== 'pending_mef') return state;
      const mefCur = state.mefTerritoryValues[a.cioId]?.[a.indId]?.[a.munId] || { ...emptyValueFields(), status: 'not_filled', updatedAt: null };
      return {
        ...state,
        cioTerritoryValues: {
          ...state.cioTerritoryValues,
          [a.cioId]: {
            ...state.cioTerritoryValues[a.cioId],
            [a.indId]: { ...state.cioTerritoryValues[a.cioId]?.[a.indId], [a.munId]: { ...cur, status: 'returned', updatedAt: now(), comment: a.comment } },
          },
        },
        mefTerritoryValues: {
          ...state.mefTerritoryValues,
          [a.cioId]: {
            ...(state.mefTerritoryValues[a.cioId] || {}),
            [a.indId]: { ...(state.mefTerritoryValues[a.cioId]?.[a.indId] || {}), [a.munId]: { ...mefCur, status: 'not_filled', updatedAt: now() } },
          },
        },
        notifications: [...state.notifications, { id: ++notifId, at: now(), text: `Территория возвращена МЭФ на доработку: ${a.comment}`, forRoles: ['cio'] }],
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
    case 'ADD_DIRECTION':
      return { ...state, directions: [...state.directions, a.direction] };
    case 'UPDATE_DIRECTION':
      return { ...state, directions: state.directions.map((d) => (d.id === a.direction.id ? a.direction : d)) };
    case 'NOTIFY':
      return { ...state, notifications: [...state.notifications, { id: ++notifId, at: now(), text: a.text, forRoles: a.forRoles }] };
    case 'SET_MODULE':
      return buildInitialState(a.module);
    case 'ADD_DICT_ITEM':
      return { ...state, [a.dict]: [...state[a.dict], a.item] };
    case 'UPDATE_DICT_ITEM':
      return {
        ...state,
        [a.dict]: state[a.dict].map((x: any) => (x.id === a.item.id ? a.item : x)),
      };
    case 'TOGGLE_DICT_ITEM':
      return {
        ...state,
        [a.dict]: state[a.dict].map((x: any) =>
          x.id === a.id ? { ...x, isActive: !x.isActive } : x
        ),
      };
    case 'UPDATE_BLOCK_SETTINGS':
      return {
        ...state,
        blockSettings: {
          ...state.blockSettings,
          [a.block]: { approvers: a.approvers },
        },
      };
    case 'CIO_TERR_SET_VALUE': {
      const cur = state.cioTerritoryValues[a.cioId]?.[a.indId]?.[a.munId];
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
        cioTerritoryValues: {
          ...state.cioTerritoryValues,
          [a.cioId]: {
            ...state.cioTerritoryValues[a.cioId],
            [a.indId]: {
              ...(state.cioTerritoryValues[a.cioId]?.[a.indId] ?? {}),
              [a.munId]: next,
            }
          }
        }
      };
    }
    case 'CIO_TERR_SIGN': {
      const { cioId, indId, munId, actor } = a;
      const cv = state.cioTerritoryValues[cioId]?.[indId]?.[munId];
      if (!cv) return state;
      return {
        ...state,
        cioTerritoryValues: {
          ...state.cioTerritoryValues,
          [cioId]: {
            ...(state.cioTerritoryValues[cioId] || {}),
            [indId]: {
              ...(state.cioTerritoryValues[cioId]?.[indId] || {}),
              [munId]: {
                ...cv,
                status: 'pending_mef',
                signedBy: actor,
                updatedAt: new Date().toISOString(),
              }
            }
          }
        },
        history: [{ at: new Date().toISOString(), actor, action: `ЦИО подписал ЭЦП значение (Территория)` }, ...state.history]
      };
    }
    case 'CIO_TERR_RECALL': {
      const { cioId, indId, munId, actor } = a;
      const cv = state.cioTerritoryValues[cioId]?.[indId]?.[munId];
      if (!cv) return state;
      return {
        ...state,
        cioTerritoryValues: {
          ...state.cioTerritoryValues,
          [cioId]: {
            ...(state.cioTerritoryValues[cioId] || {}),
            [indId]: {
              ...(state.cioTerritoryValues[cioId]?.[indId] || {}),
              [munId]: {
                ...cv,
                status: 'draft',
                updatedAt: new Date().toISOString(),
              }
            }
          }
        },
        history: [{ at: new Date().toISOString(), actor, action: `ЦИО отозвал значение (Территория)` }, ...state.history]
      };
    }
    default:
      return state;
  }
}

const StoreCtx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> }>({
  state: buildInitialState('ser'),
  dispatch: () => undefined,
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, buildInitialState('ser'));
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  return useContext(StoreCtx);
}
