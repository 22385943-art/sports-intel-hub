export interface UFCFighter {
  id: string;
  name: string;
  weightClass: string;
  nickname: string;
  age: number;
  record: { wins: number; losses: number; draws: number };
  stats: {
    sigStrikesPerMin: number;
    strikingAccuracy: number;
    sigStrikesAbsorbedPerMin: number;
    strikingDefense: number;
    takedownAvgPer15: number;
    takedownAccuracy: number;
    takedownDefense: number;
    submissionAvgPer15: number;
    controlTimePct: number;
  };
  fightLog: { date: string; opponent: string; result: "W" | "L" | "D"; method: string; round: number; sigStrikes: number; takedowns: number }[];
}

const generateFightLog = (): UFCFighter["fightLog"] => {
  const opponents = ["Johnson", "Martinez", "Williams", "Anderson", "Thompson", "Garcia", "Davis", "Rodriguez"];
  const methods = ["KO/TKO", "Decision", "Submission", "Decision", "KO/TKO", "Decision"];
  return Array.from({ length: 8 }, (_, i) => ({
    date: new Date(2025, i * 2, 15).toISOString().split("T")[0],
    opponent: opponents[i],
    result: (Math.random() > 0.3 ? "W" : "L") as "W" | "L",
    method: methods[Math.floor(Math.random() * methods.length)],
    round: Math.ceil(Math.random() * 5),
    sigStrikes: Math.round(40 + Math.random() * 80),
    takedowns: Math.round(Math.random() * 6),
  }));
};

export const UFC_FIGHTERS: UFCFighter[] = [
  { id: "uf1", name: "Islam Makhachev", weightClass: "Lightweight", nickname: "N/A", age: 33, record: { wins: 26, losses: 1, draws: 0 }, stats: { sigStrikesPerMin: 4.2, strikingAccuracy: 58, sigStrikesAbsorbedPerMin: 2.1, strikingDefense: 65, takedownAvgPer15: 3.8, takedownAccuracy: 62, takedownDefense: 88, submissionAvgPer15: 1.2, controlTimePct: 42 }, fightLog: generateFightLog() },
  { id: "uf2", name: "Alexander Volkanovski", weightClass: "Featherweight", nickname: "The Great", age: 36, record: { wins: 26, losses: 4, draws: 0 }, stats: { sigStrikesPerMin: 6.8, strikingAccuracy: 52, sigStrikesAbsorbedPerMin: 4.2, strikingDefense: 58, takedownAvgPer15: 1.8, takedownAccuracy: 38, takedownDefense: 82, submissionAvgPer15: 0.3, controlTimePct: 28 }, fightLog: generateFightLog() },
  { id: "uf3", name: "Jon Jones", weightClass: "Heavyweight", nickname: "Bones", age: 38, record: { wins: 27, losses: 1, draws: 0 }, stats: { sigStrikesPerMin: 4.5, strikingAccuracy: 57, sigStrikesAbsorbedPerMin: 2.5, strikingDefense: 64, takedownAvgPer15: 1.9, takedownAccuracy: 44, takedownDefense: 95, submissionAvgPer15: 0.8, controlTimePct: 35 }, fightLog: generateFightLog() },
  { id: "uf4", name: "Sean O'Malley", weightClass: "Bantamweight", nickname: "Sugar", age: 30, record: { wins: 18, losses: 2, draws: 0 }, stats: { sigStrikesPerMin: 5.8, strikingAccuracy: 62, sigStrikesAbsorbedPerMin: 3.8, strikingDefense: 55, takedownAvgPer15: 0.4, takedownAccuracy: 25, takedownDefense: 72, submissionAvgPer15: 0.1, controlTimePct: 12 }, fightLog: generateFightLog() },
  { id: "uf5", name: "Alex Pereira", weightClass: "Light Heavyweight", nickname: "Poatan", age: 37, record: { wins: 12, losses: 2, draws: 0 }, stats: { sigStrikesPerMin: 5.2, strikingAccuracy: 56, sigStrikesAbsorbedPerMin: 3.2, strikingDefense: 52, takedownAvgPer15: 0.2, takedownAccuracy: 20, takedownDefense: 78, submissionAvgPer15: 0.0, controlTimePct: 8 }, fightLog: generateFightLog() },
  { id: "uf6", name: "Ilia Topuria", weightClass: "Featherweight", nickname: "El Matador", age: 27, record: { wins: 16, losses: 0, draws: 0 }, stats: { sigStrikesPerMin: 5.5, strikingAccuracy: 60, sigStrikesAbsorbedPerMin: 2.8, strikingDefense: 62, takedownAvgPer15: 2.2, takedownAccuracy: 52, takedownDefense: 85, submissionAvgPer15: 0.6, controlTimePct: 22 }, fightLog: generateFightLog() },
];

// ─── UFC Advanced Metrics ───

export interface UFCAdvancedMetrics {
  damageEfficiency: number;
  controlTimeValue: number;
  strikingAccuracy: number;
  fightControl: number;
  momentumShifts: number;
  strikeDifferential: number;
  grapplingEfficiency: number;
  damageAbsorbed: number;
  paceControl: number;
  dominanceScore: number;
}

export function computeUFCAdvanced(f: UFCFighter): UFCAdvancedMetrics {
  const { sigStrikesPerMin, strikingAccuracy: sa, sigStrikesAbsorbedPerMin, strikingDefense, takedownAvgPer15, takedownAccuracy, takedownDefense, controlTimePct } = f.stats;
  return {
    damageEfficiency: Math.round(sigStrikesPerMin * (sa / 100) * 20 * 10) / 10,
    controlTimeValue: Math.round((controlTimePct * 0.6 + takedownAvgPer15 * 5) * 10) / 10,
    strikingAccuracy: sa,
    fightControl: Math.round((controlTimePct * 0.3 + strikingDefense * 0.3 + takedownDefense * 0.2 + sa * 0.2) * 10) / 10,
    momentumShifts: Math.round((strikingDefense * 0.4 + (f.record.wins / (f.record.wins + f.record.losses)) * 60) * 10) / 10,
    strikeDifferential: Math.round((sigStrikesPerMin - sigStrikesAbsorbedPerMin) * 10) / 10,
    grapplingEfficiency: Math.round((takedownAccuracy * 0.5 + controlTimePct * 0.5) * 10) / 10,
    damageAbsorbed: Math.round(sigStrikesAbsorbedPerMin * (1 - strikingDefense / 100) * 100) / 100,
    paceControl: Math.round((sigStrikesPerMin * 0.4 + takedownAvgPer15 * 3 + controlTimePct * 0.2) * 10) / 10,
    dominanceScore: Math.round(((f.record.wins / (f.record.wins + f.record.losses + f.record.draws)) * 40 + sa * 0.3 + strikingDefense * 0.2 + takedownDefense * 0.1) * 10) / 10,
  };
}
