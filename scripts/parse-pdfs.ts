import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

const PDF_DIR = path.resolve(__dirname, "../../");
const OUTPUT_DIR = path.resolve(__dirname, "../public/data/exams");
const CATALOG_FILE = path.resolve(__dirname, "../public/data/catalog.json");

const RW_MODULE_SECONDS = 32 * 60;
const MATH_MODULE_SECONDS = 35 * 60;
const MIN_TEXT_CHARS = 3000;

// Types
interface AnswerOption { letter: "A" | "B" | "C" | "D"; text: string; }
interface Question {
  id: string; number: number; prompt: string; options: AnswerOption[];
  correctAnswer?: string; isFreeResponse: boolean;
  confidenceFlag: "high" | "medium" | "low"; flagReason?: string;
}
interface Module {
  id: string; number: number; label: string;
  timeLimitSeconds: number; questions: Question[]; difficulty?: string;
}
interface Section { id: string; number: number; name: string; modules: Module[]; }
interface Exam {
  id: string; fileName: string; year: number; month: string; version: string;
  type: "International" | "US" | "Unknown"; sections: Section[];
  totalQuestions: number; hasAnswerKey: boolean; parsedAt: string;
}
interface ExamEntry {
  id: string; fileName: string; year: number; month: string; version: string;
  type: "International" | "US" | "Unknown"; totalQuestions: number; hasAnswerKey: boolean;
}

// OCR text extraction (for image-based PDFs)
function extractTextOCR(filePath: string): string {
  const pages = extractTextOCRPages(filePath);
  return pages.join("\n\n");
}

// OCR text extraction returning individual page texts
function extractTextOCRPages(filePath: string): string[] {
  const tmpDir = path.join(os.tmpdir(), `sat-ocr-${Date.now()}`);
  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    // Convert PDF pages to JPEG at 300 DPI
    execSync(`pdftoppm -jpeg -r 300 "${filePath}" ${tmpDir}/page`, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: "utf-8",
    });

    // Find all generated JPEG files and sort them
    const jpgFiles = fs.readdirSync(tmpDir)
      .filter((f) => f.endsWith(".jpg"))
      .sort();

    const pageTexts: string[] = [];
    for (const jpg of jpgFiles) {
      const jpgPath = path.join(tmpDir, jpg);
      try {
        // Must use pipe via stdin - direct file path fails in sandbox
        const pageText = execSync(`cat "${jpgPath}" | tesseract stdin stdout`, {
          maxBuffer: 50 * 1024 * 1024,
          encoding: "utf-8",
          timeout: 60000,
        });
        pageTexts.push(pageText);
      } catch {
        // Skip pages where OCR fails
        continue;
      }
    }

    return pageTexts;
  } catch {
    return [];
  } finally {
    // Clean up temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ── Bluebook Screenshot OCR Parser ──────────────────────────
// Each Bluebook page = one question. Parse page-by-page.

function cleanOCRPage(raw: string): string {
  let t = raw;
  // Strip section/module headers that repeat on every page
  t = t.replace(/^.*Section\s*\d+\s*[-—]\s*(Reading\s*(?:and|&)\s*Writing|Math).*$/gmi, "");
  t = t.replace(/^.*Module\s*\d+.*$/gmi, "");
  // Strip timer patterns
  t = t.replace(/\d{1,2}:\d{2}/g, "");
  // Strip UI elements
  t = t.replace(/Mark for Review/gi, "");
  t = t.replace(/Highlights?\s*&\s*Notes/gi, "");
  t = t.replace(/Directions?\s*[~v^]*/gi, "");
  t = t.replace(/\(Hide[^)]*\)/gi, "");
  t = t.replace(/^.*Hide\s*$/gmi, "");
  t = t.replace(/^.*More\s*$/gmi, "");
  t = t.replace(/^.*sati600s\.com.*$/gmi, "");
  // Strip EliteXSAT watermark artifacts
  t = t.replace(/EliteXSAT\s*\|?\s*EliteXSAT/gi, "");
  t = t.replace(/Made in Azer\w*/gi, "");
  t = t.replace(/siitexsar/gi, "");
  // Strip standalone symbols and noise
  t = t.replace(/^[ \t]*[*LO©|—\-]+\s*$/gm, "");
  t = t.replace(/^[ \t]*[A-Z]\s*$/gm, ""); // single uppercase letter on a line
  t = t.replace(/^[ \t]*\d{1,2}\)?\s*$/gm, ""); // standalone question number indicator
  t = t.replace(/^[ \t]*SS\s*$/gm, "");
  // Normalize answer options from OCR: (A) or @)
  t = t.replace(/\(([A-D])\)/g, "$1)");
  t = t.replace(/@\)/g, "A)");
  // Collapse blanks
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

function detectSectionFromPage(text: string): "rw" | "math" | null {
  if (/Reading\s*(?:and|&)\s*Writing/i.test(text)) return "rw";
  if (/Math/i.test(text) && /Section\s*\d/i.test(text)) return "math";
  return null;
}

function detectModuleFromPage(text: string): number | null {
  const m = text.match(/Module\s*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

function extractQuestionFromPage(pageText: string, qNum: number, moduleId: string): Question | null {
  const cleaned = cleanOCRPage(pageText);
  if (cleaned.length < 20) return null; // Too short, probably blank or transition page

  // Find answer options A) B) C) D)
  const optRegex = /(?:^|\n)\s*([A-D])\s*[.)]\s*(.*?)(?=(?:\n\s*[A-D]\s*[.)]|\s*$))/gs;
  const opts: AnswerOption[] = [];
  let lastOptEnd = 0;
  let firstOptStart = -1;
  let match;

  // Simpler approach: find A) B) C) D) blocks
  const lines = cleaned.split("\n");
  let optLines: { letter: string; lineIdx: number; text: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const optMatch = line.match(/^([A-D])\s*[.)]\s*(.*)/);
    if (optMatch) {
      optLines.push({ letter: optMatch[1], lineIdx: i, text: optMatch[2] });
    }
  }

  // Find the best ABCD sequence
  let bestStart = -1;
  for (let i = 0; i < optLines.length; i++) {
    if (optLines[i].letter === "A") {
      let valid = true;
      const next = ["B", "C", "D"];
      for (let ni = 0; ni < next.length; ni++) {
        if (i + 1 + ni >= optLines.length || optLines[i + 1 + ni].letter !== next[ni]) {
          valid = false; break;
        }
      }
      if (valid) bestStart = i;
    }
  }

  let promptText = cleaned;
  let isFreeResponse = true;

  if (bestStart >= 0) {
    isFreeResponse = false;
    const aLineIdx = optLines[bestStart].lineIdx;
    const dLineIdx = optLines[bestStart + 3].lineIdx;

    // Prompt is everything before A)
    promptText = lines.slice(0, aLineIdx).join("\n").trim();

    // Build options, including continuation lines
    for (let oi = 0; oi < 4; oi++) {
      const opt = optLines[bestStart + oi];
      const startLine = opt.lineIdx;
      const endLine = oi < 3 ? optLines[bestStart + oi + 1].lineIdx : lines.length;
      let optText = opt.text;
      for (let li = startLine + 1; li < endLine; li++) {
        const lt = lines[li].trim();
        if (lt && !/^[A-D]\s*[.)]/.test(lt)) {
          optText += " " + lt;
        }
      }
      opts.push({ letter: opt.letter as "A" | "B" | "C" | "D", text: optText.trim() });
    }
  }

  // Skip if prompt is too short (likely a blank/transition page)
  if (promptText.length < 15) return null;

  // Confidence
  let confidence: "high" | "medium" | "low" = "high";
  let flagReason: string | undefined;
  if (promptText.length < 30) {
    confidence = "low";
    flagReason = "OCR question text may be incomplete";
  } else if (/figure|graph|table|image|diagram/i.test(promptText) && promptText.length < 80) {
    confidence = "medium";
    flagReason = "Question may reference a figure not captured in OCR";
  }
  if (!isFreeResponse && opts.length < 4) {
    confidence = "low";
    flagReason = "Could not extract all answer options from OCR";
  }

  return {
    id: `${moduleId}-q${qNum}`,
    number: qNum,
    prompt: promptText,
    options: opts,
    isFreeResponse,
    confidenceFlag: confidence,
    flagReason,
  };
}

