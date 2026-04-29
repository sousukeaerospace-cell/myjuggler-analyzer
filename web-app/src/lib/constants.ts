// マイジャグラーV 設定別確率・機械割 (4分類スペック値)
export const SETTING_COUNT = 6;

export interface SettingSpec {
  label: string;
  soloBigRate:   number;  // 単独BIG確率
  soloRegRate:   number;  // 単独REG確率 (最大の設定差)
  cherryBigRate: number;  // チェリー重複BIG確率 (全設定ほぼ同一)
  cherryRegRate: number;  // チェリー重複REG確率
  grapeRate:     number;  // ブドウ確率
  rtp: number;            // 機械割
}

export const SETTINGS: Record<number, SettingSpec> = {
  1: {
    label: "設定1",
    soloBigRate:   1 / 273.1,
    soloRegRate:   1 / 409.6,
    cherryBigRate: 1 / 1092.0,
    cherryRegRate: 1 / 1213.6,
    grapeRate:     1 / 6.06,
    rtp: 0.970,
  },
  2: {
    label: "設定2",
    soloBigRate:   1 / 268.4,
    soloRegRate:   1 / 375.3,
    cherryBigRate: 1 / 1092.0,
    cherryRegRate: 1 / 1138.0,
    grapeRate:     1 / 5.98,
    rtp: 0.984,
  },
  3: {
    label: "設定3",
    soloBigRate:   1 / 258.0,
    soloRegRate:   1 / 340.5,
    cherryBigRate: 1 / 1092.0,
    cherryRegRate: 1 / 1092.0,
    grapeRate:     1 / 5.95,
    rtp: 0.999,
  },
  4: {
    label: "設定4",
    soloBigRate:   1 / 248.6,
    soloRegRate:   1 / 321.3,
    cherryBigRate: 1 / 1092.0,
    cherryRegRate: 1 / 1024.0,
    grapeRate:     1 / 5.89,
    rtp: 1.023,
  },
  5: {
    label: "設定5",
    soloBigRate:   1 / 241.3,
    soloRegRate:   1 / 278.8,
    cherryBigRate: 1 / 1092.0,
    cherryRegRate: 1 /  936.0,
    grapeRate:     1 / 5.81,
    rtp: 1.051,
  },
  6: {
    label: "設定6",
    soloBigRate:   1 / 229.1,
    soloRegRate:   1 / 229.1,
    cherryBigRate: 1 / 1092.0,
    cherryRegRate: 1 /  862.3,
    grapeRate:     1 / 5.66,
    rtp: 1.094,
  },
};

export const DEFAULT_PRIOR      = [1/6, 1/6, 1/6, 1/6, 1/6, 1/6];
export const SPECIAL_DAY_PRIOR  = [0.06, 0.10, 0.15, 0.24, 0.24, 0.21];

export const BIG_COINS      = 240;
export const REG_COINS      = 96;
export const COINS_PER_SPIN = 3;

export const HIGH_SETTING_THRESHOLD = 0.30;

// アラート閾値 (3段階)
export const RTP_DANGER_THRESHOLD  = 1.00;  // 期待値マイナス: 退台必須
export const RTP_CAUTION_THRESHOLD = 1.02;  // 期待値低め: 注意
export const HIGH_DANGER_THRESHOLD = 0.15;  // 高設定確率が極端に低い: 危険
// (後方互換)
export const RTP_ALERT_THRESHOLD   = 1.00;

export const SETTING_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#6366f1",
  3: "#8b5cf6",
  4: "#f59e0b",
  5: "#f97316",
  6: "#ef4444",
};
