"use client";

import { SETTINGS } from "@/lib/constants";
import { getSoloRegStatus } from "@/lib/bayesian";

interface Props {
  totalSpins:     number;
  soloBigCount:   number;
  soloRegCount:   number;
  cherryBigCount: number;
  cherryRegCount: number;
  grapeCount:     number;
  posteriors:     number[];
  expectedRTP:    number;
}

function formatRate(count: number, spins: number): string {
  if (count === 0 || spins === 0) return "—";
  return `1/${Math.round(spins / count)}`;
}

export default function StatsDisplay({
  totalSpins,
  soloBigCount,
  soloRegCount,
  cherryBigCount,
  cherryRegCount,
  grapeCount,
  posteriors,
  expectedRTP,
}: Props) {
  const mostLikelySetting = posteriors.indexOf(Math.max(...posteriors)) + 1;
  const mostLikelyProb    = (Math.max(...posteriors) * 100).toFixed(1);

  const totalBig = soloBigCount + cherryBigCount;
  const totalReg = soloRegCount + cherryRegCount;

  const status = getSoloRegStatus(soloRegCount, totalSpins);

  return (
    <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">実戦データ</h2>

      {/* ステータスフィードバック */}
      {status && (
        <div className={`bg-gray-800 rounded-xl px-3 py-2 text-sm font-bold ${status.color}`}>
          {status.text}
        </div>
      )}

      {/* メインスタッツ */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="総ゲーム数" value={`${totalSpins.toLocaleString()}G`} accent="text-white" />
        <StatBox
          label="期待機械割"
          value={`${(expectedRTP * 100).toFixed(1)}%`}
          accent={expectedRTP >= 1.0 ? "text-green-400" : "text-red-400"}
        />
      </div>

      {/* 4種別カウント */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox
          label="単独BIG"
          value={`${soloBigCount}回 ${formatRate(soloBigCount, totalSpins)}`}
          accent="text-yellow-300"
        />
        <StatBox
          label="単独REG ★"
          value={`${soloRegCount}回 ${formatRate(soloRegCount, totalSpins)}`}
          accent="text-blue-300"
        />
        <StatBox
          label="🍒重複BIG"
          value={`${cherryBigCount}回 ${formatRate(cherryBigCount, totalSpins)}`}
          accent="text-orange-300"
        />
        <StatBox
          label="🍒重複REG"
          value={`${cherryRegCount}回 ${formatRate(cherryRegCount, totalSpins)}`}
          accent="text-purple-300"
        />
        <StatBox
          label="🍇ブドウ"
          value={`${grapeCount}回 ${formatRate(grapeCount, totalSpins)}`}
          accent="text-green-300"
        />
      </div>

      {/* 設定推定サマリ */}
      <div className="border-t border-gray-800 pt-3">
        <StatBox
          label="最有力設定"
          value={`設定${mostLikelySetting} (${mostLikelyProb}%)`}
          accent={mostLikelySetting >= 4 ? "text-red-400" : "text-blue-400"}
        />
      </div>

      {/* 合算表示 */}
      {totalSpins > 0 && (
        <p className="text-xs text-gray-500 text-center">
          BIG合算: {formatRate(totalBig, totalSpins)} ／ REG合算: {formatRate(totalReg, totalSpins)}
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-gray-800 rounded-xl px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${accent} truncate`}>{value}</p>
    </div>
  );
}
