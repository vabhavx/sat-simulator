// SAT Score Prediction Engine
// Uses raw-to-scaled conversion tables from College Board Practice Tests
// Scores are approximate — actual CB scoring uses IRT weighting per question

export interface ScoreRange {
  lower: number;
  upper: number;
  midpoint: number;
}

export interface PredictedScore {
  rw: ScoreRange;
  math: ScoreRange;
  total: ScoreRange;
  percentile: number;
}

interface ConversionEntry {
  raw: number;
  lower: number;
  upper: number;
}

// Default conversion table derived from College Board Practice Tests
// RW: 0-54 raw → 200-800 scaled
const DEFAULT_RW_TABLE: ConversionEntry[] = [
  { raw: 0, lower: 200, upper: 200 },
  { raw: 1, lower: 200, upper: 210 },
  { raw: 2, lower: 200, upper: 220 },
  { raw: 3, lower: 210, upper: 230 },
  { raw: 4, lower: 220, upper: 240 },
  { raw: 5, lower: 230, upper: 250 },
  { raw: 6, lower: 240, upper: 260 },
  { raw: 7, lower: 250, upper: 270 },
  { raw: 8, lower: 260, upper: 280 },
  { raw: 9, lower: 270, upper: 290 },
  { raw: 10, lower: 280, upper: 300 },
  { raw: 11, lower: 290, upper: 310 },
  { raw: 12, lower: 300, upper: 320 },
  { raw: 13, lower: 310, upper: 340 },
  { raw: 14, lower: 320, upper: 350 },
  { raw: 15, lower: 330, upper: 360 },
  { raw: 16, lower: 340, upper: 370 },
  { raw: 17, lower: 350, upper: 380 },
  { raw: 18, lower: 360, upper: 390 },
  { raw: 19, lower: 370, upper: 400 },
  { raw: 20, lower: 380, upper: 410 },
  { raw: 21, lower: 390, upper: 420 },
  { raw: 22, lower: 400, upper: 430 },
  { raw: 23, lower: 410, upper: 440 },
  { raw: 24, lower: 420, upper: 450 },
  { raw: 25, lower: 430, upper: 460 },
  { raw: 26, lower: 440, upper: 470 },
  { raw: 27, lower: 450, upper: 480 },
  { raw: 28, lower: 460, upper: 490 },
  { raw: 29, lower: 470, upper: 500 },
  { raw: 30, lower: 480, upper: 510 },
  { raw: 31, lower: 490, upper: 530 },
  { raw: 32, lower: 500, upper: 540 },
  { raw: 33, lower: 510, upper: 550 },
  { raw: 34, lower: 520, upper: 560 },
  { raw: 35, lower: 530, upper: 570 },
  { raw: 36, lower: 540, upper: 580 },
  { raw: 37, lower: 550, upper: 600 },
  { raw: 38, lower: 560, upper: 610 },
  { raw: 39, lower: 580, upper: 620 },
  { raw: 40, lower: 590, upper: 640 },
  { raw: 41, lower: 600, upper: 650 },
  { raw: 42, lower: 620, upper: 670 },
  { raw: 43, lower: 630, upper: 680 },
  { raw: 44, lower: 640, upper: 690 },
  { raw: 45, lower: 660, upper: 710 },
  { raw: 46, lower: 670, upper: 720 },
  { raw: 47, lower: 690, upper: 730 },
  { raw: 48, lower: 700, upper: 740 },
  { raw: 49, lower: 710, upper: 750 },
  { raw: 50, lower: 730, upper: 770 },
  { raw: 51, lower: 740, upper: 780 },
  { raw: 52, lower: 760, upper: 790 },
  { raw: 53, lower: 780, upper: 800 },
  { raw: 54, lower: 800, upper: 800 },
];

