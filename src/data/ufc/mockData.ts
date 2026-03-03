import type { BasePlayer, BaseTeam } from "@/types/sports/base";

export interface UFCWeightClass extends BaseTeam {
  limitLbs: number;
}

export interface UFCFighter extends BasePlayer {
  nickname: string;
  record: string; // Ej: "25-1-0"
  imageUrl: string;
  country: string;
  stats: {
    slpm: number; // Strikes Landed per Min
    strAcc: number; // Striking Accuracy %
    sapm: number; // Strikes Absorbed per Min
    strDef: number; // Striking Defense %
    tdAvg: number; // Takedowns per 15 min
    tdAcc: number; // Takedown Accuracy %
    tdDef: number; // Takedown Defense %
    subAvg: number; // Submissions per 15 min
  };
}

export const UFC_WEIGHT_CLASSES: UFCWeightClass[] = [
  { id: "heavyweight", abbreviation: "HW", name: "Heavyweight", sport: "ufc", limitLbs: 265 },
  { id: "light-heavyweight", abbreviation: "LHW", name: "Light Heavyweight", sport: "ufc", limitLbs: 205 },
  { id: "middleweight", abbreviation: "MW", name: "Middleweight", sport: "ufc", limitLbs: 185 },
  { id: "welterweight", abbreviation: "WW", name: "Welterweight", sport: "ufc", limitLbs: 170 },
  { id: "lightweight", abbreviation: "LW", name: "Lightweight", sport: "ufc", limitLbs: 155 },
  { id: "featherweight", abbreviation: "FW", name: "Featherweight", sport: "ufc", limitLbs: 145 },
  { id: "bantamweight", abbreviation: "BW", name: "Bantamweight", sport: "ufc", limitLbs: 135 },
  { id: "flyweight", abbreviation: "FLW", name: "Flyweight", sport: "ufc", limitLbs: 125 },
];

export const UFC_FIGHTERS: UFCFighter[] = [
  {
    id: "islam-makhachev", name: "Islam Makhachev", nickname: "None", teamId: "lightweight", position: "Wrestler", sport: "ufc",
    record: "25-1-0", country: "RU", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-10/MAKHACHEV_ISLAM_L_10-21.png",
    stats: { slpm: 2.46, strAcc: 60, sapm: 1.27, strDef: 61, tdAvg: 3.17, tdAcc: 61, tdDef: 90, subAvg: 1.2 }
  },
  {
    id: "ilia-topuria", name: "Ilia Topuria", nickname: "El Matador", teamId: "featherweight", position: "Striker/Grappler", sport: "ufc",
    record: "15-0-0", country: "ES", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-02/TOPURIA_ILIA_L_BELT_02-17.png",
    stats: { slpm: 4.46, strAcc: 46, sapm: 3.35, strDef: 65, tdAvg: 1.92, tdAcc: 56, tdDef: 92, subAvg: 1.5 }
  },
  {
    id: "alex-pereira", name: "Alex Pereira", nickname: "Poatan", teamId: "light-heavyweight", position: "Kickboxer", sport: "ufc",
    record: "10-2-0", country: "BR", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-04/PEREIRA_ALEX_L_BELT_04-13.png",
    stats: { slpm: 5.10, strAcc: 62, sapm: 3.65, strDef: 50, tdAvg: 0.19, tdAcc: 100, tdDef: 70, subAvg: 0.1 }
  },
  {
    id: "jon-jones", name: "Jon Jones", nickname: "Bones", teamId: "heavyweight", position: "Mixed Martial Artist", sport: "ufc",
    record: "27-1-0 (1 NC)", country: "US", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-03/JONES_JON_L_BELT_03-04.png",
    stats: { slpm: 4.30, strAcc: 57, sapm: 2.22, strDef: 64, tdAvg: 1.93, tdAcc: 45, tdDef: 95, subAvg: 0.4 }
  }
];