function parseExamFromOCRPages(pages: string[], fileName: string): Exam {
  const { year, month, version, type } = parseFileName(fileName);
  const examId = generateExamId(fileName);

  // Detect section boundaries by scanning page headers
  interface PageInfo {
    pageIdx: number;
    section: "rw" | "math" | null;
    module: number | null;
    text: string;
  }

  const pageInfos: PageInfo[] = pages.map((text, idx) => ({
    pageIdx: idx,
    section: detectSectionFromPage(text),
    module: detectModuleFromPage(text),
    text,
  }));

  // Group pages into modules based on section/module changes
  interface ModuleGroup {
    sectionType: "rw" | "math";
    moduleNumber: number;
    pages: string[];
  }

  const groups: ModuleGroup[] = [];
  let currentSection: "rw" | "math" = "rw";
  let currentModule = 1;
  let currentPages: string[] = [];

  for (const pi of pageInfos) {
    const newSection = pi.section || currentSection;
    const newModule = pi.module || currentModule;

    if (newSection !== currentSection || newModule !== currentModule) {
      if (currentPages.length > 0) {
        groups.push({ sectionType: currentSection, moduleNumber: currentModule, pages: [...currentPages] });
      }
      currentSection = newSection;
      currentModule = newModule;
      currentPages = [pi.text];
    } else {
      currentPages.push(pi.text);
    }
  }
  if (currentPages.length > 0) {
    groups.push({ sectionType: currentSection, moduleNumber: currentModule, pages: currentPages });
  }

  // Merge groups with same section+module (they repeat on every page)
  const mergedMap = new Map<string, ModuleGroup>();
  for (const g of groups) {
    const key = `${g.sectionType}-${g.moduleNumber}`;
    const existing = mergedMap.get(key);
    if (existing) {
      existing.pages.push(...g.pages);
    } else {
      mergedMap.set(key, { ...g, pages: [...g.pages] });
    }
  }

  const mergedGroups = Array.from(mergedMap.values());

  // Parse questions from each group (one page = one question)
  const rwModules: Module[] = [];
  const mathModules: Module[] = [];

  for (const group of mergedGroups) {
    const prefix = group.sectionType === "rw" ? "s1" : "s2";
    const moduleId = `${prefix}-m${group.moduleNumber}`;
    const timeLimit = group.sectionType === "rw" ? RW_MODULE_SECONDS : MATH_MODULE_SECONDS;

    const questions: Question[] = [];
    let qNum = 1;
    for (const pageText of group.pages) {
      const q = extractQuestionFromPage(pageText, qNum, moduleId);
      if (q) {
        questions.push(q);
        qNum++;
      }
    }

    if (questions.length < 3) continue; // Too few questions, skip this module

    const mod: Module = {
      id: moduleId, number: group.moduleNumber, label: `Module ${group.moduleNumber}`,
      timeLimitSeconds: timeLimit, questions,
    };

    if (group.sectionType === "rw") rwModules.push(mod);
    else mathModules.push(mod);
  }

  rwModules.sort((a, b) => a.number - b.number);
  mathModules.sort((a, b) => a.number - b.number);

  const sections: Section[] = [];
  if (rwModules.length > 0) {
    sections.push({ id: "s1", number: 1, name: "Reading and Writing", modules: rwModules });
  }
  if (mathModules.length > 0) {
    sections.push({ id: "s2", number: 2, name: "Math", modules: mathModules });
  }

  const totalQuestions = sections.reduce(
    (sum, s) => sum + s.modules.reduce((ms, m) => ms + m.questions.length, 0), 0
  );

  return {
    id: examId, fileName, year, month, version, type, sections,
    totalQuestions, hasAnswerKey: false,
    parsedAt: new Date().toISOString(),
  };
}

// PDF text extraction (with OCR fallback)
function extractText(filePath: string): string {
  try {
    const text = execSync(`pdftotext "${filePath}" -`, {
      maxBuffer: 50 * 1024 * 1024, encoding: "utf-8",
    });
    if (text.replace(/\s/g, "").length >= MIN_TEXT_CHARS) return text;
    // Fall back to OCR for image-based PDFs
    process.stdout.write("(using OCR) ");
    return extractTextOCR(filePath);
  } catch {
    return extractTextOCR(filePath);
  }
}

// Clean text: strip zero-width chars, watermarks, UI artifacts
function cleanText(raw: string): string {
  let text = raw;
  // CRITICAL: Normalize Cyrillic lookalike letters to Latin equivalents
  // PDFs from Azerbaijan often contain Cyrillic А(U+0410), В(U+0412), С(U+0421)
  // instead of Latin A(U+0041), B(U+0042), C(U+0043) — breaks answer parsing
  text = text.replace(/\u0410/g, "A"); // Cyrillic А → Latin A
  text = text.replace(/\u0412/g, "B"); // Cyrillic В → Latin B
  text = text.replace(/\u0421/g, "C"); // Cyrillic С → Latin C
  text = text.replace(/\u0415/g, "E"); // Cyrillic Е → Latin E
  text = text.replace(/\u041E/g, "O"); // Cyrillic О → Latin O
  text = text.replace(/\u0420/g, "P"); // Cyrillic Р → Latin P
  text = text.replace(/\u0422/g, "T"); // Cyrillic Т → Latin T
  text = text.replace(/\u041D/g, "H"); // Cyrillic Н → Latin H
  text = text.replace(/\u041C/g, "M"); // Cyrillic М → Latin M
  text = text.replace(/\u041A/g, "K"); // Cyrillic К → Latin K
  text = text.replace(/\u0425/g, "X"); // Cyrillic Х → Latin X
  // Replace form feeds and vertical tabs with newlines
  text = text.replace(/[\f\v]/g, "\n");
  // Strip zero-width spaces and other invisible Unicode
  text = text.replace(/[\u200B\u200C\u200D\uFEFF\u200E\u200F]/g, "");
  // Strip EliteXSAT branding lines
  text = text.replace(/^[ \t]*(EliteX|XSAT|EliteXSAT|Azerbaljan|Azerbaijan)\s*$/gm, "");
  // Strip "Elite" on its own line (UI artifact)
  text = text.replace(/^[ \t]*Elite\s*$/gm, "");
  // Strip "Mark for Review" and "Hide" UI artifacts (including OCR variants)
  text = text.replace(/^[ \t]*(Mark for Review|Hide|C\*)\s*$/gm, "");
  text = text.replace(/Highlights\s*&\s*Notes/gi, "");
  text = text.replace(/^[ \t]*(More|Directions)\s*[~v^]*\s*$/gm, "");
  // OCR artifacts: EliteXSAT watermark (diagonal, may appear garbled)
  text = text.replace(/EliteXSAT\s*\|\s*EliteXSAT/gi, "");
  text = text.replace(/Directions\s*[~v^]*/gi, "");
  // OCR answer format: (A) → A)
  text = text.replace(/\(([A-D])\)/g, "$1)");
  // OCR answer format: @) → A) (OCR misread of circled A)
  text = text.replace(/@\)/g, "A)");
  // Bluebook screenshot format: standalone answer letters → letter period format
  // "A\n\nTransformed" → "A. Transformed" (answer option on its own line)
  text = text.replace(/^[ \t]*([A-D])[ \t]*\n+(?=\s*[A-Z])/gm, "$1. ");
  // Strip timer artifacts like "29:08"
  text = text.replace(/^[ \t]*\d{1,2}:\d{2}\s*$/gm, "");
  // Strip standalone dashes
  text = text.replace(/^[ \t]*-\s*$/gm, "");
  // Collapse multiple blank lines
  text = text.replace(/\n{4,}/g, "\n\n\n");
  return text;
}

