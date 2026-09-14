import React, { createContext, useContext, useReducer } from 'react';
import { VALUE_FIELDS, emptyValueFields, deriveNoteStatus } from './types';
import type { AppState, Indicator, Direction, RoleId, ValueFieldKey, NoteTemplate, NoteOmsuData, NoteCellStatus } from './types';
import { buildInitialState } from './data';
import { isDescendant, isIndActive, renumberAll, subtreeIds } from './indTree';

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
  | { type: 'MEF_SEND_OWN'; cioIndId: string; cioId: string }
  | { type: 'MEF_RECALL_OWN'; cioIndId: string; cioId: string }
  | { type: 'MEF_TERR_SET_VALUE'; cioId: string; indId: string; munId: string; field: ValueFieldKey; value: number | null }
  | { type: 'MEF_TERR_SEND_OWN'; cioId: string; indId: string; munId: string }
  | { type: 'MEF_TERR_RECALL_OWN'; cioId: string; indId: string; munId: string }
  | { type: 'MEF_APPROVE'; cioIndId: string; cioId: string; actor: string }
  | { type: 'MEF_RETURN'; cioIndId: string; cioId: string; actor: string; comment: string }
  | { type: 'MEF_TERR_APPROVE'; cioId: string; indId: string; munId: string; actor: string }
  | { type: 'MEF_TERR_RETURN'; cioId: string; indId: string; munId: string; actor: string; comment: string }
  | { type: 'CAMPAIGN_SCHEDULE'; startDate: string; deadlineOmsu: string; deadlineCio: string; deadlineMef: string; period?: string }
  | { type: 'CAMPAIGN_LAUNCH' }
  | { type: 'CAMPAIGN_STOP' }
  | { type: 'SET_RATING_MODE'; mode: 'preview' | 'final' }
  | { type: 'PUBLISH_FINAL' }
  | { type: 'ADD_INDICATOR'; indicator: Indicator; afterId?: string }
  | { type: 'UPDATE_INDICATOR'; indicator: Indicator }
  | { type: 'MOVE_INDICATOR'; id: string; newParentId: string | null; index: number }
  | { type: 'ADD_DIRECTION'; direction: Direction }
  | { type: 'UPDATE_DIRECTION'; direction: Direction }
  | { type: 'NOTIFY'; text: string; forRoles: RoleId[] }
  | { type: 'SET_MODULE'; module: string }
  | { type: 'ADD_DICT_ITEM'; dict: 'cios' | 'omsus' | 'units'; item: any }
  | { type: 'UPDATE_DICT_ITEM'; dict: 'cios' | 'omsus' | 'units'; item: any }
  | { type: 'TOGGLE_DICT_ITEM'; dict: 'cios' | 'omsus' | 'units'; id: string }
  | { type: 'UPDATE_BLOCK_SETTINGS'; block: string; approvers: ('omsu' | 'cio' | 'mef')[]; reportingPeriods: string[]; estimatedPeriods: string[]; forecastPeriods: string[]; hasNote: boolean; }
  | { type: 'CIO_TERR_SET_VALUE'; cioId: string; indId: string; munId: string; field: ValueFieldKey; value: number | null }
  | { type: 'CIO_TERR_SIGN'; cioId: string; indId: string; munId: string; actor: string }
  | { type: 'CIO_TERR_RECALL'; cioId: string; indId: string; munId: string; actor: string }
  // ── Пояснительная записка (ПЗ) ──────────────────────────────────────
  | { type: 'NOTE_ADD_TEMPLATE'; template: NoteTemplate }
  | { type: 'NOTE_UPDATE_TEMPLATE'; template: NoteTemplate }
  | { type: 'NOTE_TOGGLE_TEMPLATE'; id: string }
  | { type: 'NOTE_SET_CELL'; munId: string; templateId: string; cellKey: string; value: string }
  | { type: 'NOTE_SIGN_SEND'; munId: string; templateId: string; cellKeys: string[]; actor: string }
  | { type: 'NOTE_RECALL'; munId: string; templateId: string; cellKeys: string[]; actor: string }
  | { type: 'NOTE_CIO_APPROVE'; templateId: string; munId: string; cellKey: string; actor: string }
  | { type: 'NOTE_CIO_RETURN'; templateId: string; munId: string; cellKey: string; actor: string; comment: string }
  | { type: 'NOTE_CIO_REVOKE'; templateId: string; munId: string; cellKey: string; actor: string }
  | { type: 'NOTE_CIO_UNDO_RETURN'; templateId: string; munId: string; cellKey: string; actor: string }
  | { type: 'NOTE_CAMPAIGN_SCHEDULE'; startDate: string; deadline: string; period?: string }
  | { type: 'NOTE_CAMPAIGN_LAUNCH' }
  | { type: 'NOTE_CAMPAIGN_STOP' };

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
    case 'MEF_SEND_OWN': {
      const cur = state.mefValues[a.cioIndId]?.[a.cioId];
      if (!cur) return state;
      return {
        ...state,
        mefValues: {
          ...state.mefValues,
          [a.cioIndId]: { ...(state.mefValues[a.cioIndId] || {}), [a.cioId]: { ...cur, status: 'sent', updatedAt: now() } },
        },
      };
    }
    case 'MEF_RECALL_OWN': {
      const cur = state.mefValues[a.cioIndId]?.[a.cioId];
      if (!cur) return state;
      return {
        ...state,
        mefValues: {
          ...state.mefValues,
          [a.cioIndId]: { ...(state.mefValues[a.cioIndId] || {}), [a.cioId]: { ...cur, status: 'draft', updatedAt: now() } },
        },
      };
    }
    case 'MEF_TERR_SEND_OWN': {
      const cur = state.mefTerritoryValues[a.cioId]?.[a.indId]?.[a.munId];
      if (!cur) return state;
      return {
        ...state,
        mefTerritoryValues: {
          ...state.mefTerritoryValues,
          [a.cioId]: {
            ...(state.mefTerritoryValues[a.cioId] || {}),
            [a.indId]: { ...(state.mefTerritoryValues[a.cioId]?.[a.indId] || {}), [a.munId]: { ...cur, status: 'sent', updatedAt: now() } },
          },
        },
      };
    }
    case 'MEF_TERR_RECALL_OWN': {
      const cur = state.mefTerritoryValues[a.cioId]?.[a.indId]?.[a.munId];
      if (!cur) return state;
      return {
        ...state,
        mefTerritoryValues: {
          ...state.mefTerritoryValues,
          [a.cioId]: {
            ...(state.mefTerritoryValues[a.cioId] || {}),
            [a.indId]: { ...(state.mefTerritoryValues[a.cioId]?.[a.indId] || {}), [a.munId]: { ...cur, status: 'draft', updatedAt: now() } },
          },
        },
      };
    }
    case 'MEF_APPROVE': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (!cur || cur.status !== 'pending_mef') return state;
      const mefCur = state.mefValues[a.cioIndId]?.[a.cioId] || { ...emptyValueFields(), status: 'not_filled', updatedAt: null };
      const nextMef = { ...mefCur, status: 'approved' as const, updatedAt: now() };
      const fields = ['v2023', 'v2024', 'v2025', 'v2026', 'cons2027', 'base2027', 'cons2028', 'base2028', 'cons2029', 'base2029'] as const;
      fields.forEach(f => {
        if (nextMef[f] == null && cur[f] != null) (nextMef as any)[f] = cur[f];
      });
      return {
        ...state,
        cioValues: {
          ...state.cioValues,
          [a.cioIndId]: { ...state.cioValues[a.cioIndId], [a.cioId]: { ...cur, status: 'approved', updatedAt: now() } },
        },
        mefValues: {
          ...state.mefValues,
          [a.cioIndId]: { ...(state.mefValues[a.cioIndId] || {}), [a.cioId]: nextMef },
        },
        history: [...state.history, { at: now(), actor: `МЭФ (${a.actor})`, action: `Данные ЦИО согласованы` }],
      };
    }
    case 'MEF_RETURN': {
      const cur = state.cioValues[a.cioIndId]?.[a.cioId];
      if (!cur || (cur.status !== 'pending_mef' && cur.status !== 'approved')) return state;
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
      const nextMef = { ...mefCur, status: 'approved' as const, updatedAt: now() };
      const fields = ['v2023', 'v2024', 'v2025', 'v2026', 'cons2027', 'base2027', 'cons2028', 'base2028', 'cons2029', 'base2029'] as const;
      fields.forEach(f => {
        if (nextMef[f] == null && cur[f] != null) (nextMef as any)[f] = cur[f];
      });
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
            [a.indId]: { ...(state.mefTerritoryValues[a.cioId]?.[a.indId] || {}), [a.munId]: nextMef },
          },
        },
        history: [...state.history, { at: now(), actor: `МЭФ (${a.actor})`, action: `Данные территории ЦИО согласованы` }],
      };
    }
    case 'MEF_TERR_RETURN': {
      const cur = state.cioTerritoryValues[a.cioId]?.[a.indId]?.[a.munId];
      if (!cur || (cur.status !== 'pending_mef' && cur.status !== 'approved')) return state;
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
        campaign: {
          ...state.campaign,
          status: 'scheduled',
          startDate: a.startDate,
          deadlineOmsu: a.deadlineOmsu,
          deadlineCio: a.deadlineCio,
          deadlineMef: a.deadlineMef,
          period: a.period !== undefined ? a.period : state.campaign.period,
        },
        history: [...state.history, { at: now(), actor: 'Куратор МЭФ', action: `Установлены параметры сбора: период «${a.period ?? state.campaign.period}», запуск ${a.startDate}` }],
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
    case 'ADD_INDICATOR': {
      const date = new Date().toISOString().split('T')[0];
      let next: Indicator[];
      if (a.afterId) {
        const idx = state.indicators.findIndex((i) => i.id === a.afterId);
        next = idx >= 0
          ? [...state.indicators.slice(0, idx + 1), a.indicator, ...state.indicators.slice(idx + 1)]
          : [...state.indicators, a.indicator];
      } else {
        next = [...state.indicators, a.indicator];
      }
      return { ...state, indicators: renumberAll(next, state.directions, date) };
    }
    case 'UPDATE_INDICATOR': {
      const date = new Date().toISOString().split('T')[0];
      return {
        ...state,
        indicators: renumberAll(
          state.indicators.map((i) => (i.id === a.indicator.id ? a.indicator : i)),
          state.directions,
          date,
        ),
      };
    }
    case 'MOVE_INDICATOR': {
      const date = new Date().toISOString().split('T')[0];
      const moving = state.indicators.find((i) => i.id === a.id);
      if (!moving || moving.id === a.newParentId) return state;
      // нельзя переместить показатель внутрь своего собственного поддерева
      if (a.newParentId && isDescendant(state.indicators, a.id, a.newParentId)) return state;
      const subtree = subtreeIds(state.indicators, a.id);
      const rest = state.indicators.filter((i) => !subtree.has(i.id));
      const isTop = a.newParentId === null;
      const children = rest.filter((i) =>
        isIndActive(i, date) &&
        (isTop
          ? i.parentId === null && i.directionId === moving.directionId
          : i.parentId === a.newParentId),
      );
      let insertAt: number;
      if (children.length === 0) {
        if (isTop) {
          const tops = rest.filter((i) => i.parentId === null && i.directionId === moving.directionId);
          insertAt = tops.length ? rest.indexOf(tops[tops.length - 1]) + 1 : rest.length;
        } else {
          const p = rest.find((i) => i.id === a.newParentId);
          insertAt = p ? rest.indexOf(p) + 1 : rest.length;
        }
      } else if (a.index >= children.length) {
        insertAt = rest.indexOf(children[children.length - 1]) + 1;
      } else {
        insertAt = rest.indexOf(children[Math.max(0, a.index)]);
      }
      const next = [
        ...rest.slice(0, insertAt),
        ...state.indicators.filter((i) => subtree.has(i.id)),
        ...rest.slice(insertAt),
      ];
      return { ...state, indicators: renumberAll(next, state.directions, date) };
    }
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
          [a.block]: { 
            approvers: a.approvers,
            reportingPeriods: a.reportingPeriods,
            estimatedPeriods: a.estimatedPeriods,
            forecastPeriods: a.forecastPeriods,
            hasNote: a.hasNote
          },
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
    // ── Пояснительная записка (ПЗ) ─────────────────────────────────────
    case 'NOTE_ADD_TEMPLATE':
      return {
        ...state,
        noteTemplates: [...state.noteTemplates, { ...a.template, isActive: true }],
        history: [...state.history, { at: now(), actor: 'Администратор', action: `Добавлен показатель пояснительной записки` }],
      };
    case 'NOTE_UPDATE_TEMPLATE':
      return {
        ...state,
        noteTemplates: state.noteTemplates.map((t) => (t.id === a.template.id ? { ...a.template, isActive: t.isActive } : t)),
        history: [...state.history, { at: now(), actor: 'Администратор', action: `Изменён показатель пояснительной записки` }],
      };
    case 'NOTE_TOGGLE_TEMPLATE':
      return {
        ...state,
        noteTemplates: state.noteTemplates.map((t) => (t.id === a.id ? { ...t, isActive: !t.isActive } : t)),
      };
    case 'NOTE_SET_CELL': {
      const cur = state.noteOmsuValues[a.munId]?.[a.templateId];
      if (!cur) return state;
      const v = a.value;
      const empty = !v || v.trim() === '' || v.trim() === '—';
      const cellStatus = { ...cur.cellStatus };
      const cellComments = { ...cur.cellComments };
      if (empty) {
        delete cellStatus[a.cellKey];
        delete cellComments[a.cellKey];
      } else {
        // новое значение или правка отправленной/согласованной/возвращённой ячейки — снова черновик
        cellStatus[a.cellKey] = 'draft';
        delete cellComments[a.cellKey];
      }
      const next: NoteOmsuData = {
        ...cur,
        cells: { ...cur.cells, [a.cellKey]: v },
        cellStatus,
        cellComments,
        status: deriveNoteStatus(cellStatus),
        updatedAt: now(),
      };
      return {
        ...state,
        noteOmsuValues: {
          ...state.noteOmsuValues,
          [a.munId]: { ...state.noteOmsuValues[a.munId], [a.templateId]: next },
        },
      };
    }
    case 'NOTE_SIGN_SEND': {
      const cur = state.noteOmsuValues[a.munId]?.[a.templateId];
      if (!cur) return state;
      // поячеечная отправка: подписываются только заполненные ячейки-черновики
      const cellStatus = { ...cur.cellStatus };
      let sent = 0;
      a.cellKeys.forEach((k) => {
        const st = cellStatus[k];
        const v = cur.cells[k];
        if ((st === 'draft' || st === 'returned') && v && v.trim() !== '' && v.trim() !== '—') {
          cellStatus[k] = 'pending_cio';
          sent++;
        }
      });
      if (sent === 0) return state;
      const cellComments = { ...cur.cellComments };
      a.cellKeys.forEach((k) => { if (cellStatus[k] === 'pending_cio') delete cellComments[k]; });
      return {
        ...state,
        noteOmsuValues: {
          ...state.noteOmsuValues,
          [a.munId]: {
            ...state.noteOmsuValues[a.munId],
            [a.templateId]: { ...cur, cellStatus, cellComments, status: deriveNoteStatus(cellStatus), updatedAt: now(), signedBy: a.actor },
          },
        },
        history: [...state.history, { at: now(), actor: `ОМСУ (${a.actor})`, action: `Пояснительная записка: ${sent} яч. подписано ЭЦП и направлено на согласование ЦИО` }],
      };
    }
    case 'NOTE_RECALL': {
      const cur = state.noteOmsuValues[a.munId]?.[a.templateId];
      if (!cur) return state;
      const cellStatus = { ...cur.cellStatus };
      let recalled = 0;
      a.cellKeys.forEach((k) => {
        if (cellStatus[k] === 'pending_cio') { cellStatus[k] = 'draft'; recalled++; }
      });
      if (recalled === 0) return state;
      return {
        ...state,
        noteOmsuValues: {
          ...state.noteOmsuValues,
          [a.munId]: {
            ...state.noteOmsuValues[a.munId],
            [a.templateId]: { ...cur, cellStatus, status: deriveNoteStatus(cellStatus), updatedAt: now(), signedBy: undefined },
          },
        },
        history: [...state.history, { at: now(), actor: `ОМСУ (${a.actor})`, action: `Пояснительная записка: ${recalled} яч. отозвано с согласования` }],
      };
    }
    case 'NOTE_CIO_APPROVE': {
      const cur = state.noteOmsuValues[a.munId]?.[a.templateId];
      if (!cur || cur.cellStatus[a.cellKey] !== 'pending_cio') return state;
      const cellStatus: Record<string, NoteCellStatus> = { ...cur.cellStatus, [a.cellKey]: 'approved' };
      const cellComments = { ...cur.cellComments };
      delete cellComments[a.cellKey]; // примечание ЦИО исчезает после согласования
      const derived = deriveNoteStatus(cellStatus);
      const cioCur = state.noteCioValues[a.templateId]?.[a.munId] || { status: 'none' as const, updatedAt: null };
      return {
        ...state,
        noteOmsuValues: {
          ...state.noteOmsuValues,
          [a.munId]: {
            ...state.noteOmsuValues[a.munId],
            [a.templateId]: { ...cur, cellStatus, cellComments, status: derived, updatedAt: now() },
          },
        },
        noteCioValues: {
          ...state.noteCioValues,
          [a.templateId]: {
            ...(state.noteCioValues[a.templateId] || {}),
            [a.munId]: { ...cioCur, status: derived === 'approved' ? 'approved' : cioCur.status, updatedAt: now() },
          },
        },
        history: [...state.history, { at: now(), actor: `ЦИО (${a.actor})`, action: `Пояснительная записка: ячейка согласована` }],
      };
    }
    case 'NOTE_CIO_RETURN': {
      const cur = state.noteOmsuValues[a.munId]?.[a.templateId];
      if (!cur || cur.cellStatus[a.cellKey] !== 'pending_cio') return state;
      const cellStatus: Record<string, NoteCellStatus> = { ...cur.cellStatus, [a.cellKey]: 'returned' };
      const cellComments = { ...cur.cellComments, [a.cellKey]: a.comment };
      const derived = deriveNoteStatus(cellStatus);
      const cioCur = state.noteCioValues[a.templateId]?.[a.munId] || { status: 'none' as const, updatedAt: null };
      return {
        ...state,
        noteOmsuValues: {
          ...state.noteOmsuValues,
          [a.munId]: {
            ...state.noteOmsuValues[a.munId],
            [a.templateId]: { ...cur, cellStatus, cellComments, status: derived, updatedAt: now(), signedBy: undefined },
          },
        },
        noteCioValues: {
          ...state.noteCioValues,
          [a.templateId]: {
            ...(state.noteCioValues[a.templateId] || {}),
            [a.munId]: { ...cioCur, status: 'returned', updatedAt: now() },
          },
        },
        notifications: [...state.notifications, { id: ++notifId, at: now(), text: `Пояснительная записка: ячейка возвращена на доработку: ${a.comment}`, forRoles: ['omsu'] }],
        history: [...state.history, { at: now(), actor: `ЦИО (${a.actor})`, action: `Пояснительная записка: ячейка возвращена на доработку: ${a.comment}` }],
      };
    }
    case 'NOTE_CIO_REVOKE': {
      const cur = state.noteOmsuValues[a.munId]?.[a.templateId];
      if (!cur || cur.cellStatus[a.cellKey] !== 'approved') return state;
      const cellStatus: Record<string, NoteCellStatus> = { ...cur.cellStatus, [a.cellKey]: 'pending_cio' };
      const derived = deriveNoteStatus(cellStatus);
      const cioCur = state.noteCioValues[a.templateId]?.[a.munId] || { status: 'none' as const, updatedAt: null };
      return {
        ...state,
        noteOmsuValues: {
          ...state.noteOmsuValues,
          [a.munId]: {
            ...state.noteOmsuValues[a.munId],
            [a.templateId]: { ...cur, cellStatus, status: derived, updatedAt: now() },
          },
        },
        noteCioValues: {
          ...state.noteCioValues,
          [a.templateId]: {
            ...(state.noteCioValues[a.templateId] || {}),
            [a.munId]: { ...cioCur, status: 'none', updatedAt: now() },
          },
        },
        history: [...state.history, { at: now(), actor: `ЦИО (${a.actor})`, action: 'Пояснительная записка: согласование ячейки отозвано' }],
      };
    }
    case 'NOTE_CIO_UNDO_RETURN': {
      const cur = state.noteOmsuValues[a.munId]?.[a.templateId];
      if (!cur || cur.cellStatus[a.cellKey] !== 'returned') return state;
      const cellStatus: Record<string, NoteCellStatus> = { ...cur.cellStatus, [a.cellKey]: 'pending_cio' };
      const cellComments = { ...cur.cellComments };
      delete cellComments[a.cellKey]; // комментарий при возврате больше не нужен
      const derived = deriveNoteStatus(cellStatus);
      const cioCur = state.noteCioValues[a.templateId]?.[a.munId] || { status: 'none' as const, updatedAt: null };
      return {
        ...state,
        noteOmsuValues: {
          ...state.noteOmsuValues,
          [a.munId]: {
            ...state.noteOmsuValues[a.munId],
            [a.templateId]: { ...cur, cellStatus, cellComments, status: derived, updatedAt: now() },
          },
        },
        noteCioValues: {
          ...state.noteCioValues,
          [a.templateId]: {
            ...(state.noteCioValues[a.templateId] || {}),
            [a.munId]: { ...cioCur, status: 'none', updatedAt: now() },
          },
        },
        history: [...state.history, { at: now(), actor: `ЦИО (${a.actor})`, action: 'Пояснительная записка: возврат ячейки отменён' }],
      };
    }
    case 'NOTE_CAMPAIGN_SCHEDULE':
      return {
        ...state,
        noteCampaign: {
          ...state.noteCampaign,
          startDate: a.startDate,
          deadline: a.deadline,
          period: a.period !== undefined ? a.period : state.noteCampaign.period,
        },
        history: [...state.history, { at: now(), actor: 'Куратор МЭФ', action: `Установлены параметры сбора пояснительной записки: период «${a.period ?? state.noteCampaign.period}» (запуск: ${a.startDate}, окончание: ${a.deadline})` }],
      };
    case 'NOTE_CAMPAIGN_LAUNCH':
      return {
        ...state,
        noteCampaign: { ...state.noteCampaign, status: 'collecting', launchedAt: now() },
        notifications: [...state.notifications, { id: ++notifId, at: now(), text: 'Запущен сбор пояснительной записки', forRoles: ['omsu', 'cio'] }],
        history: [...state.history, { at: now(), actor: 'Куратор МЭФ', action: 'Запущен сбор пояснительной записки' }],
      };
    case 'NOTE_CAMPAIGN_STOP':
      return {
        ...state,
        noteCampaign: { ...state.noteCampaign, status: 'draft' },
        history: [...state.history, { at: now(), actor: 'Куратор МЭФ', action: 'Сбор пояснительной записки остановлен' }],
      };
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
