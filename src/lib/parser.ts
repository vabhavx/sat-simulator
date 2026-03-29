import {
  Exam,
  Section,
  Module,
  Question,
  AnswerOption,
  SAT_TIMING,
} from "@/types/exam";

// Parse filename: "2024 Aug Int-A @EliteXSAT.pdf" → { year, month, version, type }
export function parseFileName(fileName: string): {
  year: number;
  month: string;
  version: string;
  type: "International" | "US" | "Unknown";
} {
  const name = fileName.replace(/@EliteXSAT/gi, "").replace(/\.pdf$/i, "").trim();
  const match = name.match(
    /^(\d{4})\s+(Jan|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+(.+)$/i
  );
  if (!match) {
    return { year: 0, month: "Unknown", version: name, type: "Unknown" };
  }
  const year = parseInt(match[1]);
  const month = match[2];
  const versionRaw = match[3].trim();

  let type: "International" | "US" | "Unknown" = "Unknown";
  if (/Int/i.test(versionRaw)) type = "International";
  else if (/US/i.test(versionRaw)) type = "US";
  else if (/^V\d/i.test(versionRaw)) type = "Unknown"; // Could be either

  return { year, month, version: versionRaw, type };
}

// Generate a stable exam ID from filename
export function generateExamId(fileName: string): string {
  return fileName
    .replace(/@EliteXSAT/gi, "")
    .replace(/\.pdf$/i, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// Section header patterns
const SECTION_PATTERNS = [
  // "Section 1, Module 1: Reading And Writing"
  /Section\s*(\d+),?\s*Module\s*(\d+)\s*:\s*(Reading\s*(?:And|and|&)\s*Writing|Math)/i,
  // "December US-C Math M1" or "December US-C Math M2"
  /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\S+\s+(Math)\s+M(\d+)/i,
  // "Section: Section 1, Module 1: Reading and Writing, Difficulty: unknown"
  /Section:\s*Section\s*(\d+),?\s*Module\s*(\d+)\s*:\s*(Reading\s*(?:And|and|&)\s*Writing|Math)/i,
  // "R & W Module1" or "Math Module1"
  /(?:R\s*&\s*W|Reading\s*(?:and|&)\s*Writing)\s*Module\s*(\d+)/i,
  /Math\s*Module\s*(\d+)/i,
  // "Reading and writing module 1"
  /Reading\s+and\s+writing\s+module\s+(\d+)/i,
  /Math\s+module\s+(\d+)/i,
];

interface ParsedSection {
  sectionType: "rw" | "math";
  moduleNumber: number;
  difficulty?: string;
  startIndex: number;
  text: string;
}

function detectSections(text: string): ParsedSection[] {
  const lines = text.split("\n");
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let matched = false;

    // Pattern 1: "Section X, Module Y: Type"
    let m = line.match(
      /Section\s*(\d+),?\s*Module\s*(\d+)\s*:\s*(Reading\s*(?:And|and|&)\s*Writing|Math)/i
    );
    if (m) {
      const sectionType = /math/i.test(m[3]) ? "math" : "rw";
      const moduleNumber = parseInt(m[2]);
      if (currentSection) {
        currentSection.text = lines
          .slice(currentSection.startIndex, i)
          .join("\n");
      }
      currentSection = { sectionType, moduleNumber, startIndex: i + 1, text: "" };
      sections.push(currentSection);
      matched = true;
    }

    // Pattern: "Section: Section X, Module Y: Type, Difficulty: Z"
    if (!matched) {
      m = line.match(
        /Section:\s*Section\s*(\d+),?\s*Module\s*(\d+)\s*:\s*(Reading\s*(?:And|and|&)\s*Writing|Math)(?:.*Difficulty:\s*(\w+))?/i
      );
      if (m) {
        const sectionType = /math/i.test(m[3]) ? "math" : "rw";
        const moduleNumber = parseInt(m[2]);
        const difficulty = m[4] || undefined;
        if (currentSection) {
          currentSection.text = lines
            .slice(currentSection.startIndex, i)
            .join("\n");
        }
        currentSection = {
          sectionType,
          moduleNumber,
          difficulty,
          startIndex: i + 1,
          text: "",
        };
        sections.push(currentSection);
        matched = true;
      }
    }

    // Pattern: "Month Version Math M1"
    if (!matched) {
      m = line.match(
        /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\S+\s+(Math)\s+M(\d+)/i
      );
      if (m) {
        if (currentSection) {
          currentSection.text = lines
            .slice(currentSection.startIndex, i)
            .join("\n");
        }
        currentSection = {
          sectionType: "math",
          moduleNumber: parseInt(m[2]),
          startIndex: i + 1,
          text: "",
        };
        sections.push(currentSection);
        matched = true;
      }
    }

    // Pattern: "R & W Module1" or "Reading and writing module 1"
    if (!matched) {
      m = line.match(
        /(?:R\s*&\s*W|Reading\s*(?:and|&)\s*Writing|Reading\s+and\s+writing)\s*[Mm]odule\s*(\d+)/i
      );
      if (m) {
        if (currentSection) {
          currentSection.text = lines
            .slice(currentSection.startIndex, i)
            .join("\n");
        }
        currentSection = {
          sectionType: "rw",
          moduleNumber: parseInt(m[1]),
          startIndex: i + 1,
          text: "",
        };
        sections.push(currentSection);
        matched = true;
      }
    }

    // Pattern: "Math module 1" or "Math Module1"
    if (!matched) {
      m = line.match(/^Math\s*[Mm]odule\s*(\d+)/i);
      if (m) {
        if (currentSection) {
          currentSection.text = lines
            .slice(currentSection.startIndex, i)
            .join("\n");
        }
        currentSection = {
          sectionType: "math",
          moduleNumber: parseInt(m[1]),
          startIndex: i + 1,
          text: "",
        };
        sections.push(currentSection);
        matched = true;
      }
    }
  }

  // Close the last section
  if (currentSection) {
    currentSection.text = lines.slice(currentSection.startIndex).join("\n");
  }

  return sections;
}

// Parse answer key from PDF header text
// Format: "1-10 CBBDA CDBAC 11-20 CBCAB CCADD 21-27 ADCDC BD"
function parseAnswerKeyLine(line: string): Map<number, string> {
  const answers = new Map<number, string>();
  // Match ranges like "1-10 LETTERS" or individual answers
  const rangePattern = /(\d+)-(\d+)\s+([A-Da-d\s.]+?)(?=\d+-\d+|$)/g;
  let match;

  while ((match = rangePattern.exec(line)) !== null) {
    const start = parseInt(match[1]);
    const letters = match[3].replace(/[\s.]/g, "").toUpperCase();
    for (let i = 0; i < letters.length; i++) {
      const ch = letters[i];
      if (/[A-D]/.test(ch)) {
        answers.set(start + i, ch);
      }
    }
  }

  return answers;
}

// Try to extract answer keys from the top portion of the PDF
function extractAnswerKeys(text: string): {
  rwModule1: Map<number, string>;
  rwModule2: Map<number, string>;
  mathModule1: Map<number, string>;
  mathModule2: Map<number, string>;
  found: boolean;
} {
  const result = {
    rwModule1: new Map<number, string>(),
    rwModule2: new Map<number, string>(),
    mathModule1: new Map<number, string>(),
    mathModule2: new Map<number, string>(),
    found: false,
  };

  const lines = text.split("\n").slice(0, 50); // Answer keys are near the top
  let currentTarget: "rw1" | "rw2" | "math1" | "math2" | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect which module the answer key is for
    if (/R\s*&\s*W\s*Module\s*1/i.test(trimmed)) {
      currentTarget = "rw1";
      continue;
    }
    if (/R\s*&\s*W\s*Module\s*2/i.test(trimmed)) {
      currentTarget = "rw2";
      continue;
    }
    if (/Math\s*Module\s*1/i.test(trimmed)) {
      currentTarget = "math1";
      continue;
    }
    if (/Math\s*Module\s*2/i.test(trimmed)) {
      currentTarget = "math2";
      continue;
    }

    // Parse answer key data
    if (currentTarget && /\d+-\d+/.test(trimmed)) {
      const parsed = parseAnswerKeyLine(trimmed);
      if (parsed.size > 0) {
        result.found = true;
        const targetMap =
          currentTarget === "rw1"
            ? result.rwModule1
            : currentTarget === "rw2"
              ? result.rwModule2
              : currentTarget === "math1"
                ? result.mathModule1
                : result.mathModule2;
        parsed.forEach((v, k) => targetMap.set(k, v));
      }
    }
  }

  return result;
}

// Parse questions from a section text block
function parseQuestions(
  text: string,
  sectionId: string,
  moduleId: string,
  answerKey?: Map<number, string>
): Question[] {
  const questions: Question[] = [];

  // Split by question numbers: "1)" or "1." at start of line
  // Match pattern: number followed by ) or . at start or after newline
  const questionRegex = /(?:^|\n)\s*(\d+)\s*[.)]\s*/g;
  const splits: { num: number; startIdx: number }[] = [];
  let qMatch;

  while ((qMatch = questionRegex.exec(text)) !== null) {
    splits.push({ num: parseInt(qMatch[1]), startIdx: qMatch.index });
  }

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].startIdx;
    const end = i + 1 < splits.length ? splits[i + 1].startIdx : text.length;
    const questionText = text
      .slice(start, end)
      .replace(/^\s*\d+\s*[.)]\s*/, "")
      .trim();

    const qNum = splits[i].num;
    const qId = `${moduleId}-q${qNum}`;

    // Extract answer options
    const options: AnswerOption[] = [];
    const optionRegex =
      /(?:^|\n)\s*([A-D])\s*[.)]\s*([\s\S]*?)(?=(?:^|\n)\s*[A-D]\s*[.)]\s|$)/gm;
    let optMatch;
    const optionTexts: { letter: string; text: string; index: number }[] = [];

    // Find all option starts
    const optStartRegex = /(?:^|\n)\s*([A-D])\s*[.)]\s*/gm;
    const optStarts: { letter: string; index: number }[] = [];
    let osm;
    while ((osm = optStartRegex.exec(questionText)) !== null) {
      optStarts.push({ letter: osm[1], index: osm.index });
    }

    // Only consider options at the end of the question text
    // Find the first option that starts a contiguous A,B,C,D sequence
    let firstOptionIdx = -1;
    for (let oi = 0; oi < optStarts.length; oi++) {
      if (optStarts[oi].letter === "A") {
        // Check if B,C,D follow
        let valid = true;
        const expected = ["B", "C", "D"];
        for (let ei = 0; ei < expected.length; ei++) {
          if (
            oi + 1 + ei >= optStarts.length ||
            optStarts[oi + 1 + ei].letter !== expected[ei]
          ) {
            valid = false;
            break;
          }
        }
        if (valid) {
          firstOptionIdx = oi;
          // Use the last valid set found (options at the end)
        }
      }
    }

    let promptText = questionText;
    let isFreeResponse = true;

    if (firstOptionIdx >= 0) {
      isFreeResponse = false;
      promptText = questionText
        .slice(0, optStarts[firstOptionIdx].index)
        .trim();

      for (let oi = firstOptionIdx; oi < firstOptionIdx + 4; oi++) {
        const optStart = optStarts[oi].index;
        const optEnd =
          oi + 1 < optStarts.length
            ? optStarts[oi + 1].index
            : questionText.length;
        const optText = questionText
          .slice(optStart)
          .replace(/^\s*[A-D]\s*[.)]\s*/, "")
          .slice(0, optEnd - optStart - (questionText.slice(optStart).match(/^\s*[A-D]\s*[.)]\s*/)?.[ 0]?.length || 0))
          .trim();

        // Simpler extraction
        const rawOpt = questionText.slice(optStart, optEnd);
        const cleanOpt = rawOpt.replace(/^\s*[A-D]\s*[.)]\s*/, "").trim();

        options.push({
          letter: optStarts[oi].letter as "A" | "B" | "C" | "D",
          text: cleanOpt,
        });
      }
    }

    // Determine confidence
    let confidence: "high" | "medium" | "low" = "high";
    let flagReason: string | undefined;

    if (promptText.length < 10) {
      confidence = "low";
      flagReason = "Question text appears too short - may contain images or figures";
    } else if (
      /figure|graph|table|image|diagram|shown|displayed/i.test(promptText) &&
      promptText.length < 100
    ) {
      confidence = "medium";
      flagReason = "Question may reference a figure or image not captured in text";
    }

    if (!isFreeResponse && options.length < 4) {
      confidence = "low";
      flagReason = "Could not extract all answer options";
    }

    const correctAnswer = answerKey?.get(qNum);

    questions.push({
      id: qId,
      number: qNum,
      prompt: promptText,
      options,
      correctAnswer,
      isFreeResponse,
      confidenceFlag: confidence,
      flagReason,
    });
  }

  return questions;
}

