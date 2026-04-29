export interface SessionData {
  machineNumber: string;
  totalSpins: number;
  soloBigCount:   number;
  soloRegCount:   number;
  cherryBigCount: number;
  cherryRegCount: number;
  priorType: "uniform" | "special_day" | "carryover";
  priorProbabilities: number[];
  posteriors: number[];
  expectedRTP: number;
  highSettingProb: number;
  startedAt: string;
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