// Parse filename
function parseFileName(fileName: string) {
  const name = fileName.replace(/@EliteXSAT/gi, "").replace(/\.pdf$/i, "").trim();
  const match = name.match(/^(\d{4})\s+(Jan|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\s+(.+)$/i);
  if (!match) return { year: 0, month: "Unknown", version: name, type: "Unknown" as const };
  const year = parseInt(match[1]);
  const month = match[2];
  const versionRaw = match[3].trim();
  let type: "International" | "US" | "Unknown" = "Unknown";
  if (/Int/i.test(versionRaw)) type = "International";
  else if (/US/i.test(versionRaw)) type = "US";
  return { year, month, version: versionRaw, type };
}

function generateExamId(fileName: string): string {
  return fileName.replace(/@EliteXSAT/gi, "").replace(/\.pdf$/i, "").trim()
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// Section detection
interface RawSection {
  sectionType: "rw" | "math";
  moduleNumber: number;
  difficulty?: string;
  text: string;
}

function detectAndSplitSections(text: string): RawSection[] {
  const lines = text.split("\n");
  const sections: { type: "rw" | "math"; mod: number; diff?: string; lineStart: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    let m: RegExpMatchArray | null;

    // Skip lines that are numbered list items (TOC entries like "1. Section 1, Module 1...")
    if (/^\d+\.\s+Section\s/i.test(line)) continue;

    // Pattern: "Section: Section X, Module Y: Type, Difficulty: Z" (preferred, has colon prefix)
    m = line.match(/^Section:\s*Section\s*(\d+),?\s*Module\s*(\d+)\s*:\s*(Reading\s*(?:And|and|&)\s*Writing|Math)/i);
    if (m) {
      const sType = /math/i.test(m[3]) ? "math" : "rw";
      const modNum = parseInt(m[2]);
      const diffMatch = line.match(/Difficulty:\s*(\w+)/i);
      sections.push({ type: sType, mod: modNum, diff: diffMatch?.[1], lineStart: i + 1 });
      continue;
    }

    // Pattern: "Section X, Module Y: Reading And Writing" (standalone, not prefixed by number)
    m = line.match(/^Section\s*(\d+),?\s*Module\s*(\d+)\s*:\s*(Reading\s*(?:And|and|&)\s*Writing|Math)/i);
    if (m) {
      const sType = /math/i.test(m[3]) ? "math" : "rw";
      const modNum = parseInt(m[2]);
      sections.push({ type: sType, mod: modNum, lineStart: i + 1 });
      continue;
    }

    // Pattern: "Month Version Verbal M1 from EliteXSAT"
    m = line.match(/Verbal\s*M(\d+)/i);
    if (m) {
      sections.push({ type: "rw", mod: parseInt(m[1]), lineStart: i + 1 });
      continue;
    }

    // Pattern: "Month Version Math M1 from EliteXSAT" or "Month US-X Math M1"
    m = line.match(/Math\s*M(\d+)/i);
    if (m && !/Module/i.test(line)) {
      sections.push({ type: "math", mod: parseInt(m[1]), lineStart: i + 1 });
      continue;
    }

    // Pattern: "R & W Module1" (answer key header format) - skip in first 50 lines
    m = line.match(/(?:R\s*&\s*W|Reading\s*(?:and|&)\s*Writing)\s*Module\s*(\d+)/i);
    if (m && !/Section/i.test(line)) {
      if (i > 50) {
        sections.push({ type: "rw", mod: parseInt(m[1]), lineStart: i + 1 });
      }
      continue;
    }

    // Pattern: "Math Module1"
    m = line.match(/^Math\s*[Mm]odule\s*(\d+)/i);
    if (m && i > 50) {
      sections.push({ type: "math", mod: parseInt(m[1]), lineStart: i + 1 });
      continue;
    }

    // Pattern: "Reading and writing module 1"
    m = line.match(/^Reading\s+and\s+writing\s+module\s+(\d+)/i);
    if (m && i > 50) {
      sections.push({ type: "rw", mod: parseInt(m[1]), lineStart: i + 1 });
      continue;
    }

    // Pattern: Bluebook screenshot multi-line format
    // "Section 1" then "-" then "Reading and Writing" then "Module 1" across 2-6 lines
    m = line.match(/^Section\s*(\d+)\s*$/i);
    if (m) {
      const sectionNum = parseInt(m[1]);
      // Look ahead up to 6 lines for subject and module
      let subject: "rw" | "math" | null = null;
      let modNum: number | null = null;
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const lt = lines[j].trim();
        if (/^Reading\s+(?:and|&)\s+Writing$/i.test(lt)) subject = "rw";
        if (/^Math$/i.test(lt)) subject = "math";
        const modMatch = lt.match(/^Module\s*(\d+)/i);
        if (modMatch) modNum = parseInt(modMatch[1]);
        if (subject && modNum) break;
      }
      if (subject && modNum) {
        const key = `${subject}-${modNum}`;
        // Only add if this is the first occurrence of this section+module
        const alreadyExists = sections.some(s => s.type === subject && s.mod === modNum);
        if (!alreadyExists) {
          sections.push({ type: subject, mod: modNum, lineStart: i + 1 });
        }
      }
      continue;
    }
  }

  // Build section texts
  const result: RawSection[] = [];
  for (let si = 0; si < sections.length; si++) {
    const start = sections[si].lineStart;
    const end = si + 1 < sections.length ? sections[si + 1].lineStart - 1 : lines.length;
    result.push({
      sectionType: sections[si].type,
      moduleNumber: sections[si].mod,
      difficulty: sections[si].diff,
      text: lines.slice(start, end).join("\n"),
    });
  }

  return result;
}

// Extract answer keys
function extractAnswerKeys(text: string): {
  keys: Map<string, Map<number, string>>; // "rw-1" → {1: "A", 2: "B", ...}
  found: boolean;
} {
  const keys = new Map<string, Map<number, string>>();
  let found = false;

  const lines = text.split("\n").slice(0, 60);
  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect answer key section labels
    if (/R\s*&\s*W\s*Module\s*1/i.test(trimmed)) { currentKey = "rw-1"; continue; }
    if (/R\s*&\s*W\s*Module\s*2/i.test(trimmed)) { currentKey = "rw-2"; continue; }
    if (/Math\s*Module\s*1/i.test(trimmed)) { currentKey = "math-1"; continue; }
    if (/Math\s*Module\s*2/i.test(trimmed)) { currentKey = "math-2"; continue; }

    if (currentKey && /\d+-\d+/.test(trimmed)) {
      const rangePattern = /(\d+)-(\d+)\s+([A-Da-d\s.]+?)(?=\d+-\d+|$)/g;
      let match;
      while ((match = rangePattern.exec(trimmed)) !== null) {
        const start = parseInt(match[1]);
        const letters = match[3].replace(/[\s.]/g, "").toUpperCase();
        if (!keys.has(currentKey)) keys.set(currentKey, new Map());
        const map = keys.get(currentKey)!;
        for (let i = 0; i < letters.length; i++) {
          if (/[A-D]/.test(letters[i])) {
            map.set(start + i, letters[i]);
            found = true;
          }
        }
      }
    }
  }

  return { keys, found };
}

