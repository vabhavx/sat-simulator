import * as fs from "fs";
import * as path from "path";
import pdfParse from "pdf-parse";

const PDF_PATH = path.resolve(__dirname, "../../SQB english with answers @DSATuz.pdf");
const OUTPUT_DIR = path.resolve(__dirname, "../public/data/question-bank");
const OUTPUT_FILE = path.resolve(OUTPUT_DIR, "rw-questions.json");

interface QBOption {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

interface QBQuestion {
  id: string;
  domain: string;
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  passage: string;
  question: string;
  options: QBOption[];
  correctAnswer: string;
  rationale: string;
}

interface QuestionBank {
  test: string;
  totalQuestions: number;
  domains: {
    name: string;
    skills: { name: string; count: number }[];
    count: number;
  }[];
  questions: QBQuestion[];
  parsedAt: string;
}

async function parsePDF() {
  console.log("Reading PDF...");
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const data = await pdfParse(pdfBuffer);
  const text = data.text;

  console.log(`PDF text length: ${text.length} chars, ${data.numpages} pages`);

  // The structure is:
  // [previous question rationale]
  // Question Dif\0culty: Easy|Medium|Hard
  // [optional metadata table: Assessment\nSAT\nTest\nReading and Writing\nDomain\n...\nSkill\n...\nDifficulty\n]
  // Question ID xxxxxxxx
  // ID: xxxxxxxx
  // [question content]
  // [options A-D]
  // ID: xxxxxxxx Answer
  // Correct Answer: X
  // Rationale
  // [rationale text]
  // Question Dif\0culty: Easy|Medium|Hard
  // ...next question metadata...

  // Split by "Question ID" to get blocks, but we need the metadata that appears BEFORE each block
  const questionIdPattern = /Question ID\s+([a-f0-9]{6,})/g;
  const questionPositions: { id: string; start: number }[] = [];
  let match;
  while ((match = questionIdPattern.exec(text)) !== null) {
    questionPositions.push({ id: match[1], start: match.index });
  }

  console.log(`Found ${questionPositions.length} question positions`);

  const questions: QBQuestion[] = [];

  for (let i = 0; i < questionPositions.length; i++) {
    const pos = questionPositions[i];
    const nextStart = i + 1 < questionPositions.length ? questionPositions[i + 1].start : text.length;

    // The question block includes everything from this Question ID to the next
    const block = text.substring(pos.start, nextStart);

    // The metadata table appears BEFORE the Question ID, in the gap between previous question's end and this one
    const prevEnd = i > 0 ? questionPositions[i - 1].start : 0;
    const metaBlock = text.substring(prevEnd, pos.start);

    try {
      const q = parseQuestion(pos.id, block, metaBlock);
      if (q) questions.push(q);
    } catch (e) {
      // Skip malformed questions
    }
  }

  console.log(`Successfully parsed ${questions.length} questions`);

  // Build domain/skill hierarchy
  const domainMap = new Map<string, Map<string, number>>();
  for (const q of questions) {
    if (!domainMap.has(q.domain)) domainMap.set(q.domain, new Map());
    const skillMap = domainMap.get(q.domain)!;
    skillMap.set(q.skill, (skillMap.get(q.skill) || 0) + 1);
  }

  // Order domains as per SAT structure
  const domainOrder = [
    "Information and Ideas",
    "Craft and Structure",
    "Expression of Ideas",
    "Standard English Conventions",
  ];

  const domains = domainOrder
    .filter((name) => domainMap.has(name))
    .map((name) => {
      const skillMap = domainMap.get(name)!;
      return {
        name,
        skills: Array.from(skillMap.entries())
          .map(([skill, count]) => ({ name: skill, count }))
          .sort((a, b) => b.count - a.count),
        count: Array.from(skillMap.values()).reduce((a, b) => a + b, 0),
      };
    });

  // Add any domains not in the ordered list
  for (const [name, skillMap] of domainMap) {
    if (!domainOrder.includes(name)) {
      domains.push({
        name,
        skills: Array.from(skillMap.entries())
          .map(([skill, count]) => ({ name: skill, count }))
          .sort((a, b) => b.count - a.count),
        count: Array.from(skillMap.values()).reduce((a, b) => a + b, 0),
      });
    }
  }

  const bank: QuestionBank = {
    test: "Reading and Writing",
    totalQuestions: questions.length,
    domains,
    questions,
    parsedAt: new Date().toISOString(),
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bank, null, 2));
  console.log(`\nWritten to ${OUTPUT_FILE}`);

