export interface SessionData {
  machineNumber: string;
  totalSpins: number;
  bigCount: number;
  regCount: number;
  grapeCount: number;
  cherryBigCount: number;
  cherryRegCount: number;
  priorType: "uniform" | "special_day" | "carryover";
  priorProbabilities: number[];  // length 6, settings 1-6
  posteriors: number[];           // length 6
  expectedRTP: number;
  highSettingProb: number;       // P(S >= 4)
  startedAt: string;             // ISO timestamp
  updatedAt: string;
}

export interface MachineRecord {
  machineNumber: string;
  date: string;
  totalSpins: number | null;
  bigCount: number | null;
  regCount: number | null;
  lastCoinDiff: number | null;
}

export interface ImportedData {
  generatedAt: string;
  date: string;
  store: string;
  machinModel: string;
  machines: MachineRecord[];
}

export type AlertLevel = "none" | "caution" | "danger";

export interface AlertState {
  level: AlertLevel;
  message: string;
  expectedRTP: number;
  highSettingProb: number;
}
