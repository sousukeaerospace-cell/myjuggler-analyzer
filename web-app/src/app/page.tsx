"use client";

import { useState, useEffect, useRef } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import SettingChart from "@/components/SettingChart";
import InputPanel from "@/components/InputPanel";
import AlertBanner from "@/components/AlertBanner";
import StatsDisplay from "@/components/StatsDisplay";
import SessionHistory, { saveToHistory } from "@/components/SessionHistory";
import PriorSettings from "@/components/PriorSettings";
import { MachineRecord } from "@/lib/types";
import { isSpecialDay } from "@/lib/bayesian";
import { HIGH_SETTING_THRESHOLD } from "@/lib/constants";

function App() {
  const { session, dispatch } = useStore();
  const [showHistory, setShowHistory]       = useState(false);
  const [showPrior, setShowPrior]           = useState(false);
  const [importedMachines, setImportedMachines] = useState<MachineRecord[]>([]);
  const [threshold, setThreshold]           = useState(HIGH_SETTING_THRESHOLD);
  const [machineInput, setMachineInput]     = useState(session.machineNumber);
  const fileRef = useRef<HTMLInputElement>(null);

  const todaySpecial = isSpecialDay();

  // 台番号確定
  const commitMachine = () => {
    if (machineInput.trim()) {
      dispatch({ type: "SET_MACHINE", machineNumber: machineInput.trim() });
    }
  };

  // JSON インポート
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.machines) {
          setImportedMachines(
            data.machines.map((m: any) => ({
              machineNumber: m.machine_number ?? m.machineNumber,
              date: m.date,
              totalSpins: m.total_spins ?? m.totalSpins,
              bigCount: m.big_count ?? m.bigCount,
              regCount: m.reg_count ?? m.regCount,
              lastCoinDiff: m.last_coin_diff ?? m.lastCoinDiff,
            })),
          );
          alert(`${data.machines.length} 台のデータをインポートしました`);
        }
      } catch {
        alert("JSONの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // セッションを履歴に自動保存 (更新のたび)
  useEffect(() => {
    if (session.totalSpins > 0) {
      saveToHistory(session);
    }
  }, [session.updatedAt]);

  // 背景色: 期待値マイナス時は赤フラッシュ
  const isDanger = session.expectedRTP < 1.0;
  const isHighCaution = session.highSettingProb < threshold;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-500 ${
        isDanger ? "bg-red-950" : "bg-gray-950"
      }`}
    >
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎰</span>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">マイジャグラーV 設定推定</h1>
              {todaySpecial && (
                <span className="text-xs text-amber-400">🎯 高設定期待日</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-gray-800 text-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold active:bg-gray-700"
              title="前日JSONをインポート"
            >
              📂 JSON
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="bg-gray-800 text-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold active:bg-gray-700"
            >
              📋 履歴
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-lg mx-auto w-full pb-6">

        {/* 台番号入力 */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="台番号 (例: 0791)"
            value={machineInput}
            onChange={e => setMachineInput(e.target.value)}
            onBlur={commitMachine}
            onKeyDown={e => e.key === "Enter" && commitMachine()}
            className="flex-1 bg-gray-900 text-white rounded-xl px-3 py-2 text-base font-bold outline-none border border-gray-700 focus:border-blue-500"
            inputMode="numeric"
          />
          <button
            onClick={() => setShowPrior(true)}
            className="bg-gray-800 text-gray-300 rounded-xl px-3 py-2 text-sm font-semibold active:bg-gray-700"
          >
            ⚙ 設定
          </button>
        </div>

        {/* 期待値アラート */}
        <AlertBanner
          expectedRTP={session.expectedRTP}
          highSettingProb={session.highSettingProb}
          threshold={threshold}
        />

        {/* 設定確率チャート */}
        <SettingChart posteriors={session.posteriors} />

        {/* 実戦データ表示 */}
        <StatsDisplay
          totalSpins={session.totalSpins}
          bigCount={session.bigCount}
          regCount={session.regCount}
          grapeCount={session.grapeCount}
          posteriors={session.posteriors}
          expectedRTP={session.expectedRTP}
        />

        {/* 入力パネル */}
        <InputPanel />

        {/* プライアー情報 */}
        <div className="bg-gray-900 rounded-xl px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            事前確率: {
              session.priorType === "carryover" ? "据え置き引き継ぎ" :
              session.priorType === "special_day" ? "高設定期待日" : "均等"
            }
          </span>
          <button
            onClick={() => setShowPrior(true)}
            className="text-xs text-blue-400 underline"
          >
            変更
          </button>
        </div>
      </main>

      {/* モーダル */}
      {showHistory && <SessionHistory onClose={() => setShowHistory(false)} />}
      {showPrior && (
        <PriorSettings
          onClose={() => setShowPrior(false)}
          importedMachines={importedMachines}
          highSettingThreshold={threshold}
          onThresholdChange={setThreshold}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
