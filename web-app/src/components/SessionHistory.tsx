"use client";

import { useState, useEffect } from "react";
import { SessionData } from "@/lib/types";
import { useStore } from "@/lib/store";

const HISTORY_KEY = "myjuggler_history";
const MAX_HISTORY  = 20;

interface HistoryEntry {
  savedAt: string;
  session: SessionData;
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(session: SessionData) {
  const entries = loadHistory();
  const newEntry: HistoryEntry = { savedAt: new Date().toISOString(), session };
  const updated = [newEntry, ...entries.filter(
    e => e.session.machineNumber !== session.machineNumber ||
         e.session.startedAt    !== session.startedAt,
  )].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

interface Props {
  onClose: () => void;
}

export default function SessionHistory({ onClose }: Props) {
  const { dispatch } = useStore();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  const handleLoad = (entry: HistoryEntry) => {
    dispatch({ type: "LOAD", session: entry.session });
    onClose();
  };

  const handleDelete = (idx: number) => {
    const updated = entries.filter((_, i) => i !== idx);
    setEntries(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="bg-gray-950 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">台履歴</h2>
          <button onClick={onClose} className="text-gray-400 text-xl px-2">✕</button>
        </div>

        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            履歴はありません
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {entries.map((entry, idx) => {
              const s = entry.session;
              const date = new Date(entry.savedAt).toLocaleDateString("ja-JP");
              const time = new Date(entry.savedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
              const highProb = (s.highSettingProb * 100).toFixed(0);
              const rtp = (s.expectedRTP * 100).toFixed(1);

              return (
                <li key={idx} className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => handleLoad(entry)} className="flex-1 text-left">
                    <p className="text-white font-bold">{s.machineNumber || "台番号不明"}</p>
                    <p className="text-gray-400 text-xs">
                      {date} {time} / {s.totalSpins}G / BIG:{s.bigCount} REG:{s.regCount}
                    </p>
                    <p className="text-xs mt-0.5">
                      <span className={s.expectedRTP >= 1 ? "text-green-400" : "text-red-400"}>
                        期待割 {rtp}%
                      </span>
                      <span className="text-gray-500 ml-2">高設定 {highProb}%</span>
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-red-600 text-lg px-2 active:text-red-400"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export { saveToHistory };
