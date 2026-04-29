"use client";

import { HIGH_SETTING_THRESHOLD, RTP_DANGER_THRESHOLD, RTP_CAUTION_THRESHOLD, HIGH_DANGER_THRESHOLD } from "@/lib/constants";

interface Props {
  expectedRTP:     number;
  highSettingProb: number;
  threshold?: number;
}

export type AlertLevel = "none" | "caution" | "danger";

export function getAlertLevel(
  expectedRTP: number,
  highSettingProb: number,
  threshold = HIGH_SETTING_THRESHOLD,
): AlertLevel {
  if (expectedRTP < RTP_DANGER_THRESHOLD || highSettingProb < HIGH_DANGER_THRESHOLD)
    return "danger";
  if (expectedRTP < RTP_CAUTION_THRESHOLD || highSettingProb < threshold)
    return "caution";
  return "none";
}

export default function AlertBanner({
  expectedRTP,
  highSettingProb,
  threshold = HIGH_SETTING_THRESHOLD,
}: Props) {
  const level  = getAlertLevel(expectedRTP, highSettingProb, threshold);
  const rtpPct  = (expectedRTP * 100).toFixed(1);
  const highPct = (highSettingProb * 100).toFixed(0);

  if (level === "none") {
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

  if (level === "danger") {
    return (
      <div className="animate-pulse bg-red-600 rounded-2xl px-4 py-4 flex flex-col items-center gap-1 shadow-xl shadow-red-900">
        <p className="text-white text-2xl font-black tracking-wide">🚨 期待値マイナス</p>
        <p className="text-red-100 text-xl font-bold">退台推奨</p>
        <p className="text-red-200 text-sm">期待機械割 {rtpPct}%（基準 {(RTP_DANGER_THRESHOLD * 100).toFixed(0)}%未満）</p>
        <p className="text-red-300 text-xs">高設定確率 {highPct}%</p>
      </div>
    );
  }

  // caution
  return (
    <div className="bg-amber-800 border border-amber-400 rounded-2xl px-4 py-3 flex flex-col gap-1 animate-pulse">
      <p className="text-amber-200 text-base font-bold">⚠ 注意: 期待値低下中</p>
      <p className="text-amber-100 text-sm">期待機械割 {rtpPct}%（目標 {(RTP_CAUTION_THRESHOLD * 100).toFixed(0)}%未満）</p>
      <p className="text-amber-300 text-xs">高設定確率 {highPct}% ／ 撤退を検討してください</p>
    </div>
  );
}
