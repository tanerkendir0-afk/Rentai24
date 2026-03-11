import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve("/tmp/rentai-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const allowedDocTypes = [
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/markdown",
];

const allowedTrainingTypes = ["application/json", "application/jsonl", "application/x-ndjson"];

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      allowedDocTypes.includes(file.mimetype) ||
      [".txt", ".pdf", ".docx", ".csv", ".md"].includes(ext)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Allowed: TXT, PDF, DOCX, CSV, MD"));
    }
  },
});

export const uploadTrainingFile = multer({
  storage: documentStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      allowedTrainingTypes.includes(file.mimetype) ||
      [".jsonl", ".json"].includes(ext)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JSONL files are allowed for training data"));
    }
  },
});