// Math: 0-44 raw → 200-800 scaled
const DEFAULT_MATH_TABLE: ConversionEntry[] = [
  { raw: 0, lower: 200, upper: 200 },
  { raw: 1, lower: 200, upper: 210 },
  { raw: 2, lower: 200, upper: 230 },
  { raw: 3, lower: 210, upper: 250 },
  { raw: 4, lower: 230, upper: 270 },
  { raw: 5, lower: 250, upper: 290 },
  { raw: 6, lower: 270, upper: 310 },
  { raw: 7, lower: 290, upper: 330 },
  { raw: 8, lower: 310, upper: 350 },
  { raw: 9, lower: 320, upper: 370 },
  { raw: 10, lower: 340, upper: 380 },
  { raw: 11, lower: 350, upper: 400 },
  { raw: 12, lower: 370, upper: 410 },
  { raw: 13, lower: 380, upper: 430 },
  { raw: 14, lower: 400, upper: 440 },
  { raw: 15, lower: 410, upper: 460 },
  { raw: 16, lower: 420, upper: 470 },
  { raw: 17, lower: 440, upper: 490 },
  { raw: 18, lower: 450, upper: 500 },
  { raw: 19, lower: 460, upper: 510 },
  { raw: 20, lower: 470, upper: 530 },
  { raw: 21, lower: 490, upper: 540 },
  { raw: 22, lower: 500, upper: 550 },
  { raw: 23, lower: 510, upper: 570 },
  { raw: 24, lower: 520, upper: 580 },
  { raw: 25, lower: 540, upper: 590 },
  { raw: 26, lower: 550, upper: 610 },
  { raw: 27, lower: 560, upper: 620 },
  { raw: 28, lower: 570, upper: 630 },
  { raw: 29, lower: 590, upper: 640 },
  { raw: 30, lower: 600, upper: 660 },
  { raw: 31, lower: 610, upper: 670 },
  { raw: 32, lower: 620, upper: 680 },
  { raw: 33, lower: 640, upper: 700 },
  { raw: 34, lower: 650, upper: 710 },
  { raw: 35, lower: 660, upper: 720 },
  { raw: 36, lower: 680, upper: 730 },
  { raw: 37, lower: 690, upper: 740 },
  { raw: 38, lower: 700, upper: 760 },
  { raw: 39, lower: 720, upper: 770 },
  { raw: 40, lower: 730, upper: 780 },
  { raw: 41, lower: 750, upper: 790 },
  { raw: 42, lower: 770, upper: 800 },
  { raw: 43, lower: 790, upper: 800 },
  { raw: 44, lower: 800, upper: 800 },
];

function lookupScore(
  rawScore: number,
  table: ConversionEntry[]
): ScoreRange {
  const clamped = Math.max(0, Math.min(rawScore, table.length - 1));
  const entry = table[clamped];
  return {
    lower: entry.lower,
    upper: entry.upper,
    midpoint: Math.round((entry.lower + entry.upper) / 2),
  };
}

export function predictSectionScore(
  sectionType: "rw" | "math",
  rawScore: number,
  customTable?: ConversionEntry[]
): ScoreRange {
  const table =
    customTable ||
    (sectionType === "rw" ? DEFAULT_RW_TABLE : DEFAULT_MATH_TABLE);
  return lookupScore(rawScore, table);
}

export function predictFullScore(
  rwRawScore: number,
  mathRawScore: number,
  customRwTable?: ConversionEntry[],
  customMathTable?: ConversionEntry[]
): PredictedScore {
  const rw = predictSectionScore("rw", rwRawScore, customRwTable);
  const math = predictSectionScore("math", mathRawScore, customMathTable);
  const total: ScoreRange = {
    lower: rw.lower + math.lower,
    upper: rw.upper + math.upper,
    midpoint: rw.midpoint + math.midpoint,
  };
  const percentile = estimatePercentile(total.midpoint);

  return { rw, math, total, percentile };
}

// Percentile estimation based on College Board national data
const PERCENTILE_TABLE: [number, number][] = [
  [400, 1],
  [500, 2],
  [600, 4],
  [700, 7],
  [750, 10],
  [800, 14],
  [850, 18],
  [900, 24],
  [950, 30],
  [1000, 38],
  [1050, 46],
  [1100, 55],
  [1150, 63],
  [1200, 71],
  [1250, 78],
  [1300, 84],
  [1350, 89],
  [1400, 93],
  [1450, 96],
  [1500, 98],
  [1550, 99],
  [1600, 99],
];

export function estimatePercentile(totalScore: number): number {
  if (totalScore <= PERCENTILE_TABLE[0][0]) return PERCENTILE_TABLE[0][1];
  if (totalScore >= PERCENTILE_TABLE[PERCENTILE_TABLE.length - 1][0])
    return PERCENTILE_TABLE[PERCENTILE_TABLE.length - 1][1];

  for (let i = 0; i < PERCENTILE_TABLE.length - 1; i++) {
    const [s1, p1] = PERCENTILE_TABLE[i];
    const [s2, p2] = PERCENTILE_TABLE[i + 1];
    if (totalScore >= s1 && totalScore <= s2) {
      const ratio = (totalScore - s1) / (s2 - s1);
      return Math.round(p1 + ratio * (p2 - p1));
    }
  }
  return 50;
}

// Score benchmarks
export const SAT_BENCHMARKS = {
  collegeReady: { rw: 480, math: 530 },
  competitive: { rw: 600, math: 620 },
  highlyCompetitive: { rw: 700, math: 730 },
} as const;
