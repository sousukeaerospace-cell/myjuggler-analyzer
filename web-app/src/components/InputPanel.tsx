"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";

export default function InputPanel() {
  const { session, canUndo, dispatch } = useStore();
  const [spinInput, setSpinInput] = useState("");

  const handleSetSpins = () => {
    const v = parseInt(spinInput, 10);
    if (!isNaN(v) && v >= 0) {
      dispatch({ type: "SET_SPINS", count: v });
      setSpinInput("");
    }
  };

  const totalBig = session.soloBigCount + session.cherryBigCount;
  const totalReg = session.soloRegCount + session.cherryRegCount;

  return (
    <div className="space-y-3">
      {/* ゲーム数入力 */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">ゲーム数入力</p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="総ゲーム数"
            value={spinInput}
            onChange={e => setSpinInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSetSpins()}
            className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2 text-lg font-bold outline-none border border-gray-700 focus:border-blue-500"
            inputMode="numeric"
          />
          <button
            onClick={handleSetSpins}
            className="bg-blue-600 text-white rounded-xl px-4 py-2 font-bold text-sm active:bg-blue-700"
          >
            セット
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[50, 100, 200, 500].map(n => (
            <button
              key={n}
              onClick={() => dispatch({ type: "ADD_SPINS", count: n })}
              className="bg-gray-800 text-gray-300 rounded-xl py-2 text-sm font-semibold active:bg-gray-700"
            >
              +{n}
            </button>
          ))}
        </div>
        <p className="text-center text-gray-500 text-xs">
          現在: <span className="text-white font-bold">{session.totalSpins.toLocaleString()}G</span>
          <span className="ml-3">BIG合計:{totalBig} REG合計:{totalReg}</span>
        </p>
      </div>

      {/* メインボタン 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 単独BIG */}
        <button
          onClick={() => dispatch({ type: "ADD_SOLO_BIG" })}
          className="bg-yellow-500 active:bg-yellow-600 text-black rounded-2xl py-7 flex flex-col items-center justify-center gap-1 shadow-lg shadow-yellow-900/40 touch-manipulation"
        >
          <span className="text-2xl font-black leading-tight">単独BIG</span>
          <span className="text-xs font-semibold opacity-80">{session.soloBigCount}回</span>
        </button>

        {/* 単独REG — 最重要: 大きく・明るく */}
        <button
          onClick={() => dispatch({ type: "ADD_SOLO_REG" })}
          className="bg-blue-500 active:bg-blue-600 text-white rounded-2xl py-7 flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-900/60 ring-2 ring-blue-400 touch-manipulation"
        >
          <span className="text-2xl font-black leading-tight">単独REG</span>
          <span className="text-xs font-semibold opacity-80">{session.soloRegCount}回</span>
          <span className="text-xs bg-blue-700 rounded-full px-2 py-0.5">★最重要</span>
        </button>

        {/* チェリー重複BIG */}
        <button
          onClick={() => dispatch({ type: "ADD_CHERRY_BIG" })}
          className="bg-orange-500 active:bg-orange-600 text-white rounded-2xl py-6 flex flex-col items-center justify-center gap-1 shadow-lg shadow-orange-900/40 touch-manipulation"
        >
          <span className="text-lg font-black leading-tight">🍒BIG</span>
          <span className="text-xs font-semibold opacity-80">チェリー重複</span>
          <span className="text-xs opacity-70">{session.cherryBigCount}回</span>
        </button>

        {/* チェリー重複REG */}
        <button
          onClick={() => dispatch({ type: "ADD_CHERRY_REG" })}
          className="bg-purple-600 active:bg-purple-700 text-white rounded-2xl py-6 flex flex-col items-center justify-center gap-1 shadow-lg shadow-purple-900/40 touch-manipulation"
        >
          <span className="text-lg font-black leading-tight">🍒REG</span>
          <span className="text-xs font-semibold opacity-80">チェリー重複</span>
          <span className="text-xs opacity-70">{session.cherryRegCount}回</span>
        </button>
      </div>

      {/* Undo / リセット */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!canUndo}
          className="bg-gray-700 disabled:opacity-40 text-white rounded-xl py-3 text-sm font-bold active:bg-gray-600 touch-manipulation"
        >
          ↩ 1手戻る
        </button>
        <button
          onClick={() => {
            if (confirm("このセッションをリセットしますか？")) {
              dispatch({ type: "RESET" });
            }
          }}
          className="bg-gray-800 text-red-400 rounded-xl py-3 text-sm font-semibold active:bg-gray-700 touch-manipulation"
        >
          🗑 リセット
        </button>
      </div>
    </div>
  );
}
