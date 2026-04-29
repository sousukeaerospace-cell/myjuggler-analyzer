// マイジャグラーV 設定別確率・機械割 (公式スペック値)
export const SETTING_COUNT = 6;

export interface SettingSpec {
  label: string;
  bigRate: number;       // BIG確率 (1回あたり)
  regRate: number;       // REG確率 (1回あたり)
  grapeRate: number;     // ブドウ確率 (1回あたり)
  cherryBigRate: number; // チェリー重複BIG確率
  cherryRegRate: number; // チェリー重複REG確率
  rtp: number;           // 機械割 (1.097 = 109.7%)
}

export const SETTINGS: Record<number, SettingSpec> = {
  1: {
    label: "設定1",
    bigRate:      1 / 287.4,
    regRate:      1 / 442.6,
    grapeRate:    1 / 6.06,
    cherryBigRate: 1 / 1489.0,
    cherryRegRate: 1 / 1489.0,
    rtp: 0.970,
  },
  2: {
    label: "設定2",
    bigRate:      1 / 282.5,
    regRate:      1 / 399.6,
    grapeRate:    1 / 5.98,
    cherryBigRate: 1 / 1489.0,
    cherryRegRate: 1 / 1024.0,
    rtp: 0.984,
  },
  3: {
    label: "設定3",
    bigRate:      1 / 266.6,
    regRate:      1 / 371.0,
    grapeRate:    1 / 5.95,
    cherryBigRate: 1 / 1489.0,
    cherryRegRate: 1 /  910.6,
    rtp: 0.999,
  },
  4: {
    label: "設定4",
    bigRate:      1 / 260.9,
    regRate:      1 / 334.8,
    grapeRate:    1 / 5.89,
    cherryBigRate: 1 / 1024.0,
    cherryRegRate: 1 /  682.7,
    rtp: 1.023,
  },
  5: {
    label: "設定5",
    bigRate:      1 / 252.5,
    regRate:      1 / 292.6,
    grapeRate:    1 / 5.81,
    cherryBigRate: 1 / 1024.0,
    cherryRegRate: 1 /  585.1,
    rtp: 1.051,
  },
  6: {
    label: "設定6",
    bigRate:      1 / 241.3,
    regRate:      1 / 252.5,
    grapeRate:    1 / 5.66,
    cherryBigRate: 1 /  682.7,
    cherryRegRate: 1 /  341.3,
    rtp: 1.094,
  },
};

// 通常日の事前確率 (均等)
export const DEFAULT_PRIOR = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];

// 高設定期待日 (3・9のつく日, 第1土曜) の事前確率
export const SPECIAL_DAY_PRIOR = [0.06, 0.10, 0.15, 0.24, 0.24, 0.21];

// BIG1回の平均獲得枚数
export const BIG_COINS = 240;
// REG1回の平均獲得枚数
export const REG_COINS = 96;
// 1回転あたり投入枚数 (3枚掛け)
export const COINS_PER_SPIN = 3;

// 設定4以上の合算確率がこれを下回ったら警告
export const HIGH_SETTING_THRESHOLD = 0.30;
// 合算期待機械割がこれを下回ったら退台推奨
export const RTP_ALERT_THRESHOLD = 1.00;

// 台カラー (設定1=青系 〜 設定6=赤系)
export const SETTING_COLORS: Record<number, string> = {
  1: "#3b82f6",  // blue-500
  2: "#6366f1",  // indigo-500
  3: "#8b5cf6",  // violet-500
  4: "#f59e0b",  // amber-500
  5: "#f97316",  // orange-500
  6: "#ef4444",  // red-500
};
