"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";

export default function InputPanel() {
  const { session, canUndo, dispatch } = useStore();
  const [cherryMode, setCherryMode] = useState(false);
  const [spinInput, setSpinInput] = useState("");

  const handleSetSpins = () => {
    const v = parseInt(spinInput, 10);
    if (!isNaN(v) && v >= 0) {
      dispatch({ type: "SET_SPINS", count: v });
      setSpinInput("");
    }
  };

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
        {/* クイック加算 */}
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
        </p>
      </div>

      {/* チェリー重複モード */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-gray-400">チェリー重複入力モード</span>
        <button
          onClick={() => setCherryMode(v => !v)}
          className={`w-12 h-6 rounded-full transition-colors ${cherryMode ? "bg-pink-500" : "bg-gray-700"} relative`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${cherryMode ? "left-7" : "left-1"}`} />
        </button>
      </div>

      {/* メインボタン群 */}
      <div className="grid grid-cols-3 gap-3">
        {/* BIG */}
        <button
          onClick={() => dispatch({ type: "ADD_BIG", cherry: cherryMode })}
          className="bg-yellow-500 active:bg-yellow-600 text-black rounded-2xl py-8 flex flex-col items-center justify-center gap-1 shadow-lg shadow-yellow-900/40 touch-manipulation"
        >
          <span className="text-3xl font-black">BIG</span>
          {cherryMode && <span className="text-xs font-bold bg-yellow-700 text-yellow-100 rounded-full px-2 py-0.5">🍒重複</span>}
          <span className="text-xs opacity-70">{session.bigCount}回</span>
        </button>

        {/* REG */}
        <button
          onClick={() => dispatch({ type: "ADD_REG", cherry: cherryMode })}
          className="bg-blue-500 active:bg-blue-600 text-white rounded-2xl py-8 flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-900/40 touch-manipulation"
        >
          <span className="text-3xl font-black">REG</span>
          {cherryMode && <span className="text-xs font-bold bg-blue-700 text-blue-100 rounded-full px-2 py-0.5">🍒重複</span>}
          <span className="text-xs opacity-70">{session.regCount}回</span>
        </button>

        {/* ブドウ */}
        <button
          onClick={() => dispatch({ type: "ADD_GRAPE" })}
          className="bg-purple-600 active:bg-purple-700 text-white rounded-2xl py-8 flex flex-col items-center justify-center gap-1 shadow-lg shadow-purple-900/40 touch-manipulation"
        >
          <span className="text-3xl">🍇</span>
          <span className="text-base font-black">ブドウ</span>
          <span className="text-xs opacity-70">{session.grapeCount}回</span>
        </button>
      </div>

      {/* アンドゥ・リセット */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!canUndo}
          className="bg-gray-800 disabled:opacity-40 text-gray-300 rounded-xl py-3 text-sm font-semibold active:bg-gray-700 touch-manipulation"
        >
          ↩ 取り消し
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
