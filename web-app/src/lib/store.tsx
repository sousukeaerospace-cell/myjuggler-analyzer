"use client";

import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { SessionData } from "./types";
import {
  computePosteriors,
  computeExpectedRTP,
  computeHighSettingProb,
  isSpecialDay,
} from "./bayesian";
import { DEFAULT_PRIOR, SPECIAL_DAY_PRIOR } from "./constants";

// ─── 初期セッション ──────────────────────────────────────────────────────────

function makeDefaultSession(machineNumber = ""): SessionData {
  const special = isSpecialDay();
  const prior = special ? SPECIAL_DAY_PRIOR : DEFAULT_PRIOR;
  return {
    machineNumber,
    totalSpins: 0,
    bigCount: 0,
    regCount: 0,
    grapeCount: 0,
    cherryBigCount: 0,
    cherryRegCount: 0,
    priorType: special ? "special_day" : "uniform",
    priorProbabilities: prior,
    posteriors: computePosteriors(0, 0, 0, 0, prior),
    expectedRTP: computeExpectedRTP(computePosteriors(0, 0, 0, 0, prior)),
    highSettingProb: computeHighSettingProb(computePosteriors(0, 0, 0, 0, prior)),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function recompute(session: SessionData): SessionData {
  const posteriors = computePosteriors(
    session.totalSpins,
    session.bigCount,
    session.regCount,
    session.grapeCount,
    session.priorProbabilities,
  );
  return {
    ...session,
    posteriors,
    expectedRTP: computeExpectedRTP(posteriors),
    highSettingProb: computeHighSettingProb(posteriors),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Action 型 ───────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_MACHINE"; machineNumber: string }
  | { type: "ADD_SPINS"; count: number }
  | { type: "SET_SPINS"; count: number }
  | { type: "ADD_BIG"; cherry?: boolean }
  | { type: "ADD_REG"; cherry?: boolean }
  | { type: "ADD_GRAPE" }
  | { type: "UNDO" }
  | { type: "SET_PRIOR"; prior: number[]; priorType: SessionData["priorType"] }
  | { type: "RESET" }
  | { type: "LOAD"; session: SessionData };

// ─── Reducer ─────────────────────────────────────────────────────────────────

interface StoreState {
  session: SessionData;
  history: SessionData[];  // undo スタック (最大20件)
}

function reducer(state: StoreState, action: Action): StoreState {
  const push = (next: SessionData): StoreState => ({
    session: recompute(next),
    history: [state.session, ...state.history].slice(0, 20),
  });

  switch (action.type) {
    case "SET_MACHINE":
      return push({ ...state.session, machineNumber: action.machineNumber });

    case "ADD_SPINS":
      return push({ ...state.session, totalSpins: state.session.totalSpins + action.count });

    case "SET_SPINS":
      return push({ ...state.session, totalSpins: Math.max(0, action.count) });

    case "ADD_BIG":
      return push({
        ...state.session,
        bigCount: state.session.bigCount + 1,
        cherryBigCount: action.cherry
          ? state.session.cherryBigCount + 1
          : state.session.cherryBigCount,
      });

    case "ADD_REG":
      return push({
        ...state.session,
        regCount: state.session.regCount + 1,
        cherryRegCount: action.cherry
          ? state.session.cherryRegCount + 1
          : state.session.cherryRegCount,
      });

    case "ADD_GRAPE":
      return push({ ...state.session, grapeCount: state.session.grapeCount + 1 });

    case "UNDO":
      if (state.history.length === 0) return state;
      return { session: state.history[0], history: state.history.slice(1) };

    case "SET_PRIOR":
      return push({
        ...state.session,
        priorProbabilities: action.prior,
        priorType: action.priorType,
      });

    case "RESET":
      return { session: makeDefaultSession(state.session.machineNumber), history: [] };

    case "LOAD":
      return { session: action.session, history: [] };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

import React from "react";

interface StoreContextValue {
  session: SessionData;
  canUndo: boolean;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEY = "myjuggler_session";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    // localStorage から復元を試みる
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session = JSON.parse(raw) as SessionData;
          return { session, history: [] };
        }
      } catch {
        // ignore
      }
    }
    return { session: makeDefaultSession(), history: [] };
  });

  // セッション変更を localStorage に自動保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.session));
    } catch {
      // ignore
    }
  }, [state.session]);

  return (
    <StoreContext.Provider value={{ session: state.session, canUndo: state.history.length > 0, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