  // Stats
  console.log("\n=== Question Bank Stats ===");
  console.log(`Total: ${questions.length} questions`);
  for (const d of domains) {
    console.log(`\n${d.name} (${d.count} questions):`);
    for (const s of d.skills) {
      console.log(`  - ${s.name}: ${s.count}`);
    }
  }

  const diffCounts = { Easy: 0, Medium: 0, Hard: 0 };
  for (const q of questions) diffCounts[q.difficulty]++;
  console.log(
    `\nDifficulty: Easy=${diffCounts.Easy}, Medium=${diffCounts.Medium}, Hard=${diffCounts.Hard}`
  );
}

function extractMetadata(metaBlock: string): { domain: string; skill: string } {
  let domain = "";
  let skill = "";

  // Look for the metadata table pattern:
  // Assessment\nSAT\nTest\nReading and Writing\nDomain\n<domain text>\nSkill\n<skill text>\nDifficulty
  const metaPattern =
    /Domain\n([\s\S]*?)\nSkill\n([\s\S]*?)\nDif/;
  const metaMatch = metaBlock.match(metaPattern);
  if (metaMatch) {
    domain = metaMatch[1].replace(/\n/g, " ").trim();
    skill = metaMatch[2].replace(/\n/g, " ").trim();
  }

  // Normalize domain names
  const domainMap: Record<string, string> = {
    "Information and Ideas": "Information and Ideas",
    "Information andIdeas": "Information and Ideas",
    "Craft and Structure": "Craft and Structure",
    "Craft andStructure": "Craft and Structure",
    "Expression of Ideas": "Expression of Ideas",
    "Expression ofIdeas": "Expression of Ideas",
    "Standard English Conventions": "Standard English Conventions",
    "Standard EnglishConventions": "Standard English Conventions",
  };

  for (const [key, value] of Object.entries(domainMap)) {
    if (domain.includes(key) || domain.replace(/\s+/g, "").includes(key.replace(/\s+/g, ""))) {
      domain = value;
      break;
    }
  }

  // Normalize skill names
  const skillNormalize: Record<string, string> = {
    "Central Ideas and Details": "Central Ideas and Details",
    "Central Ideas andDetails": "Central Ideas and Details",
    "Command of Evidence": "Command of Evidence",
    "Command ofEvidence": "Command of Evidence",
    "Inferences": "Inferences",
    "Cross-Text Connections": "Cross-Text Connections",
    "Cross-text Connections": "Cross-Text Connections",
    "Text Structure and Purpose": "Text Structure and Purpose",
    "Text Structure andPurpose": "Text Structure and Purpose",
    "Words in Context": "Words in Context",
    "Rhetorical Synthesis": "Rhetorical Synthesis",
    "Transitions": "Transitions",
    "Boundaries": "Boundaries",
    "Form, Structure, and Sense": "Form, Structure, and Sense",
    "Form, Structure,and Sense": "Form, Structure, and Sense",
  };

  for (const [key, value] of Object.entries(skillNormalize)) {
    if (skill.includes(key) || skill.replace(/\s+/g, "").includes(key.replace(/\s+/g, ""))) {
      skill = value;
      break;
    }
  }

  if (!domain) domain = "Information and Ideas";
  if (!skill) skill = "General";

  return { domain, skill };
}

