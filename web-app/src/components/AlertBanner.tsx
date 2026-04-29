"use client";

import { AlertState } from "@/lib/types";
import { HIGH_SETTING_THRESHOLD, RTP_ALERT_THRESHOLD } from "@/lib/constants";

interface Props {
  expectedRTP: number;
  highSettingProb: number;
  threshold?: number;
}

export default function AlertBanner({ expectedRTP, highSettingProb, threshold = HIGH_SETTING_THRESHOLD }: Props) {
  const rtpPct          = (expectedRTP * 100).toFixed(1);
  const highPct         = (highSettingProb * 100).toFixed(1);
  const isDanger        = expectedRTP < RTP_ALERT_THRESHOLD;
  const isHighCaution   = highSettingProb < threshold;

  if (!isDanger && !isHighCaution) {
    // 正常: 緑のステータス表示
    return (
      <div className="bg-green-950 border border-green-700 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-green-400 text-xl">✓</span>
        <div>
          <p className="text-green-300 text-sm font-semibold">期待値プラス継続中</p>
          <p className="text-green-500 text-xs">
            期待機械割 {rtpPct}% ／ 高設定確率 {highPct}%
          </p>
        </div>
      </div>
    );
  }

  if (isDanger) {
    return (
      <div className="animate-pulse bg-red-600 rounded-2xl px-4 py-4 flex flex-col items-center gap-2 shadow-lg shadow-red-900">
        <p className="text-white text-2xl font-black tracking-wide">🚨 期待値マイナス</p>
        <p className="text-red-100 text-xl font-bold">退台推奨</p>
        <p className="text-red-200 text-sm mt-1">
          期待機械割 {rtpPct}%（目標100%未満）
        </p>
        <p className="text-red-300 text-xs">
          高設定確率 {highPct}%（閾値 {(threshold * 100).toFixed(0)}%）
        </p>
      </div>
    );
  }

  // 注意: 高設定確率が低い
  return (
    <div className="bg-amber-900 border border-amber-500 rounded-2xl px-4 py-3 flex flex-col gap-1">
      <p className="text-amber-300 text-base font-bold">⚠ 高設定確率低下</p>
      <p className="text-amber-200 text-sm">
        設定4以上の確率が {highPct}%（閾値 {(threshold * 100).toFixed(0)}%未満）
      </p>
      <p className="text-amber-400 text-xs">
        期待機械割 {rtpPct}% ／ 撤退を検討してください
      </p>
    </div>
  );
}
