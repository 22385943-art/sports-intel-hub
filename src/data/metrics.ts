// ─── Central Metrics Registry ───
// Defines all metrics across all sports with categories, tooltips, and explanations.

export interface MetricDefinition {
  key: string;
  label: string;
  shortLabel: string;
  category: MetricCategory;
  tooltip: string;
  whyItMatters: string;
  colorVar: string; // CSS variable name
  sport: "nba" | "football" | "ufc";
  higherIsBetter: boolean;
}

export type MetricCategory =
  | "offensive"
  | "defensive"
  | "playmaking"
  | "efficiency"
  | "clutch"
  | "volume"
  | "advanced"
  | "lineup"
  | "trend";

export const METRIC_CATEGORIES: { key: MetricCategory; label: string; icon: string }[] = [
  { key: "offensive", label: "Offensive Impact", icon: "⚡" },
  { key: "defensive", label: "Defensive Impact", icon: "🛡️" },
  { key: "playmaking", label: "Playmaking", icon: "🎯" },
  { key: "efficiency", label: "Efficiency", icon: "📊" },
  { key: "clutch", label: "Clutch", icon: "🔥" },
  { key: "volume", label: "Volume vs Efficiency", icon: "📈" },
  { key: "advanced", label: "Advanced Impact", icon: "🧠" },
  { key: "lineup", label: "Lineup & Context", icon: "🔗" },
  { key: "trend", label: "Trend Analysis", icon: "📉" },
];

// ─── NBA Metrics ───
export const NBA_METRICS: MetricDefinition[] = [
  { key: "gir", label: "Global Impact Rating", shortLabel: "GIR", category: "advanced", tooltip: "Composite metric weighting counting stats by efficiency", whyItMatters: "Captures overall player value in a single number", colorVar: "--chart-teal", sport: "nba", higherIsBetter: true },
  { key: "pva", label: "Playmaking Value Added", shortLabel: "PVA", category: "playmaking", tooltip: "Assist production adjusted for scoring context", whyItMatters: "Reveals true playmaking beyond raw assist numbers", colorVar: "--chart-blue", sport: "nba", higherIsBetter: true },
  { key: "ddi", label: "Defensive Disruption Index", shortLabel: "DDI", category: "defensive", tooltip: "Steals, blocks, and defensive rebounds combined", whyItMatters: "Quantifies active defensive impact on possessions", colorVar: "--chart-negative", sport: "nba", higherIsBetter: true },
  { key: "cps", label: "Clutch Performance Score", shortLabel: "CPS", category: "clutch", tooltip: "Scoring + FT + 3PT reliability under pressure", whyItMatters: "Identifies players who perform when it matters most", colorVar: "--chart-gold", sport: "nba", higherIsBetter: true },
  { key: "eoe", label: "Efficiency Over Expectation", shortLabel: "EOE", category: "efficiency", tooltip: "Points above expected output based on shooting splits", whyItMatters: "Shows who outperforms their shot profile", colorVar: "--chart-teal", sport: "nba", higherIsBetter: true },
  { key: "sqi", label: "Shot Quality Impact", shortLabel: "SQI", category: "offensive", tooltip: "Shooting efficiency weighted by volume", whyItMatters: "Separates efficient volume scorers from low-usage shooters", colorVar: "--chart-blue", sport: "nba", higherIsBetter: true },
  { key: "lsr", label: "Lineup Synergy Rating", shortLabel: "LSR", category: "lineup", tooltip: "Contribution to team chemistry via assists and activity", whyItMatters: "Measures how much a player elevates teammates", colorVar: "--chart-teal", sport: "nba", higherIsBetter: true },
  { key: "uap", label: "Usage-Adjusted Production", shortLabel: "UAP", category: "volume", tooltip: "Per-36 production normalized by shooting efficiency", whyItMatters: "Compares production fairly across different usage rates", colorVar: "--chart-blue", sport: "nba", higherIsBetter: true },
  { key: "onCourtImpact", label: "On-Court Impact", shortLabel: "OCI", category: "advanced", tooltip: "Team point differential when player is on court", whyItMatters: "Direct measure of presence affecting outcomes", colorVar: "--chart-teal", sport: "nba", higherIsBetter: true },
  { key: "offBallGravity", label: "Off-Ball Gravity", shortLabel: "OBG", category: "offensive", tooltip: "How much attention a player draws without the ball", whyItMatters: "Spacing value that doesn't show in box scores", colorVar: "--chart-gold", sport: "nba", higherIsBetter: true },
  { key: "shotCreation", label: "Shot Creation Value", shortLabel: "SCV", category: "playmaking", tooltip: "Volume and quality of shots created for self and others", whyItMatters: "Core offensive engine metric", colorVar: "--chart-blue", sport: "nba", higherIsBetter: true },
  { key: "rimProtection", label: "Rim Protection", shortLabel: "RMP", category: "defensive", tooltip: "Shot contest rate and opponent FG% at the rim", whyItMatters: "Elite rim protectors anchor top defenses", colorVar: "--chart-negative", sport: "nba", higherIsBetter: true },
  { key: "transitionValue", label: "Transition Value", shortLabel: "TRV", category: "offensive", tooltip: "Points and assists generated in transition", whyItMatters: "Fast break efficiency drives modern offense", colorVar: "--chart-teal", sport: "nba", higherIsBetter: true },
];