// Find sequences of consecutively numbered questions in text
function findQuestionSequences(text: string): { num: number; idx: number; len: number }[][] {
  // Match question numbers: "1." or "1)" or standalone "1\n" on its own line (Bluebook format)
  const qRegex = /(?:^|\n)\s*(\d+)\s*(?:[.)]\s*|\n)/g;
  const markers: { num: number; idx: number; len: number }[] = [];
  let m;
  while ((m = qRegex.exec(text)) !== null) {
    const num = parseInt(m[1]);
    // Skip 0 and very large numbers (not real question numbers)
    if (num === 0 || num > 50) continue;
    markers.push({ num, idx: m.index, len: m[0].length });
  }

  const sequences: typeof markers[] = [];
  let cur: typeof markers = [];

  for (const marker of markers) {
    if (cur.length === 0) {
      if (marker.num === 1) cur = [marker];
    } else {
      const last = cur[cur.length - 1];
      if (marker.num === last.num + 1) {
        cur.push(marker);
      } else if (marker.num > last.num + 1 && marker.num <= last.num + 3 && marker.num <= 30) {
        cur.push(marker);
      } else if (marker.num === 1) {
        if (cur.length >= 3) sequences.push([...cur]);
        cur = [marker];
      } else {
        if (cur.length >= 3) sequences.push([...cur]);
        cur = [];
      }
    }
  }
  if (cur.length >= 3) sequences.push(cur);

  return sequences;
}

// Parse questions from a sequence of markers in text
function buildQuestionsFromSequence(
  text: string, seq: { num: number; idx: number; len: number }[],
  moduleId: string, answerKey?: Map<number, string>
): Question[] {
  const questions: Question[] = [];
  const toProcess = seq;

  for (let i = 0; i < toProcess.length; i++) {
    const start = toProcess[i].idx + toProcess[i].len;
    const end = i + 1 < toProcess.length ? toProcess[i + 1].idx : text.length;
    const qText = text.slice(start, end).trim();
    const qNum = toProcess[i].num;
    const qId = `${moduleId}-q${qNum}`;

    // Find answer options (A. B. C. D.) — match at start of line, after newline, OR inline
    const optRegex = /(?:^|\n|\s{2,})([A-D])\s*[.)]\s*/gm;
    const optStarts: { letter: string; index: number; len: number }[] = [];
    let om;
    while ((om = optRegex.exec(qText)) !== null) {
      optStarts.push({ letter: om[1], index: om.index, len: om[0].length });
    }

    // Find last valid ABCD sequence (allow partial — at least A, B, C)
    let firstOpt = -1;
    for (let oi = 0; oi < optStarts.length; oi++) {
      if (optStarts[oi].letter === "A") {
        // Check for full ABCD
        let count = 1;
        const expected = ["B", "C", "D"];
        for (let ni = 0; ni < expected.length; ni++) {
          if (oi + count < optStarts.length && optStarts[oi + count].letter === expected[ni]) {
            count++;
          }
        }
        if (count >= 3) firstOpt = oi; // At least A, B, C found
      }
    }

    const options: AnswerOption[] = [];
    let promptText = qText;
    let isFreeResponse = true;

    if (firstOpt >= 0) {
      isFreeResponse = false;
      promptText = qText.slice(0, optStarts[firstOpt].index).trim();

      for (let oi = firstOpt; oi < firstOpt + 4 && oi < optStarts.length; oi++) {
        const oStart = optStarts[oi].index + optStarts[oi].len;
        const oEnd = oi + 1 < optStarts.length ? optStarts[oi + 1].index : qText.length;
        options.push({
          letter: optStarts[oi].letter as "A" | "B" | "C" | "D",
          text: qText.slice(oStart, oEnd).trim(),
        });
      }
    }

    // Confidence assessment
    let confidence: "high" | "medium" | "low" = "high";
    let flagReason: string | undefined;

    if (promptText.length < 10) {
      confidence = "low";
      flagReason = "Question text too short - may contain images or figures";
    } else if (/figure|graph|table|image|diagram|(?:not\s+drawn\s+to\s+scale)/i.test(promptText) && promptText.length < 80) {
      confidence = "medium";
      flagReason = "Question may reference a figure not captured in text";
    }
    if (!isFreeResponse && options.length < 4) {
      confidence = "low";
      flagReason = "Could not extract all answer options";
    }

    questions.push({
      id: qId, number: qNum, prompt: promptText, options,
      correctAnswer: answerKey?.get(qNum),
      isFreeResponse, confidenceFlag: confidence, flagReason,
    });
  }

  return questions;
}

// Convenience: parse first sequence of questions from text
function parseQuestions(
  text: string, moduleId: string, answerKey?: Map<number, string>
): Question[] {
  const sequences = findQuestionSequences(text);
  if (sequences.length === 0) return [];
  return buildQuestionsFromSequence(text, sequences[0], moduleId, answerKey);
}

// Parse ALL question sequences from text, returning an array of question arrays
function parseAllSequences(
  text: string, moduleIdPrefix: string, answerKey?: Map<number, string>
): Question[][] {
  const sequences = findQuestionSequences(text);
  return sequences.map((seq, idx) =>
    buildQuestionsFromSequence(text, seq, `${moduleIdPrefix}-seq${idx}`, answerKey)
  );
}

// Assign question sequences to RW and Math modules
function assignSequencesToModules(
  allSequences: Question[][],
  existingRWCount: number,
  existingMathCount: number
): { rwQuestions: Question[][]; mathQuestions: Question[][] } {
  const rwQuestions: Question[][] = [];
  const mathQuestions: Question[][] = [];
  let rwMod = existingRWCount + 1;
  let mathMod = existingMathCount + 1;

  for (const questions of allSequences) {
    if (questions.length === 0) continue;
    const qCount = questions.length;

    // Assign by count: ~27 = RW, ~22 = Math
    if (qCount >= 25 && qCount <= 30 && rwQuestions.length + existingRWCount < 2) {
      // Re-ID the questions
      for (const q of questions) {
        q.id = `s1-m${rwMod}-q${q.number}`;
      }
      rwQuestions.push(questions);
      rwMod++;
    } else if (qCount >= 15 && qCount <= 24 && mathQuestions.length + existingMathCount < 2) {
      for (const q of questions) {
        q.id = `s2-m${mathMod}-q${q.number}`;
      }
      mathQuestions.push(questions);
      mathMod++;
    } else {
      // Assign by order: fill RW first, then Math
      if (rwQuestions.length + existingRWCount < 2) {
        for (const q of questions) q.id = `s1-m${rwMod}-q${q.number}`;
        rwQuestions.push(questions);
        rwMod++;
      } else if (mathQuestions.length + existingMathCount < 2) {
        for (const q of questions) q.id = `s2-m${mathMod}-q${q.number}`;
        mathQuestions.push(questions);
        mathMod++;
      }
    }
  }

  return { rwQuestions, mathQuestions };
}