export function parseExamText(rawText: string, fileName: string): Exam {
  const { year, month, version, type } = parseFileName(fileName);
  const examId = generateExamId(fileName);

  // Try to extract answer keys
  const answerKeys = extractAnswerKeys(rawText);

  // Detect sections
  const parsedSections = detectSections(rawText);

  // Deduplicate: if we have multiple modules of the same type+number,
  // keep the first one (some PDFs list easy/hard variants)
  const seen = new Set<string>();
  const uniqueSections: ParsedSection[] = [];
  for (const s of parsedSections) {
    const key = `${s.sectionType}-${s.moduleNumber}`;
    if (s.difficulty === "easy" || s.difficulty === "hard") {
      // Skip difficulty variants - keep only "unknown" or first
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSections.push(s);
      }
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSections.push(s);
    }
  }

  // Build sections and modules
  const rwModules: Module[] = [];
  const mathModules: Module[] = [];

  for (const ps of uniqueSections) {
    const sectionPrefix = ps.sectionType === "rw" ? "s1" : "s2";
    const moduleId = `${sectionPrefix}-m${ps.moduleNumber}`;
    const timeLimit =
      ps.sectionType === "rw"
        ? SAT_TIMING.RW_MODULE_SECONDS
        : SAT_TIMING.MATH_MODULE_SECONDS;

    let answerKey: Map<number, string> | undefined;
    if (answerKeys.found) {
      if (ps.sectionType === "rw" && ps.moduleNumber === 1) {
        answerKey = answerKeys.rwModule1;
      } else if (ps.sectionType === "rw" && ps.moduleNumber === 2) {
        answerKey = answerKeys.rwModule2;
      } else if (ps.sectionType === "math" && ps.moduleNumber === 1) {
        answerKey = answerKeys.mathModule1;
      } else if (ps.sectionType === "math" && ps.moduleNumber === 2) {
        answerKey = answerKeys.mathModule2;
      }
    }

    const questions = parseQuestions(
      ps.text,
      sectionPrefix,
      moduleId,
      answerKey
    );

    const mod: Module = {
      id: moduleId,
      number: ps.moduleNumber,
      label: `Module ${ps.moduleNumber}`,
      timeLimitSeconds: timeLimit,
      questions,
      difficulty: ps.difficulty,
    };

    if (ps.sectionType === "rw") rwModules.push(mod);
    else mathModules.push(mod);
  }

  // Sort modules by number
  rwModules.sort((a, b) => a.number - b.number);
  mathModules.sort((a, b) => a.number - b.number);

  const sections: Section[] = [];

  if (rwModules.length > 0) {
    sections.push({
      id: "s1",
      number: 1,
      name: "Reading and Writing",
      modules: rwModules,
    });
  }

  if (mathModules.length > 0) {
    sections.push({
      id: "s2",
      number: 2,
      name: "Math",
      modules: mathModules,
    });
  }

  const totalQuestions = sections.reduce(
    (sum, s) => sum + s.modules.reduce((ms, m) => ms + m.questions.length, 0),
    0
  );

  return {
    id: examId,
    fileName,
    year,
    month,
    version,
    type,
    sections,
    totalQuestions,
    hasAnswerKey: answerKeys.found,
    parsedAt: new Date().toISOString(),
  };
}
