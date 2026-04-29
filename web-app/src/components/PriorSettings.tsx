"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  DEFAULT_PRIOR,
  SPECIAL_DAY_PRIOR,
  HIGH_SETTING_THRESHOLD,
} from "@/lib/constants";
import { carryoverPrior, isSpecialDay } from "@/lib/bayesian";
import { MachineRecord } from "@/lib/types";

interface Props {
  onClose: () => void;
  importedMachines: MachineRecord[];
  highSettingThreshold: number;
  onThresholdChange: (v: number) => void;
}

export default function PriorSettings({
  onClose,
  importedMachines,
  highSettingThreshold,
  onThresholdChange,
}: Props) {
  const { session, dispatch } = useStore();
  const [thresholdInput, setThresholdInput] = useState(
    String(Math.round(highSettingThreshold * 100)),
  );

  const todaySpecial = isSpecialDay();

  const matchedMachine = importedMachines.find(
    m => m.machineNumber === session.machineNumber,
  );

  const applyCarryover = () => {
    if (!matchedMachine) return;
    const prior = carryoverPrior(
      matchedMachine.totalSpins ?? 0,
      matchedMachine.bigCount ?? 0,
      matchedMachine.regCount ?? 0,
      matchedMachine.lastCoinDiff,
      DEFAULT_PRIOR,
    );
    dispatch({ type: "SET_PRIOR", prior, priorType: "carryover" });
    onClose();
  };

  const applySpecialDay = () => {
    dispatch({ type: "SET_PRIOR", prior: SPECIAL_DAY_PRIOR, priorType: "special_day" });
    onClose();
  };

  const applyUniform = () => {
    dispatch({ type: "SET_PRIOR", prior: DEFAULT_PRIOR, priorType: "uniform" });
    onClose();
  };

  const applyThreshold = () => {
    const v = parseInt(thresholdInput, 10);
    if (!isNaN(v) && v > 0 && v <= 100) {
      onThresholdChange(v / 100);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="bg-gray-950 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">事前確率・警告設定</h2>
          <button onClick={onClose} className="text-gray-400 text-xl px-2">✕</button>
        </div>

        <div className="p-4 space-y-6">
          {/* 現在の事前確率タイプ */}
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
              現在の事前確率: <span className="text-white">{session.priorType}</span>
            </p>
          </div>

          {/* 事前確率の選択 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-300 font-semibold">事前確率の設定</p>

            <button
              onClick={applyUniform}
              className="w-full bg-gray-800 text-left rounded-xl px-4 py-3 active:bg-gray-700"
            >
              <p className="text-white font-bold">均等 (通常日)</p>
              <p className="text-gray-400 text-xs">設定1〜6それぞれ16.7%</p>
            </button>

            <button
              onClick={applySpecialDay}
              className={`w-full ${todaySpecial ? "bg-amber-900 border border-amber-500" : "bg-gray-800"} text-left rounded-xl px-4 py-3 active:bg-gray-700`}
            >
              <p className="text-white font-bold">
                高設定期待日 {todaySpecial ? "🎯 (本日該当！)" : ""}
              </p>
              <p className="text-gray-400 text-xs">
                3・9のつく日 / 第1土曜 → 設定4〜6を底上げ
              </p>
            </button>

            {matchedMachine ? (
              <button
                onClick={applyCarryover}
                className="w-full bg-blue-950 border border-blue-700 text-left rounded-xl px-4 py-3 active:bg-blue-900"
              >
                <p className="text-white font-bold">据え置き引き継ぎ</p>
                <p className="text-blue-300 text-xs">
                  台{matchedMachine.machineNumber} / 前日 {matchedMachine.totalSpins}G
                  BIG:{matchedMachine.bigCount} REG:{matchedMachine.regCount}
                </p>
                <p className="text-gray-400 text-xs">前日データから設定推定して事前確率に適用</p>
              </button>
            ) : (
              <div className="bg-gray-900 rounded-xl px-4 py-3 opacity-50">
                <p className="text-gray-400 text-sm">据え置き引き継ぎ</p>
                <p className="text-gray-500 text-xs">JSONをインポートして台番号を入力すると有効になります</p>
              </div>
            )}
          </div>

          {/* 警告閾値 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-300 font-semibold">高設定確率警告閾値</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={thresholdInput}
                onChange={e => setThresholdInput(e.target.value)}
                min="1"
                max="99"
                className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2 text-lg font-bold outline-none border border-gray-700 focus:border-blue-500"
                inputMode="numeric"
              />
              <span className="flex items-center text-white font-bold">%</span>
              <button
                onClick={applyThreshold}
                className="bg-blue-600 text-white rounded-xl px-4 py-2 font-bold text-sm active:bg-blue-700"
              >
                適用
              </button>
            </div>
            <p className="text-gray-500 text-xs">
              現在: {Math.round(highSettingThreshold * 100)}% / 設定4以上の合算確率がこれを下回ると警告
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