function parseExam(rawText: string, fileName: string): Exam {
  const { year, month, version, type } = parseFileName(fileName);
  const examId = generateExamId(fileName);
  const text = cleanText(rawText);

  if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
    // Not enough text from pdftotext - try page-based OCR parsing
    process.stdout.write("(trying OCR pages) ");
    const ocrPages = extractTextOCRPages(filePath);
    if (ocrPages.length > 5) {
      const ocrExam = parseExamFromOCRPages(ocrPages, fileName);
      if (ocrExam.totalQuestions >= 5) {
        return ocrExam;
      }
    }
    // Give up - truly empty/encrypted PDF
    return {
      id: examId, fileName, year, month, version, type,
      sections: [], totalQuestions: 0, hasAnswerKey: false,
      parsedAt: new Date().toISOString(),
    };
  }

  const answerKeysResult = extractAnswerKeys(text);
  const rawSections = detectAndSplitSections(text);

  const rwModules: Module[] = [];
  const mathModules: Module[] = [];
  const extraSequences: Question[][] = [];

  // Parse each detected section
  const bestByKey = new Map<string, { mod: Module; sectionType: string }>();

  for (const rs of rawSections) {
    const prefix = rs.sectionType === "rw" ? "s1" : "s2";
    const moduleId = `${prefix}-m${rs.moduleNumber}`;
    const timeLimit = rs.sectionType === "rw" ? RW_MODULE_SECONDS : MATH_MODULE_SECONDS;
    const akKey = `${rs.sectionType === "rw" ? "rw" : "math"}-${rs.moduleNumber}`;
    const answerKey = answerKeysResult.found ? answerKeysResult.keys.get(akKey) : undefined;

    // Find ALL question sequences in this section's text
    const allSeqs = findQuestionSequences(rs.text);

    if (allSeqs.length === 0) continue;

    // First sequence belongs to this section
    const firstQuestions = buildQuestionsFromSequence(rs.text, allSeqs[0], moduleId, answerKey);
    const key = `${rs.sectionType}-${rs.moduleNumber}`;

    const existing = bestByKey.get(key);
    if (!existing || firstQuestions.length > existing.mod.questions.length) {
      bestByKey.set(key, {
        sectionType: rs.sectionType,
        mod: {
          id: moduleId, number: rs.moduleNumber, label: `Module ${rs.moduleNumber}`,
          timeLimitSeconds: timeLimit, questions: firstQuestions, difficulty: rs.difficulty,
        },
      });
    }

    // Additional sequences are "extra" - likely math questions without headers
    for (let si = 1; si < allSeqs.length; si++) {
      const extraQ = buildQuestionsFromSequence(rs.text, allSeqs[si], `extra-${si}`);
      if (extraQ.length >= 5) extraSequences.push(extraQ);
    }
  }

  // Collect modules from sections
  for (const [key, entry] of bestByKey) {
    if (entry.mod.questions.length > 0) {
      if (key.startsWith("rw")) rwModules.push(entry.mod);
      else mathModules.push(entry.mod);
    }
  }

  // Assign extra sequences (unlabeled math modules, etc.)
  if (extraSequences.length > 0) {
    const { rwQuestions, mathQuestions } = assignSequencesToModules(
      extraSequences, rwModules.length, mathModules.length
    );
    for (let i = 0; i < rwQuestions.length; i++) {
      rwModules.push({
        id: `s1-m${rwModules.length + 1}`, number: rwModules.length + 1, label: `Module ${rwModules.length + 1}`,
        timeLimitSeconds: RW_MODULE_SECONDS, questions: rwQuestions[i],
      });
    }
    for (let i = 0; i < mathQuestions.length; i++) {
      mathModules.push({
        id: `s2-m${mathModules.length + 1}`, number: mathModules.length + 1, label: `Module ${mathModules.length + 1}`,
        timeLimitSeconds: MATH_MODULE_SECONDS, questions: mathQuestions[i],
      });
    }
  }

  // Fallback: if still too few questions, try unsectioned parsing on full text
  const totalFromSections = rwModules.reduce((s, m) => s + m.questions.length, 0) +
    mathModules.reduce((s, m) => s + m.questions.length, 0);

  if (totalFromSections < 10) {
    const allSeqs = findQuestionSequences(text);
    const allQArrays = allSeqs.map((seq, i) =>
      buildQuestionsFromSequence(text, seq, `fallback-${i}`)
    );
    const { rwQuestions, mathQuestions } = assignSequencesToModules(allQArrays, 0, 0);
    rwModules.length = 0;
    mathModules.length = 0;

    for (let i = 0; i < rwQuestions.length; i++) {
      rwModules.push({
        id: `s1-m${i + 1}`, number: i + 1, label: `Module ${i + 1}`,
        timeLimitSeconds: RW_MODULE_SECONDS, questions: rwQuestions[i],
      });
    }
    for (let i = 0; i < mathQuestions.length; i++) {
      mathModules.push({
        id: `s2-m${i + 1}`, number: i + 1, label: `Module ${i + 1}`,
        timeLimitSeconds: MATH_MODULE_SECONDS, questions: mathQuestions[i],
      });
    }
  }

  rwModules.sort((a, b) => a.number - b.number);
  mathModules.sort((a, b) => a.number - b.number);

  const sections: Section[] = [];
  if (rwModules.length > 0) {
    sections.push({ id: "s1", number: 1, name: "Reading and Writing", modules: rwModules });
  }
  if (mathModules.length > 0) {
    sections.push({ id: "s2", number: 2, name: "Math", modules: mathModules });
  }

  const totalQuestions = sections.reduce(
    (sum, s) => sum + s.modules.reduce((ms, m) => ms + m.questions.length, 0), 0
  );

  return {
    id: examId, fileName, year, month, version, type, sections,
    totalQuestions, hasAnswerKey: answerKeysResult.found,
    parsedAt: new Date().toISOString(),
  };
}

// ============================================================
// College Board Practice Test helpers
// ============================================================

/** Clean text from CB practice test PDFs */
function cleanCBText(raw: string): string {
  let text = raw;
  // Replace form feeds and vertical tabs with newlines
  text = text.replace(/[\f\v]/g, "\n");
  // Strip zero-width spaces and other invisible Unicode
  text = text.replace(/[\u200B\u200C\u200D\uFEFF\u200E\u200F]/g, "");
  // Strip "Unauthorized copying..." lines
  text = text.replace(/^.*Unauthorized copying or reuse.*$/gm, "");
  // Strip dotted separator lines
  text = text.replace(/^[\s.]{20,}$/gm, "");
  // Strip "CO NTI N U E" or "CONTINUE" footers
  text = text.replace(/^[ \t]*CO\s*NTI\s*N\s*U\s*E\s*$/gm, "");
  text = text.replace(/^[ \t]*CONTINUE\s*$/gm, "");
  // Normalize page-number-dash patterns like "-6 - - - - - - ~" to just the number
  // These serve as question number markers in the exam
  text = text.replace(/^[ \t]*-\s*(\d+)\s*[-\s~]+$/gm, "$1");
  // Strip patterns with NO number like "- --------~"
  text = text.replace(/^[ \t]*-\s*[-\s~]+$/gm, "");
  // Strip standalone page numbers (just a number on its own line, but only for larger numbers likely pages)
  // We'll handle this more carefully in parsing
  // Strip "SAT PRACTICE TEST" lines
  text = text.replace(/^.*SAT PRACTICE TEST.*$/gm, "");
  // Strip copyright lines
  text = text.replace(/^.*© \d{4} College Board.*$/gm, "");
  // Strip "No Test Material On This Page"
  text = text.replace(/^.*No Test Material On This Page.*$/gm, "");
  // Strip reference section formulas (geometry reference) - they appear as garbled text
  text = text.replace(/^[ \t]*[■~@£].*$/gm, "");
  // Collapse multiple blank lines
  text = text.replace(/\n{4,}/g, "\n\n\n");
  return text;
}

/** Split CB exam text into 4 module texts using STOP markers */
function splitCBModules(text: string): string[] {
  const lines = text.split("\n");
  const moduleStarts: number[] = [];
  const moduleEnds: number[] = [];

  // Find module start patterns:
  // "Module" on one line, then module number on next non-blank line,
  // then subject "Reading and Writing" or "Math" on next non-blank line,
  // then "N QUESTIONS" nearby
  for (let i = 0; i < lines.length - 5; i++) {
    if (lines[i].trim() !== "Module") continue;
    // Scan next ~8 lines for: a module number (1 or 2), a subject, and "N QUESTIONS"
    let hasModNum = false;
    let hasSubject = false;
    let hasQuestions = false;
    for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
      const lt = lines[j].trim();
      if (!lt) continue;
      if (/^[12]$/.test(lt)) hasModNum = true;
      if (/^(Reading and Writing|Math)$/i.test(lt)) hasSubject = true;
      if (/^\d+\s+QUESTIONS$/i.test(lt)) hasQuestions = true;
    }
    if (hasModNum && hasSubject && hasQuestions) {
      moduleStarts.push(i);
    }
  }

  // Find STOP markers
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "STOP") {
      moduleEnds.push(i);
    }
  }

  // Build module texts
  const modules: string[] = [];
  for (let mi = 0; mi < moduleStarts.length; mi++) {
    const start = moduleStarts[mi];
    // Find the next STOP after this module start
    const end = moduleEnds.find(e => e > start) || lines.length;
    // Skip past ALL header/instructions pages to find actual question content
    // Math modules have 2 instruction pages; RW modules have 1
    let contentStart = start;
    // Find the LAST instruction marker within the first ~120 lines
    let lastInstructionLine = start;
    for (let j = start; j < Math.min(start + 120, end); j++) {
      const lt = lines[j].trim();
      if (/^For multiple-choice questions/i.test(lt) ||
          /^For student-produced response/i.test(lt) ||
          /^The questions in this section/i.test(lt) ||
          /^your circled answer/i.test(lt) ||
          /^Don't include symbols/i.test(lt)) {
        lastInstructionLine = j;
      }
    }
    contentStart = lastInstructionLine;
    // Move past the remaining instruction text to find the first blank line after instructions
    for (let j = contentStart; j < Math.min(contentStart + 40, end); j++) {
      if (lines[j].trim() === "" && j > contentStart + 1) {
        contentStart = j + 1;
        break;
      }
    }
    modules.push(lines.slice(contentStart, end).join("\n"));
    // Remove this STOP from the list so next module gets the next STOP
    const stopIdx = moduleEnds.indexOf(end);
    if (stopIdx >= 0) moduleEnds.splice(stopIdx, 1);
  }

  return modules;
}

