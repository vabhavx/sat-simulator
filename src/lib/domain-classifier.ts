// Heuristic domain/skill classifier for SAT questions
// Classifies questions based on prompt text patterns
// Can be overridden by manual tagging in admin

export interface DomainTag {
  domain: string;
  skill: string;
}

// Reading & Writing domains
const RW_PATTERNS: { domain: string; skill: string; patterns: RegExp[] }[] = [
  // Standard English Conventions
  {
    domain: "Standard English Conventions",
    skill: "Boundaries",
    patterns: [
      /conforms to the conventions of Standard English/i,
      /punctuation/i,
      /comma|semicolon|colon|dash|apostrophe/i,
    ],
  },
  {
    domain: "Standard English Conventions",
    skill: "Form, Structure, and Sense",
    patterns: [
      /verb\s+(tense|form|agreement)/i,
      /pronoun/i,
      /parallel\s+structure/i,
      /sentence\s+fragment/i,
      /subject.verb\s+agreement/i,
    ],
  },
  // Expression of Ideas
  {
    domain: "Expression of Ideas",
    skill: "Transitions",
    patterns: [
      /most\s+logical\s+transition/i,
      /completes the text with the most logical transition/i,
      /Which choice completes the text with the most logical transition/i,
    ],
  },
  {
    domain: "Expression of Ideas",
    skill: "Rhetorical Synthesis",
    patterns: [
      /student\s+wants\s+to/i,
      /most\s+effectively\s+uses\s+relevant\s+information/i,
      /notes/i,
      /accomplish\s+this\s+goal/i,
    ],
  },
  // Craft and Structure
  {
    domain: "Craft and Structure",
    skill: "Words in Context",
    patterns: [
      /most\s+logical\s+and\s+precise\s+word\s+or\s+phrase/i,
      /as\s+used\s+in\s+the\s+text.*most\s+nearly\s+mean/i,
      /word.*most\s+nearly\s+mean/i,
    ],
  },
  {
    domain: "Craft and Structure",
    skill: "Text Structure and Purpose",
    patterns: [
      /main\s+purpose/i,
      /overall\s+structure/i,
      /function\s+of\s+the\s+underlined/i,
      /best\s+describes\s+the\s+function/i,
    ],
  },
  {
    domain: "Craft and Structure",
    skill: "Cross-Text Connections",
    patterns: [
      /Text\s*1.*Text\s*2/i,
      /both\s+texts/i,
      /passage\s*1.*passage\s*2/i,
    ],
  },
  // Information and Ideas
  {
    domain: "Information and Ideas",
    skill: "Central Ideas and Details",
    patterns: [
      /main\s+idea/i,
      /main\s+topic/i,
      /central\s+claim/i,
      /best\s+states/i,
    ],
  },
  {
    domain: "Information and Ideas",
    skill: "Inferences",
    patterns: [
      /most\s+logically\s+completes/i,
      /can\s+most\s+reasonably\s+be\s+inferred/i,
      /based\s+on\s+the\s+text/i,
    ],
  },
  {
    domain: "Information and Ideas",
    skill: "Command of Evidence",
    patterns: [
      /quotation.*most\s+effectively\s+illustrates/i,
      /best\s+supports/i,
      /most\s+directly\s+challenge/i,
      /which\s+finding/i,
      /data\s+from\s+the\s+table/i,
    ],
  },
];

