const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c#", "c++", "go", "rust", "php", "ruby", "swift", "kotlin",
  "react", "vue", "angular", "next.js", "nuxt", "svelte", "node.js", "express", "fastapi", "django", "spring",
  "html", "css", "tailwind", "bootstrap", "sass", "graphql", "rest", "api", "sql", "nosql", "postgresql",
  "mysql", "mongodb", "redis", "elasticsearch", "docker", "kubernetes", "aws", "azure", "gcp", "terraform",
  "git", "github", "gitlab", "ci/cd", "jenkins", "jira", "agile", "scrum", "kanban", "linux", "bash",
  "machine learning", "deep learning", "nlp", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn",
  "excel", "powerpoint", "word", "figma", "adobe", "photoshop", "illustrator", "indesign", "sketch",
  "sap", "crm", "erp", "salesforce", "hubspot", "tableau", "power bi", "looker", "dbt",
  "project management", "product management", "data analysis", "business analysis", "ux/ui", "ux", "ui",
  "testing", "selenium", "cypress", "jest", "mocha", "qa", "devops", "mlops",
  "İngilizce", "İspanyolca", "Almanca", "Fransızca", "Türkçe", "english", "spanish", "german", "french",
  "muhasebe", "finans", "pazarlama", "satış", "liderlik", "iletişim", "takım çalışması",
  "accounting", "finance", "marketing", "sales", "leadership", "communication", "teamwork",
  "problem solving", "critical thinking", "data science", "analytics", "blockchain", "web3",
  "photovoltaic", "autocad", "matlab", "solidworks", "catia", "ansys",
];

export interface ParsedCV {
  name: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  skills: string[];
  rawText: string;
}

export function parseCVText(text: string): ParsedCV {
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : null;

  const phoneMatch = text.match(/(\+?[\d\s\-().]{7,20}(?:\d))/);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;

  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-]+/i);
  const linkedinUrl = linkedinMatch ? linkedinMatch[0] : null;

  const lowerText = text.toLowerCase();
  const foundSkills = SKILL_KEYWORDS.filter(skill => {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escapedSkill}\\b`, "i").test(lowerText);
  });
  const skills = [...new Set(foundSkills)];

  const name = extractName(text);

  return { name, email, phone, linkedinUrl, skills, rawText: text };
}

function extractName(text: string): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines.slice(0, 8)) {
    if (line.length < 60 && line.length > 3) {
      if (/^[A-ZÇĞİÖŞÜa-zçğışöşü\s]+$/.test(line) && !/[@\d]/.test(line)) {
        const wordCount = line.trim().split(/\s+/).length;
        if (wordCount >= 2 && wordCount <= 5) {
          return line.trim();
        }
      }
    }
  }
  return "Unknown Candidate";
}

export function calculateMatchScore(candidateSkills: string[], requiredSkills: string[]): number {
  if (!requiredSkills || requiredSkills.length === 0) return 50;
  if (!candidateSkills || candidateSkills.length === 0) return 0;

  const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
  const normalizedCandidate = candidateSkills.map(s => s.toLowerCase().trim());

  let matchCount = 0;
  for (const req of normalizedRequired) {
    if (normalizedCandidate.some(cs => cs.includes(req) || req.includes(cs))) {
      matchCount++;
    }
  }

  const score = Math.round((matchCount / normalizedRequired.length) * 100);
  return Math.min(100, score);
}

type PdfParseResult = { text: string };
type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;
type PdfParseModule = { default?: PdfParseFn } & PdfParseFn;

export async function parsePDFBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdfMod = (await import("pdf-parse")) as unknown as PdfParseModule;
    const pdfParse: PdfParseFn = pdfMod.default || pdfMod;
    const data = await pdfParse(buffer);
    return data.text;
  } catch {
    return "";
  }
}

export async function parseDOCXBuffer(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    return "";
  }
}