/** Check if a line is a CB noise/boilerplate line that should be stripped from prompts */
function isCBNoiseLine(lt: string): boolean {
  if (!lt) return true;
  if (/^Module$/i.test(lt)) return true;
  if (/^\d+\s+QUESTIONS$/i.test(lt)) return true;
  if (/^DIRECTIONS$/i.test(lt)) return true;
  if (/^NOTES$/i.test(lt)) return true;
  if (/^REFERENCE$/i.test(lt)) return true;
  if (/^STOP$/i.test(lt)) return true;
  if (/^The questions in this section/i.test(lt)) return true;
  if (/^Use of a calculator/i.test(lt)) return true;
  if (/^Unless otherwise indicated/i.test(lt)) return true;
  if (/^All variables and expressions/i.test(lt)) return true;
  if (/^Figures provided/i.test(lt)) return true;
  if (/^All figures lie/i.test(lt)) return true;
  if (/^The domain of a given/i.test(lt)) return true;
  if (/^For multiple-choice/i.test(lt)) return true;
  if (/^Circle only one/i.test(lt)) return true;
  if (/^For student-produced/i.test(lt)) return true;
  if (/^Once you've written/i.test(lt)) return true;
  if (/^If you find more/i.test(lt)) return true;
  if (/^Your answer can be/i.test(lt)) return true;
  if (/^If your answer is/i.test(lt)) return true;
  if (/^Don't include symbols/i.test(lt)) return true;
  if (/^your circled answer/i.test(lt)) return true;
  if (/^single best answer/i.test(lt)) return true;
  if (/^Each question has a$/i.test(lt)) return true;
  if (/^question includes one or more/i.test(lt)) return true;
  if (/^and question carefully/i.test(lt)) return true;
  if (/^All questions in this section/i.test(lt)) return true;
  if (/^Reading and Writing$/i.test(lt)) return true;
  if (/^Math$/i.test(lt)) return true;
  // Page number / question number noise patterns
  if (/^\d+\s*[-\s~]+$/.test(lt)) return true;
  return false;
}

/** Find all A)B)C)D) option blocks in lines, returning their positions */
function findCBOptionBlocks(lines: string[]): {
  aLineIdx: number;
  dEndLineIdx: number;
  options: AnswerOption[];
}[] {
  const optionBlocks: { aLineIdx: number; dEndLineIdx: number; options: AnswerOption[] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Match A) with or without text after it (some options have text on next line)
    if (!/^A\)/.test(trimmed)) continue;

    const opts: { letter: string; startLine: number; text: string }[] = [];
    let curLetter = "";
    let curText = "";
    let curStartLine = i;
    let lastOptLine = i;

    for (let j = i; j < Math.min(i + 40, lines.length); j++) {
      const lt = lines[j].trim();
      // Match option letter with optional text (e.g., "A) text" or just "A)")
      const optMatch = lt.match(/^([A-D])\)\s*(.*)/);
      if (optMatch) {
        if (curLetter) {
          opts.push({ letter: curLetter, startLine: curStartLine, text: curText.trim() });
        }
        curLetter = optMatch[1];
        curText = optMatch[2];
        curStartLine = j;
        lastOptLine = j;
      } else if (curLetter === "D" && (!lt || /^Module$/i.test(lt) || /^\d+$/.test(lt) ||
                 /^\d+\s*[-\s~]+$/.test(lt) || /^STOP$/i.test(lt))) {
        // After D), stop at blank lines or noise
        break;
      } else if (curLetter && lt && !/^Module$/i.test(lt) && !/^\d+$/.test(lt) &&
                 !/^STOP$/i.test(lt) && !/^Unauthorized/i.test(lt) &&
                 !/^CO\s*NTI/i.test(lt) && !/^\d+\s*[-\s~]+$/.test(lt)) {
        curText += " " + lt;
        lastOptLine = j;
      } else if (curLetter === "D") {
        break;
      } else if (!curLetter || (curLetter && !lt)) {
        if (curLetter === "D") break;
        continue;
      }
    }
    if (curLetter) {
      opts.push({ letter: curLetter, startLine: curStartLine, text: curText.trim() });
    }

    const letters = opts.map(o => o.letter).join("");
    if (letters !== "ABCD") continue;

    optionBlocks.push({
      aLineIdx: i,
      dEndLineIdx: lastOptLine,
      options: opts.map(o => ({
        letter: o.letter as "A" | "B" | "C" | "D",
        text: o.text,
      })),
    });

    i = lastOptLine;
  }

  return optionBlocks;
}

