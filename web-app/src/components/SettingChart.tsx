"use client";

import { SETTINGS, SETTING_COLORS } from "@/lib/constants";

interface Props {
  posteriors: number[];  // 長さ6: 設定1〜6
}

export default function SettingChart({ posteriors }: Props) {
  const max = Math.max(...posteriors, 0.01);

  return (
    <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        設定別期待度
      </h2>

      {[1, 2, 3, 4, 5, 6].map((s, i) => {
        const prob = posteriors[i];
        const pct  = prob * 100;
        const barW = (prob / max) * 100;
        const color = SETTING_COLORS[s];

        return (
          <div key={s} className="flex items-center gap-2">
            {/* 設定ラベル */}
            <span
              className="text-sm font-bold w-6 shrink-0 text-right"
              style={{ color }}
            >
              {s}
            </span>

            {/* バー */}
            <div className="flex-1 bg-gray-800 rounded-full h-7 overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out flex items-center"
                style={{
                  width: `${barW}%`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
              {/* 確率テキスト (バー上に重ねる) */}
              <span className="absolute inset-0 flex items-center pl-3 text-xs font-semibold text-white drop-shadow">
                {pct >= 1 ? `${pct.toFixed(1)}%` : `${pct.toFixed(2)}%`}
              </span>
            </div>

            {/* 機械割 */}
            <span className="text-xs text-gray-500 w-14 shrink-0 text-right">
              {(SETTINGS[s].rtp * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
