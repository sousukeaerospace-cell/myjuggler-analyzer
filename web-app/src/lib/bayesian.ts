import { SETTINGS, SETTING_COUNT, BIG_COINS, REG_COINS, COINS_PER_SPIN } from "./constants";

// ─── コアベイズ計算 ──────────────────────────────────────────────────────────

function logLikelihood(
  s: number,
  totalSpins: number,
  soloBigCount: number,
  soloRegCount: number,
  cherryBigCount: number,
  cherryRegCount: number,
): number {
  const spec = SETTINGS[s];
  const otherRate =
    1 - spec.soloBigRate - spec.soloRegRate - spec.cherryBigRate - spec.cherryRegRate;
  const otherCount = totalSpins - soloBigCount - soloRegCount - cherryBigCount - cherryRegCount;

  if (otherCount < 0) return -Infinity;

  return (
    soloBigCount   * Math.log(spec.soloBigRate   + 1e-20) +
    soloRegCount   * Math.log(spec.soloRegRate   + 1e-20) +
    cherryBigCount * Math.log(spec.cherryBigRate + 1e-20) +
    cherryRegCount * Math.log(spec.cherryRegRate + 1e-20) +
    otherCount     * Math.log(otherRate          + 1e-20)
  );
}

export function computePosteriors(
  totalSpins: number,
  soloBigCount: number,
  soloRegCount: number,
  cherryBigCount: number,
  cherryRegCount: number,
  prior: number[],
): number[] {
  const logPost: number[] = [];

  for (let i = 0; i < SETTING_COUNT; i++) {
    const s = i + 1;
    const ll = logLikelihood(s, totalSpins, soloBigCount, soloRegCount, cherryBigCount, cherryRegCount);
    logPost.push(ll + Math.log(prior[i] + 1e-20));
  }

  const maxLog = Math.max(...logPost);
  const exps = logPost.map(lp => Math.exp(lp - maxLog));
  const sum = exps.reduce((a, b) => a + b, 0);

  return exps.map(e => e / sum);
}

export function computeExpectedRTP(posteriors: number[]): number {
  return posteriors.reduce((acc, p, i) => acc + p * SETTINGS[i + 1].rtp, 0);
}

export function computeHighSettingProb(posteriors: number[]): number {
  return posteriors[3] + posteriors[4] + posteriors[5];
}

// ─── 期待収支 ────────────────────────────────────────────────────────────────

export function computeExpectedHourlyGain(
  posteriors: number[],
  totalSpins: number,
  elapsedMinutes: number,
  coinValue: number = 4,
): number {
  if (elapsedMinutes <= 0 || totalSpins <= 0) return 0;
  const spinsPerHour = (totalSpins / elapsedMinutes) * 60;
  const expectedRTP  = computeExpectedRTP(posteriors);
  return spinsPerHour * COINS_PER_SPIN * (expectedRTP - 1) * coinValue;
}

// ─── 据え置き事前確率 ────────────────────────────────────────────────────────

export function carryoverPrior(
  prevTotalSpins: number,
  prevBig: number,
  prevReg: number,
  prevCoinDiff: number | null,
  uniformPrior: number[],
): number[] {
  if (prevTotalSpins <= 0) return uniformPrior;

  // 前日データはBIG/REGの集計のみ既知なので、全てsoloとして近似する
  const prevPosteriors = computePosteriors(
    prevTotalSpins, prevBig, prevReg, 0, 0, uniformPrior,
  );

  const carryoverRate = 0.60;
  return prevPosteriors.map(
    (p, i) => carryoverRate * p + (1 - carryoverRate) * uniformPrior[i],
  );
}

// ─── 特定日判定 ──────────────────────────────────────────────────────────────

export function isSpecialDay(date: Date = new Date()): boolean {
  const day = date.getDate();
  const dow = date.getDay();

  const is39 = day % 10 === 3 || day % 10 === 9;

  const firstSaturday = (() => {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
    return d.getDate();
  })();
  const isFirstSat = dow === 6 && day === firstSaturday;

  return is39 || isFirstSat;
}

// ─── ステータスフィードバック ─────────────────────────────────────────────────

export function getSoloRegStatus(
  soloRegCount: number,
  totalSpins: number,
): { text: string; color: string } | null {
  if (soloRegCount === 0 || totalSpins < 200) return null;

  const rate = soloRegCount / totalSpins;

  if (rate >= SETTINGS[6].soloRegRate)
    return { text: "🔥 単独REGが設定6以上のペースです！", color: "text-red-400" };
  if (rate >= SETTINGS[5].soloRegRate)
    return { text: "⭐ 単独REGが設定5以上のペースです", color: "text-orange-400" };
  if (rate >= SETTINGS[4].soloRegRate)
    return { text: "✓ 単独REGが設定4以上のペースです", color: "text-yellow-400" };
  if (rate >= SETTINGS[3].soloRegRate)
    return { text: "単独REGが設定3相当のペースです", color: "text-gray-300" };
  if (rate >= SETTINGS[2].soloRegRate)
    return { text: "単独REGが設定2相当のペースです", color: "text-gray-400" };
  return { text: "単独REGが設定1相当のペースです", color: "text-blue-400" };
}