// ─── Football Metrics ───
export const FOOTBALL_METRICS: MetricDefinition[] = [
  { key: "xgContribution", label: "xG Contribution", shortLabel: "xGC", category: "offensive", tooltip: "Expected goals from shots and key passes", whyItMatters: "True attacking output beyond actual goals scored", colorVar: "--chart-teal", sport: "football", higherIsBetter: true },
  { key: "pressingImpact", label: "Pressing Impact", shortLabel: "PRS", category: "defensive", tooltip: "Successful pressures leading to turnovers", whyItMatters: "Quantifies off-ball defensive intensity", colorVar: "--chart-negative", sport: "football", higherIsBetter: true },
  { key: "buildUpValue", label: "Build-Up Value", shortLabel: "BUV", category: "playmaking", tooltip: "Progressive passing and carrying contribution", whyItMatters: "Identifies players who advance the ball effectively", colorVar: "--chart-blue", sport: "football", higherIsBetter: true },
  { key: "defensiveActions", label: "Defensive Actions", shortLabel: "DEF", category: "defensive", tooltip: "Tackles, interceptions, and clearances combined", whyItMatters: "Raw defensive involvement per 90 minutes", colorVar: "--chart-negative", sport: "football", higherIsBetter: true },
  { key: "goalInvolvement", label: "Goal Involvement", shortLabel: "GI", category: "offensive", tooltip: "Goals + assists per 90 minutes", whyItMatters: "Direct attacking output measurement", colorVar: "--chart-gold", sport: "football", higherIsBetter: true },
  { key: "progressivePassing", label: "Progressive Passing Value", shortLabel: "PPV", category: "playmaking", tooltip: "Passes that move ball significantly toward opponent goal", whyItMatters: "Key indicator of creative passing ability", colorVar: "--chart-blue", sport: "football", higherIsBetter: true },
  { key: "xT", label: "Expected Threat", shortLabel: "xT", category: "advanced", tooltip: "Increase in scoring probability from actions", whyItMatters: "Captures value of moves that don't directly result in shots", colorVar: "--chart-teal", sport: "football", higherIsBetter: true },
  { key: "possessionValue", label: "Possession Value", shortLabel: "PV", category: "efficiency", tooltip: "Value added per possession touched", whyItMatters: "Efficiency metric across all phases of play", colorVar: "--chart-teal", sport: "football", higherIsBetter: true },
  { key: "finalThird", label: "Final Third Impact", shortLabel: "FTI", category: "offensive", tooltip: "Actions in attacking third leading to chances", whyItMatters: "Measures danger in the most critical zone", colorVar: "--chart-gold", sport: "football", higherIsBetter: true },
  { key: "defensiveCoverage", label: "Defensive Coverage Rating", shortLabel: "DCR", category: "defensive", tooltip: "Area covered and positioning quality defensively", whyItMatters: "Spatial awareness and defensive positioning value", colorVar: "--chart-negative", sport: "football", higherIsBetter: true },
];