/** Parse questions from a CB module text block */
function parseCBModuleQuestions(
  text: string,
  moduleId: string,
  expectedCount: number,
  answerKey: Map<number, string>,
  sectionType: string,
): Question[] {
  const lines = text.split("\n");

  // Step 1: Find all A)B)C)D) option blocks
  const optionBlocks = findCBOptionBlocks(lines);

  // Step 2: For RW sections (all MCQ, 33 questions), option blocks map 1:1 to questions
  if (sectionType === "rw") {
    const questions: Question[] = [];
    let prevEndLine = 0;

    for (let bi = 0; bi < optionBlocks.length; bi++) {
      const block = optionBlocks[bi];
      const qNum = bi + 1;

      const promptLines: string[] = [];
      for (let li = prevEndLine; li < block.aLineIdx; li++) {
        const lt = lines[li].trim();
        if (isCBNoiseLine(lt)) continue;
        if (/^\d+$/.test(lt) && parseInt(lt) <= 50) continue;
        promptLines.push(lt);
      }

      const promptText = promptLines.join("\n").trim();

      let confidence: "high" | "medium" | "low" = "high";
      let flagReason: string | undefined;
      if (promptText.length < 10) {
        confidence = "low";
        flagReason = "Question text too short - may contain images or figures";
      } else if (/figure|graph|table|image|diagram|(?:not\s+drawn\s+to\s+scale)/i.test(promptText) && promptText.length < 80) {
        confidence = "medium";
        flagReason = "Question may reference a figure not captured in text";
      }

      questions.push({
        id: `${moduleId}-q${qNum}`,
        number: qNum,
        prompt: promptText,
        options: block.options,
        correctAnswer: answerKey.get(qNum),
        isFreeResponse: false,
        confidenceFlag: confidence,
        flagReason,
      });

      prevEndLine = block.dEndLineIdx + 1;
    }
    return questions;
  }

  // Step 3: For Math sections, questions can be MCQ or free-response (interleaved).
  // Use answer key to determine question type, and map option blocks to MCQ questions.
  const questions: Question[] = [];
  const answerNums = Array.from(answerKey.keys()).sort((a, b) => a - b);

  // Determine which questions are MCQ vs free-response from the answer key
  const mcqQuestions = new Set<number>();
  const frQuestions = new Set<number>();
  for (const qNum of answerNums) {
    const ans = answerKey.get(qNum)!;
    if (/^[A-D]$/.test(ans)) {
      mcqQuestions.add(qNum);
    } else {
      frQuestions.add(qNum);
    }
  }

  // Map option blocks to MCQ question numbers in order
  const mcqNums = Array.from(mcqQuestions).sort((a, b) => a - b);
  const optBlockMap = new Map<number, typeof optionBlocks[0]>();
  for (let i = 0; i < Math.min(mcqNums.length, optionBlocks.length); i++) {
    optBlockMap.set(mcqNums[i], optionBlocks[i]);
  }

  // Build a map of question number → line range for prompt extraction
  // Use option block positions and question number markers to segment the text
  // Collect all "boundaries": each option block start and end
  interface Boundary {
    lineIdx: number;
    type: "optStart" | "optEnd";
    qNum: number;
  }
  const boundaries: Boundary[] = [];
  for (const [qNum, block] of optBlockMap) {
    boundaries.push({ lineIdx: block.aLineIdx, type: "optStart", qNum });
    boundaries.push({ lineIdx: block.dEndLineIdx, type: "optEnd", qNum });
  }
  boundaries.sort((a, b) => a.lineIdx - b.lineIdx);

  // For each question (1 to expectedCount), extract prompt text
  for (let qNum = 1; qNum <= expectedCount; qNum++) {
    const isMCQ = mcqQuestions.has(qNum);
    const block = optBlockMap.get(qNum);

    let promptText = "";
    let options: AnswerOption[] = [];
    let isFreeResponse = !isMCQ;

    if (isMCQ && block) {
      // MCQ: prompt is text between previous question's end and this option block's start
      options = block.options;

      // Find previous boundary end
      let promptStart = 0;
      // Previous question: find the nearest optEnd before this block
      if (qNum > 1) {
        // Find the end of the previous question's content
        for (let pq = qNum - 1; pq >= 1; pq--) {
          const prevBlock = optBlockMap.get(pq);
          if (prevBlock) {
            promptStart = prevBlock.dEndLineIdx + 1;
            break;
          }
        }
        // If no previous MCQ found, look for free-response questions before this one
        // and estimate from there
      }

      const promptLines: string[] = [];
      for (let li = promptStart; li < block.aLineIdx; li++) {
        const lt = lines[li].trim();
        if (isCBNoiseLine(lt)) continue;
        if (/^\d+$/.test(lt) && parseInt(lt) <= 50) continue;
        promptLines.push(lt);
      }
      promptText = promptLines.join("\n").trim();

      // For questions with interleaved free-response before them,
      // the prompt might include FR question text. Try to trim by finding
      // the last question-number marker before the options.
      // Look for the question number "N" or "-N ---" pattern in the prompt area
      const qNumPattern = new RegExp(`(?:^|\\n)\\s*-?\\s*${qNum}\\s*(?:[-\\s~]*$|\\n)`, "m");
      const qNumMatch = promptText.match(qNumPattern);
      if (qNumMatch && qNumMatch.index !== undefined) {
        promptText = promptText.slice(qNumMatch.index + qNumMatch[0].length).trim();
      }
    } else {
      // Free-response question: find text between surrounding questions
      isFreeResponse = true;

      // Find start: end of previous question
      let searchStart = 0;
      for (let pq = qNum - 1; pq >= 1; pq--) {
        const prevBlock = optBlockMap.get(pq);
        if (prevBlock) {
          searchStart = prevBlock.dEndLineIdx + 1;
          break;
        }
      }

      // Find end: start of next MCQ question's option block
      let searchEnd = lines.length;
      for (let nq = qNum + 1; nq <= expectedCount; nq++) {
        const nextBlock = optBlockMap.get(nq);
        if (nextBlock) {
          searchEnd = nextBlock.aLineIdx;
          break;
        }
      }

      // Within this range, try to find this question's text
      // Look for the question number marker
      const allText = lines.slice(searchStart, searchEnd);
      let foundStart = -1;
      for (let li = 0; li < allText.length; li++) {
        const lt = allText[li].trim();
        if (lt === String(qNum) || new RegExp(`^-?\\s*${qNum}\\s*[-\\s~]*$`).test(lt)) {
          foundStart = li + 1;
          break;
        }
      }

      if (foundStart >= 0) {
        // Find end: next question number or end of range
        let foundEnd = allText.length;
        for (let li = foundStart; li < allText.length; li++) {
          const lt = allText[li].trim();
          // Stop at next question number
          const nextQNum = qNum + 1;
          if (lt === String(nextQNum) || new RegExp(`^-?\\s*${nextQNum}\\s*[-\\s~]*$`).test(lt)) {
            foundEnd = li;
            break;
          }
        }

        const promptLines: string[] = [];
        for (let li = foundStart; li < foundEnd; li++) {
          const lt = allText[li].trim();
          if (isCBNoiseLine(lt)) continue;
          if (/^\d+$/.test(lt) && parseInt(lt) <= 50) continue;
          promptLines.push(lt);
        }
        promptText = promptLines.join("\n").trim();
      } else {
        promptText = `[Free response question ${qNum}]`;
      }
    }

    // Confidence assessment
    let confidence: "high" | "medium" | "low" = isFreeResponse ? "medium" : "high";
    let flagReason: string | undefined = isFreeResponse
      ? "Free-response question - text extraction may be incomplete"
      : undefined;

    if (promptText.length < 10) {
      confidence = "low";
      flagReason = "Question text too short - may contain images or figures";
    } else if (/figure|graph|table|image|diagram|(?:not\s+drawn\s+to\s+scale)/i.test(promptText) && promptText.length < 80) {
      confidence = "medium";
      flagReason = "Question may reference a figure not captured in text";
    }

    questions.push({
      id: `${moduleId}-q${qNum}`,
      number: qNum,
      prompt: promptText,
      options,
      correctAnswer: answerKey.get(qNum),
      isFreeResponse,
      confidenceFlag: confidence,
      flagReason,
    });
  }

  return questions;
}

