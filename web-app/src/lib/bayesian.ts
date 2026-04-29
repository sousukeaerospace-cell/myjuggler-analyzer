import { SETTINGS, SETTING_COUNT, BIG_COINS, REG_COINS, COINS_PER_SPIN } from "./constants";

// ─── コアベイズ計算 ──────────────────────────────────────────────────────────

/**
 * 多項分布の対数尤度 (log-sum-exp で数値安定計算)
 * 各スピンは BIG / REG / ブドウ / それ以外 の多値事象
 */
function logLikelihood(
  s: number,
  totalSpins: number,
  bigCount: number,
  regCount: number,
  grapeCount: number,
): number {
  const spec = SETTINGS[s];
  const otherRate = 1 - spec.bigRate - spec.regRate - spec.grapeRate;
  const otherCount = totalSpins - bigCount - regCount - grapeCount;

  if (otherCount < 0) return -Infinity;

  return (
    bigCount   * Math.log(spec.bigRate   + 1e-20) +
    regCount   * Math.log(spec.regRate   + 1e-20) +
    grapeCount * Math.log(spec.grapeRate + 1e-20) +
    otherCount * Math.log(otherRate      + 1e-20)
  );
}

/** ベイズ事後確率を計算する (設定1〜6の配列を返す) */
export function computePosteriors(
  totalSpins: number,
  bigCount: number,
  regCount: number,
  grapeCount: number,
  prior: number[],  // 長さ6: 設定1〜6の事前確率
): number[] {
  const logPost: number[] = [];

  for (let i = 0; i < SETTING_COUNT; i++) {
    const s = i + 1;
    const ll = logLikelihood(s, totalSpins, bigCount, regCount, grapeCount);
    logPost.push(ll + Math.log(prior[i] + 1e-20));
  }

  // log-sum-exp 正規化
  const maxLog = Math.max(...logPost);
  const exps = logPost.map(lp => Math.exp(lp - maxLog));
  const sum = exps.reduce((a, b) => a + b, 0);

  return exps.map(e => e / sum);
}

/** 合算期待機械割 (各設定の事後確率 × 機械割の加重和) */
export function computeExpectedRTP(posteriors: number[]): number {
  return posteriors.reduce(
    (acc, p, i) => acc + p * SETTINGS[i + 1].rtp,
    0,
  );
}

/** P(設定4以上) */
export function computeHighSettingProb(posteriors: number[]): number {
  // index 3,4,5 = 設定4,5,6
  return posteriors[3] + posteriors[4] + posteriors[5];
}

// ─── 期待収支計算 ────────────────────────────────────────────────────────────

/** 現在の期待時給 (円/時) を計算する簡易モデル */
export function computeExpectedHourlyGain(
  posteriors: number[],
  totalSpins: number,
  elapsedMinutes: number,
  coinValue: number = 4,  // 1枚 = 4円
): number {
  if (elapsedMinutes <= 0 || totalSpins <= 0) return 0;

  const spinsPerHour = (totalSpins / elapsedMinutes) * 60;
  const expectedRTP  = computeExpectedRTP(posteriors);

  // 期待収益 = スピン/時 × 投入枚数/スピン × (RTP - 1) × 枚単価
  const expectedCoinsPerHour = spinsPerHour * COINS_PER_SPIN * (expectedRTP - 1);
  return expectedCoinsPerHour * coinValue;
}

// ─── 据え置き事前確率 ────────────────────────────────────────────────────────

/**
 * 前日データ (差枚数・BIG・REG・総回転) から
 * 設定推定を行い、今日の据え置き事前確率を返す
 */
export function carryoverPrior(
  prevTotalSpins: number,
  prevBig: number,
  prevReg: number,
  prevCoinDiff: number | null,
  uniformPrior: number[],
): number[] {
  if (prevTotalSpins <= 0) return uniformPrior;

  // 前日のブドウ推定: 差枚数が分かる場合
  // 差枚 = BIG × BIG平均 + REG × REG平均 - 総回転 × 3 + ブドウ × 4 + ...
  // 簡易: ブドウ推定を使わず BIG/REG のみで事後確率を計算
  const prevGrape = 0; // ブドウ未知

  const prevPosteriors = computePosteriors(
    prevTotalSpins, prevBig, prevReg, prevGrape, uniformPrior,
  );

  // 据え置き率を 60% と仮定し、残り 40% は均等
  const carryoverRate = 0.60;
  return prevPosteriors.map(
    (p, i) => carryoverRate * p + (1 - carryoverRate) * uniformPrior[i],
  );
}

// ─── 特定日判定 ──────────────────────────────────────────────────────────────

export function isSpecialDay(date: Date = new Date()): boolean {
  const day = date.getDate();
  const dow = date.getDay(); // 0=日 6=土

  // 3・9のつく日
  const is39 = day % 10 === 3 || day % 10 === 9;

  // 第1土曜日
  const firstSaturday = (() => {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
    return d.getDate();
  })();
  const isFirstSat = dow === 6 && day === firstSaturday;

  return is39 || isFirstSat;
}

// ─── ボーナス間ゲーム数統計 ─────────────────────────────────────────────────

export interface BonusInterval {
  type: "BIG" | "REG";
  gamesAfterLast: number;
}

/** 現在のゾーン評価 (ハマり度合い) */
export function evaluateCurrentZone(
  totalSpins: number,
  bigCount: number,
  regCount: number,
  posteriors: number[],
): { description: string; color: string } {
  const totalBonus = bigCount + regCount;
  if (totalBonus === 0) {
    const spinsSinceBonus = totalSpins;
    if (spinsSinceBonus > 500) {
      return { description: `${spinsSinceBonus}Gハマり中⚠`, color: "text-red-400" };
    }
    return { description: `初当たり待ち (${spinsSinceBonus}G)`, color: "text-gray-300" };
  }

  // 期待BIG間ゲーム数
  const expectedBigInterval = posteriors.reduce(
    (acc, p, i) => acc + p / SETTINGS[i + 1].bigRate,
    0,
  );

  return {
    description: `期待BIG間隔 ${Math.round(expectedBigInterval)}G`,
    color: "text-blue-300",
  };
}