// Math domains
const MATH_PATTERNS: { domain: string; skill: string; patterns: RegExp[] }[] = [
  // Algebra
  {
    domain: "Algebra",
    skill: "Linear equations",
    patterns: [
      /linear\s+(equation|function|relationship)/i,
      /y\s*=\s*\d+x/i,
      /slope/i,
      /y-intercept/i,
    ],
  },
  {
    domain: "Algebra",
    skill: "Systems of equations",
    patterns: [
      /system\s+of\s+(equations|inequalities)/i,
      /two\s+equations/i,
      /simultaneous/i,
    ],
  },
  {
    domain: "Algebra",
    skill: "Linear inequalities",
    patterns: [
      /inequality/i,
      /at\s+most|at\s+least/i,
      /≤|≥|<\s*=|>\s*=/,
    ],
  },
  // Advanced Math
  {
    domain: "Advanced Math",
    skill: "Quadratic equations",
    patterns: [
      /quadratic/i,
      /x\^2|x²/i,
      /parabola/i,
      /vertex/i,
      /factor/i,
    ],
  },
  {
    domain: "Advanced Math",
    skill: "Exponential functions",
    patterns: [
      /exponential/i,
      /growth|decay/i,
      /compound/i,
      /\d+\^\w/,
    ],
  },
  {
    domain: "Advanced Math",
    skill: "Polynomial and rational",
    patterns: [
      /polynomial/i,
      /rational\s+(expression|equation|function)/i,
      /x\^3|x³/i,
    ],
  },
  // Problem-Solving and Data Analysis
  {
    domain: "Problem-Solving and Data Analysis",
    skill: "Ratios and proportions",
    patterns: [
      /ratio/i,
      /proportion/i,
      /percent/i,
      /rate/i,
    ],
  },
  {
    domain: "Problem-Solving and Data Analysis",
    skill: "Data interpretation",
    patterns: [
      /table|graph|chart|scatterplot|histogram|bar\s+graph/i,
      /data\s+set/i,
      /survey/i,
      /sample/i,
      /mean|median|mode|range|standard\s+deviation/i,
      /margin\s+of\s+error/i,
      /probability/i,
    ],
  },
  // Geometry and Trigonometry
  {
    domain: "Geometry and Trigonometry",
    skill: "Area, perimeter, and volume",
    patterns: [
      /area|perimeter|volume|surface\s+area/i,
      /rectangle|triangle|circle|cylinder|sphere|cone/i,
      /square\s+centimeters|square\s+inches/i,
    ],
  },
  {
    domain: "Geometry and Trigonometry",
    skill: "Angles and lines",
    patterns: [
      /parallel|perpendicular/i,
      /angle|degree/i,
      /triangle\s+\w+\s+is\s+(similar|congruent)/i,
      /right\s+triangle/i,
      /pythagorean/i,
    ],
  },
  {
    domain: "Geometry and Trigonometry",
    skill: "Trigonometry",
    patterns: [
      /sin|cos|tan|trigonometric/i,
      /unit\s+circle/i,
      /radian/i,
    ],
  },
];

export function classifyQuestion(
  prompt: string,
  sectionType: "rw" | "math"
): DomainTag {
  const patterns = sectionType === "rw" ? RW_PATTERNS : MATH_PATTERNS;

  // Score each pattern group by number of matches
  let bestMatch: DomainTag | null = null;
  let bestScore = 0;

  for (const group of patterns) {
    let score = 0;
    for (const pattern of group.patterns) {
      if (pattern.test(prompt)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { domain: group.domain, skill: group.skill };
    }
  }

  // Fallback defaults
  if (!bestMatch || bestScore === 0) {
    if (sectionType === "rw") {
      // Check for Standard English Conventions (most distinctive)
      if (/conforms to the conventions/i.test(prompt)) {
        return { domain: "Standard English Conventions", skill: "Boundaries" };
      }
      return { domain: "Information and Ideas", skill: "Central Ideas and Details" };
    }
    return { domain: "Algebra", skill: "Linear equations" };
  }

  return bestMatch;
}

// All SAT domains for UI display
export const SAT_DOMAINS = {
  rw: [
    "Information and Ideas",
    "Craft and Structure",
    "Expression of Ideas",
    "Standard English Conventions",
  ],
  math: [
    "Algebra",
    "Advanced Math",
    "Problem-Solving and Data Analysis",
    "Geometry and Trigonometry",
  ],
} as const;