function parseQuestion(
  id: string,
  block: string,
  metaBlock: string
): QBQuestion | null {
  // Extract metadata from the block between previous question and this one
  const { domain, skill } = extractMetadata(metaBlock);

  // Extract difficulty - appears after rationale with null char for fi ligature
  // Pattern: "Question Dif\0culty: Easy|Medium|Hard"
  let difficulty: "Easy" | "Medium" | "Hard" = "Medium";
  const diffPattern = /Question Dif[\x00\s]?culty:\s*(Easy|Medium|Hard)/i;
  const diffMatch = block.match(diffPattern);
  if (diffMatch) {
    difficulty = diffMatch[1] as "Easy" | "Medium" | "Hard";
  }

  // Extract correct answer
  const ansMatch = block.match(/Correct Answer:\s*([A-D])/i);
  if (!ansMatch) return null;
  const correctAnswer = ansMatch[1];

  // Get question content (between "ID: xxx\n" and "ID: xxx Answer")
  const contentStartPattern = new RegExp(`ID:\\s*${id}\\n`);
  const contentStartMatch = block.match(contentStartPattern);
  if (!contentStartMatch) return null;
  const contentStart = (contentStartMatch.index || 0) + contentStartMatch[0].length;

  const answerSectionPattern = new RegExp(`ID:\\s*${id}\\s*Answer`);
  const answerSectionMatch = block.match(answerSectionPattern);
  const contentEnd = answerSectionMatch ? answerSectionMatch.index! : block.length;

  const mainContent = block.substring(contentStart, contentEnd);

  // Extract options A-D
  const options: QBOption[] = [];
  for (const letter of ["A", "B", "C", "D"] as const) {
    const nextLetter = letter === "D" ? null : String.fromCharCode(letter.charCodeAt(0) + 1);
    let optPattern: RegExp;
    if (nextLetter) {
      optPattern = new RegExp(
        `(?:^|\\n)\\s*${letter}\\.\\s+([\\s\\S]*?)(?=\\n\\s*${nextLetter}\\.\\s)`,
        "m"
      );
    } else {
      // D is last option - goes until end of content or ID: Answer
      optPattern = new RegExp(`(?:^|\\n)\\s*${letter}\\.\\s+([\\s\\S]*?)$`, "m");
    }
    const optMatch = mainContent.match(optPattern);
    if (optMatch) {
      options.push({
        letter,
        text: optMatch[1].trim().replace(/\s+/g, " "),
      });
    }
  }

  if (options.length < 3) return null;

  // Split passage from question stem
  const firstOptionIdx = mainContent.search(/\n\s*A\.\s/);
  const beforeOptions = firstOptionIdx > 0 ? mainContent.substring(0, firstOptionIdx) : mainContent;

  let passageText = "";
  let questionStem = "";

  const questionMarkIdx = beforeOptions.lastIndexOf("?");
  if (questionMarkIdx > 0) {
    // Find start of the question sentence (look for newline before the question)
    let qLineStart = beforeOptions.lastIndexOf("\n", questionMarkIdx);
    // Sometimes the question spans multiple lines - look for common patterns
    const questionStarters = [
      "Which choice",
      "Which quotation",
      "Which finding",
      "Which statement",
      "What does the text",
      "Based on the text",
      "According to the text",
      "What can be",
      "What is the",
      "How does",
      "The text most strongly",
    ];
    for (const starter of questionStarters) {
      const starterIdx = beforeOptions.lastIndexOf(starter);
      if (starterIdx >= 0 && starterIdx < questionMarkIdx) {
        qLineStart = Math.max(0, beforeOptions.lastIndexOf("\n", starterIdx));
        break;
      }
    }

    passageText = beforeOptions.substring(0, qLineStart).trim().replace(/\s+/g, " ");
    questionStem = beforeOptions.substring(qLineStart).trim().replace(/\s+/g, " ");
  } else {
    // Check for underline-completion questions (ending with ______)
    const underlineIdx = beforeOptions.lastIndexOf("______");
    if (underlineIdx > 0) {
      let qLineStart = beforeOptions.lastIndexOf("\n", Math.max(0, underlineIdx - 200));
      passageText = beforeOptions.substring(0, qLineStart).trim().replace(/\s+/g, " ");
      questionStem = beforeOptions.substring(qLineStart).trim().replace(/\s+/g, " ");
    } else {
      passageText = beforeOptions.trim().replace(/\s+/g, " ");
    }
  }

  // Extract rationale
  let rationale = "";
  const rationaleMatch = block.match(
    /Rationale\s*\n([\s\S]*?)(?=Question Dif[\x00\s]?culty:|$)/
  );
  if (rationaleMatch) {
    rationale = rationaleMatch[1].trim().replace(/\s+/g, " ");
  }

  return {
    id,
    domain,
    skill,
    difficulty,
    passage: passageText,
    question: questionStem,
    options,
    correctAnswer,
    rationale,
  };
}

parsePDF().catch(console.error);
