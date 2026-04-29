"use client";

import { SETTINGS } from "@/lib/constants";

interface Props {
  totalSpins: number;
  bigCount: number;
  regCount: number;
  grapeCount: number;
  posteriors: number[];
  expectedRTP: number;
}

function formatRate(count: number, spins: number): string {
  if (count === 0 || spins === 0) return "—";
  return `1/${Math.round(spins / count)}`;
}

export default function StatsDisplay({
  totalSpins,
  bigCount,
  regCount,
  grapeCount,
  posteriors,
  expectedRTP,
}: Props) {
  const mostLikelySetting = posteriors.indexOf(Math.max(...posteriors)) + 1;
  const mostLikelyProb    = Math.max(...posteriors) * 100;

  // 理論BIG/REG確率 vs 実績
  const expectedBigRate = posteriors.reduce(
    (acc, p, i) => acc + p * SETTINGS[i + 1].bigRate,
    0,
  );

  return (
    <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        実戦データ
      </h2>

      {/* 主要スタッツ 2×2 */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="総ゲーム数" value={`${totalSpins.toLocaleString()}G`} accent="text-white" />
        <StatBox label="BIG" value={`${bigCount}回 (${formatRate(bigCount, totalSpins)})`} accent="text-yellow-300" />
        <StatBox label="REG" value={`${regCount}回 (${formatRate(regCount, totalSpins)})`} accent="text-blue-300" />
        <StatBox label="ブドウ" value={`${grapeCount}回 (${formatRate(grapeCount, totalSpins)})`} accent="text-green-300" />
      </div>

      {/* 期待値サマリ */}
      <div className="border-t border-gray-800 pt-3 grid grid-cols-2 gap-2">
        <StatBox
          label="最有力設定"
          value={`設定${mostLikelySetting} (${mostLikelyProb.toFixed(1)}%)`}
          accent={mostLikelySetting >= 4 ? "text-red-400" : "text-blue-400"}
        />
        <StatBox
          label="期待機械割"
          value={`${(expectedRTP * 100).toFixed(1)}%`}
          accent={expectedRTP >= 1.0 ? "text-green-400" : "text-red-400"}
        />
      </div>

      {/* BIG合算 */}
      {totalSpins > 0 && (
        <p className="text-xs text-gray-500 text-center">
          BIG+REG合算: {formatRate(bigCount + regCount, totalSpins)} ／
          期待合算: 1/{Math.round(1 / (expectedBigRate + posteriors.reduce((a, p, i) => a + p * SETTINGS[i+1].regRate, 0)))}
        </p>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-gray-800 rounded-xl px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${accent} truncate`}>{value}</p>
    </div>
  );
}
