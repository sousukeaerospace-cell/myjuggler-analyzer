"use client";

import { createContext, useContext, useReducer, useEffect } from "react";
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
  const posteriors = computePosteriors(0, 0, 0, 0, 0, prior);
  return {
    machineNumber,
    totalSpins:     0,
    soloBigCount:   0,
    soloRegCount:   0,
    cherryBigCount: 0,
    cherryRegCount: 0,
    priorType: special ? "special_day" : "uniform",
    priorProbabilities: prior,
    posteriors,
    expectedRTP:     computeExpectedRTP(posteriors),
    highSettingProb: computeHighSettingProb(posteriors),
    startedAt:  new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
  };
}

function recompute(session: SessionData): SessionData {
  const posteriors = computePosteriors(
    session.totalSpins,
    session.soloBigCount,
    session.soloRegCount,
    session.cherryBigCount,
    session.cherryRegCount,
    session.priorProbabilities,
  );
  return {
    ...session,
    posteriors,
    expectedRTP:     computeExpectedRTP(posteriors),
    highSettingProb: computeHighSettingProb(posteriors),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Action 型 ───────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_MACHINE"; machineNumber: string }
  | { type: "ADD_SPINS";   count: number }
  | { type: "SET_SPINS";   count: number }
  | { type: "ADD_SOLO_BIG" }
  | { type: "ADD_SOLO_REG" }
  | { type: "ADD_CHERRY_BIG" }
  | { type: "ADD_CHERRY_REG" }
  | { type: "UNDO" }
  | { type: "SET_PRIOR"; prior: number[]; priorType: SessionData["priorType"] }
  | { type: "RESET" }
  | { type: "LOAD"; session: SessionData };

// ─── Reducer ─────────────────────────────────────────────────────────────────

interface StoreState {
  session: SessionData;
  history: SessionData[];
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

    case "ADD_SOLO_BIG":
      return push({ ...state.session, soloBigCount: state.session.soloBigCount + 1 });

    case "ADD_SOLO_REG":
      return push({ ...state.session, soloRegCount: state.session.soloRegCount + 1 });

    case "ADD_CHERRY_BIG":
      return push({ ...state.session, cherryBigCount: state.session.cherryBigCount + 1 });

    case "ADD_CHERRY_REG":
      return push({ ...state.session, cherryRegCount: state.session.cherryRegCount + 1 });

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
      return {
        session: {
          ...makeDefaultSession(),
          ...action.session,
          // 旧データ互換: 存在しないフィールドを0で補完
          soloBigCount:   action.session.soloBigCount   ?? 0,
          soloRegCount:   action.session.soloRegCount   ?? 0,
          cherryBigCount: action.session.cherryBigCount ?? 0,
          cherryRegCount: action.session.cherryRegCount ?? 0,
        },
        history: [],
      };

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

const STORAGE_KEY = "myjuggler_session_v2";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          // 旧データ互換
          const session: SessionData = {
            ...makeDefaultSession(),
            ...saved,
            soloBigCount:   saved.soloBigCount   ?? 0,
            soloRegCount:   saved.soloRegCount   ?? 0,
            cherryBigCount: saved.cherryBigCount ?? 0,
            cherryRegCount: saved.cherryRegCount ?? 0,
          };
          return { session, history: [] };
        }
      } catch {
        // ignore
      }
    }
    return { session: makeDefaultSession(), history: [] };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.session));
    } catch {
      // ignore
    }
  }, [state.session]);

  return (
    <StoreContext.Provider
      value={{ session: state.session, canUndo: state.history.length > 0, dispatch }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