// ─── UFC Metrics ───
export const UFC_METRICS: MetricDefinition[] = [
  { key: "damageEfficiency", label: "Damage Efficiency", shortLabel: "DMG", category: "offensive", tooltip: "Significant strikes landed per strike attempted", whyItMatters: "Shows striking precision and power", colorVar: "--chart-teal", sport: "ufc", higherIsBetter: true },
  { key: "controlTimeValue", label: "Control Time Value", shortLabel: "CTV", category: "advanced", tooltip: "Effective damage and position advances during control time", whyItMatters: "Not all control time is equal—this measures what you do with it", colorVar: "--chart-blue", sport: "ufc", higherIsBetter: true },
  { key: "strikingAccuracy", label: "Striking Accuracy", shortLabel: "SAC", category: "efficiency", tooltip: "Percentage of strikes that land", whyItMatters: "Precision separates elite strikers from volume fighters", colorVar: "--chart-teal", sport: "ufc", higherIsBetter: true },
  { key: "fightControl", label: "Fight Control Index", shortLabel: "FCI", category: "advanced", tooltip: "Composite of octagon control, pressure, and pace setting", whyItMatters: "Judges reward octagon control—this quantifies it", colorVar: "--chart-gold", sport: "ufc", higherIsBetter: true },
  { key: "momentumShifts", label: "Momentum Shifts", shortLabel: "MOM", category: "clutch", tooltip: "Ability to change fight momentum after being down", whyItMatters: "Separates elite fighters from those who fold under pressure", colorVar: "--chart-gold", sport: "ufc", higherIsBetter: true },
  { key: "strikeDifferential", label: "Strike Differential", shortLabel: "STD", category: "offensive", tooltip: "Net significant strikes (landed minus absorbed)", whyItMatters: "Win/loss correlates strongly with strike differential", colorVar: "--chart-teal", sport: "ufc", higherIsBetter: true },
  { key: "grapplingEfficiency", label: "Grappling Efficiency", shortLabel: "GRP", category: "efficiency", tooltip: "Takedown success rate weighted by position advances", whyItMatters: "Quality of grappling exchanges, not just attempts", colorVar: "--chart-blue", sport: "ufc", higherIsBetter: true },
  { key: "damageAbsorbed", label: "Damage Absorbed Ratio", shortLabel: "DAR", category: "defensive", tooltip: "Significant strikes absorbed per minute", whyItMatters: "Durability and defensive skill indicator", colorVar: "--chart-negative", sport: "ufc", higherIsBetter: false },
  { key: "paceControl", label: "Pace Control", shortLabel: "PAC", category: "advanced", tooltip: "Ability to dictate fight tempo and range", whyItMatters: "Fighters who control pace win more decisions", colorVar: "--chart-blue", sport: "ufc", higherIsBetter: true },
  { key: "dominanceScore", label: "Dominance Score", shortLabel: "DOM", category: "advanced", tooltip: "Comprehensive fight dominance across all phases", whyItMatters: "Single-number summary of fight control quality", colorVar: "--chart-teal", sport: "ufc", higherIsBetter: true },
];

export function getMetricsForSport(sport: string): MetricDefinition[] {
  switch (sport) {
    case "nba": return NBA_METRICS;
    case "football": return FOOTBALL_METRICS;
    case "ufc": return UFC_METRICS;
    default: return [];
  }
}

export function getMetricsByCategory(sport: string, category: MetricCategory): MetricDefinition[] {
  return getMetricsForSport(sport).filter(m => m.category === category);
}

export function getMetricDefinition(sport: string, key: string): MetricDefinition | undefined {
  return getMetricsForSport(sport).find(m => m.key === key);
}