// Main
async function main() {
  console.log("Scanning for PDFs in:", PDF_DIR);
  const files = fs.readdirSync(PDF_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${files.length} PDF files\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const catalog: ExamEntry[] = [];
  let successCount = 0;
  let emptyCount = 0;

  for (const file of files) {
    const filePath = path.join(PDF_DIR, file);
    process.stdout.write(`Processing: ${file} ... `);

    try {
      const rawText = extractText(filePath);
      const exam = parseExam(rawText, file);

      const outputPath = path.join(OUTPUT_DIR, `${exam.id}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(exam, null, 2));

      catalog.push({
        id: exam.id, fileName: exam.fileName, year: exam.year,
        month: exam.month, version: exam.version, type: exam.type,
        totalQuestions: exam.totalQuestions, hasAnswerKey: exam.hasAnswerKey,
      });

      if (exam.totalQuestions === 0) {
        console.log("(image-based, no text extracted)");
        emptyCount++;
      } else {
        const info = exam.sections.map(
          (s) => `${s.name}: ${s.modules.map((m) => `M${m.number}(${m.questions.length}q)`).join(", ")}`
        ).join(" | ");
        console.log(`${exam.totalQuestions}q | ${info} | Key: ${exam.hasAnswerKey ? "Yes" : "No"}`);
        successCount++;
      }
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
    }
  }

  // ============================================================
  // College Board Practice Test Bundles (paper-format PDFs)
  // ============================================================
  const CB_BUNDLES = [7, 8, 9, 10];
  const CB_RW_PER_MODULE = 33;
  const CB_MATH_PER_MODULE = 27;
  // Paper-format timing: 39 min RW, 43 min Math
  const CB_RW_MODULE_SECONDS = 39 * 60;
  const CB_MATH_MODULE_SECONDS = 43 * 60;

  console.log(`\n${"=".repeat(50)}`);
  console.log("Scanning College Board Practice Test bundles...\n");

  for (const testNum of CB_BUNDLES) {
    const bundleDir = path.resolve(PDF_DIR, `full-length-sat-paper-practice-test_-bundle-${testNum}`);
    const examPdf = path.join(bundleDir, `sat-practice-test-${testNum}-digital.pdf`);
    const answerPdf = path.join(bundleDir, `sat-practice-test-${testNum}-answers-digital.pdf`);
    const examId = `cb-practice-test-${testNum}`;
    const examFileName = `sat-practice-test-${testNum}-digital.pdf`;

    process.stdout.write(`Processing: CB Practice Test ${testNum} ... `);

    if (!fs.existsSync(examPdf) || !fs.existsSync(answerPdf)) {
      console.log("SKIPPED (files not found)");
      continue;
    }

    try {
      // --- Step 1: Parse answer PDF to extract correct answers ---
      const answerRaw = extractText(answerPdf);
      const answerLines = answerRaw.split("\n");

      // Track which section we're in via section headers
      type CBSection = "rw-1" | "rw-2" | "math-1" | "math-2";
      let currentSection: CBSection | null = null;
      let currentQuestionNum = 0;

      // Ordered list of answers per section
      const cbAnswers: Map<CBSection, Map<number, string>> = new Map();
      cbAnswers.set("rw-1", new Map());
      cbAnswers.set("rw-2", new Map());
      cbAnswers.set("math-1", new Map());
      cbAnswers.set("math-2", new Map());

      for (const line of answerLines) {
        const trimmed = line.trim();

        // Detect section headers like "SAT ANSWER EXPLANATIONS n READING AND WRITING: MODULE 1"
        if (/ANSWER EXPLANATIONS.*READING AND WRITING.*MODULE\s*1/i.test(trimmed)) {
          currentSection = "rw-1"; continue;
        }
        if (/ANSWER EXPLANATIONS.*READING AND WRITING.*MODULE\s*2/i.test(trimmed)) {
          currentSection = "rw-2"; continue;
        }
        if (/ANSWER EXPLANATIONS.*MATH.*MODULE\s*1/i.test(trimmed)) {
          currentSection = "math-1"; continue;
        }
        if (/ANSWER EXPLANATIONS.*MATH.*MODULE\s*2/i.test(trimmed)) {
          currentSection = "math-2"; continue;
        }

        // Detect question number: "QUESTION N"
        const qMatch = trimmed.match(/^QUESTION\s+(\d+)$/i);
        if (qMatch) {
          currentQuestionNum = parseInt(qMatch[1]);
          continue;
        }

        if (!currentSection || currentQuestionNum === 0) continue;
        const sectionMap = cbAnswers.get(currentSection)!;

        // "Choice X is the best answer" (RW) or "Choice X is correct" (Math)
        const choiceMatch = trimmed.match(/^Choice\s+([A-D])\s+is\s+(?:the best answer|correct)/i);
        if (choiceMatch && !sectionMap.has(currentQuestionNum)) {
          sectionMap.set(currentQuestionNum, choiceMatch[1].toUpperCase());
          continue;
        }

        // "The correct answer is Y" (free-response)
        const freeMatch = trimmed.match(/^The correct answer is\s+(?:either\s+)?(.+)/i);
        if (freeMatch && !sectionMap.has(currentQuestionNum)) {
          let val = freeMatch[1];
          // Extract first value: could be "9.", "either 14, -5, or -4.", "2,850.", "4.41.", "- 13"
          // Remove trailing period and explanation (but preserve decimal points like "4.41")
          val = val.replace(/\.\s+.*$/, "").replace(/\.$/, "");
          // Remove commas within numbers FIRST (e.g., "2,850" → "2850") before splitting
          val = val.replace(/(\d),(\d)/g, "$1$2");
          // Handle "either X, Y, or Z" — take first value
          if (/^either\s/i.test(val)) {
            val = val.replace(/^either\s+/i, "");
          }
          // Take just the first value (comma-separated or "or"-separated)
          val = val.split(/,\s*|\s+or\s+/)[0].trim();
          // Handle "- 13" → "-13" (space after minus sign in PDF)
          val = val.replace(/^-\s+/, "-");
          sectionMap.set(currentQuestionNum, val);
          continue;
        }
      }

      // --- Step 2: Parse exam PDF to extract questions ---
      const examRaw = extractText(examPdf);
      const examText = cleanCBText(examRaw);

      // Split into 4 modules using STOP markers and module headers
      const cbModuleTexts = splitCBModules(examText);

      if (cbModuleTexts.length !== 4) {
        console.log(`WARNING: Expected 4 modules, found ${cbModuleTexts.length}`);
      }

      // Module config: [sectionType, moduleNumber, expectedQuestions]
      const moduleConfig: [string, number, number][] = [
        ["rw", 1, CB_RW_PER_MODULE],
        ["rw", 2, CB_RW_PER_MODULE],
        ["math", 1, CB_MATH_PER_MODULE],
        ["math", 2, CB_MATH_PER_MODULE],
      ];

      const rwModules: Module[] = [];
      const mathModules: Module[] = [];

      for (let mi = 0; mi < Math.min(cbModuleTexts.length, 4); mi++) {
        const [sType, modNum, expectedQ] = moduleConfig[mi];
        const prefix = sType === "rw" ? "s1" : "s2";
        const moduleId = `${prefix}-m${modNum}`;
        const timeLimit = sType === "rw" ? CB_RW_MODULE_SECONDS : CB_MATH_MODULE_SECONDS;
        const akKey = `${sType === "rw" ? "rw" : "math"}-${modNum}` as CBSection;
        const answerKey = cbAnswers.get(akKey)!;

        const questions = parseCBModuleQuestions(
          cbModuleTexts[mi], moduleId, expectedQ, answerKey, sType
        );

        const mod: Module = {
          id: moduleId,
          number: modNum,
          label: `Module ${modNum}`,
          timeLimitSeconds: timeLimit,
          questions,
        };

        if (sType === "rw") rwModules.push(mod);
        else mathModules.push(mod);
      }

      const sections: Section[] = [];
      if (rwModules.length > 0) {
        sections.push({ id: "s1", number: 1, name: "Reading and Writing", modules: rwModules });
      }
      if (mathModules.length > 0) {
        sections.push({ id: "s2", number: 2, name: "Math", modules: mathModules });
      }

      const totalQuestions = sections.reduce(
        (sum, s) => sum + s.modules.reduce((ms, m) => ms + m.questions.length, 0), 0
      );

      const exam: Exam = {
        id: examId,
        fileName: examFileName,
        year: 2024,
        month: "CB",
        version: `Practice Test ${testNum}`,
        type: "US",
        sections,
        totalQuestions,
        hasAnswerKey: true,
        parsedAt: new Date().toISOString(),
      };

      const outputPath = path.join(OUTPUT_DIR, `${examId}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(exam, null, 2));

      catalog.push({
        id: exam.id, fileName: exam.fileName, year: exam.year,
        month: exam.month, version: exam.version, type: exam.type,
        totalQuestions: exam.totalQuestions, hasAnswerKey: exam.hasAnswerKey,
      });

      const info = exam.sections.map(
        (s) => `${s.name}: ${s.modules.map((m) => `M${m.number}(${m.questions.length}q)`).join(", ")}`
      ).join(" | ");
      console.log(`${exam.totalQuestions}q | ${info} | Key: Yes`);
      successCount++;
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
    }
  }

  const monthOrder: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, March: 3, Apr: 4, April: 4,
    May: 5, Jun: 6, June: 6, Jul: 7, July: 7, Aug: 8,
    Sept: 9, Sep: 9, Oct: 10, Nov: 11, Dec: 12, CB: 0,
  };
  catalog.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (monthOrder[b.month] || 0) - (monthOrder[a.month] || 0);
  });

  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Text-parsed: ${successCount} | Image-based: ${emptyCount} | Total: ${files.length + CB_BUNDLES.length}`);
  console.log(`Catalog: ${CATALOG_FILE}`);
}

main().catch(console.error);
