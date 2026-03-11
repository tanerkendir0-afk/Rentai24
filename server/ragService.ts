import OpenAI from "openai";
import { db, pool } from "./db";
import { documentChunks, agentDocuments, type AgentDocument } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { parseDocument, fetchUrlContent, chunkText } from "./documentParser";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function processAndStoreDocument(
  filePath: string,
  originalName: string,
  agentType: string,
  contentType: string,
  fileSize: number
): Promise<AgentDocument> {
  const text = await parseDocument(filePath, originalName);
  const chunks = chunkText(text);

  const [doc] = await db
    .insert(agentDocuments)
    .values({
      agentType,
      filename: originalName,
      contentType,
      chunkCount: chunks.length,
      fileSize,
    })
    .returning();

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    await db.insert(documentChunks).values({
      documentId: doc.id,
      agentType,
      content: chunks[i],
      chunkIndex: i,
      embedding,
    });
  }

  try {
    fs.unlinkSync(filePath);
  } catch {}

  return doc;
}

export async function processAndStoreUrl(
  url: string,
  agentType: string
): Promise<AgentDocument> {
  const text = await fetchUrlContent(url);
  const chunks = chunkText(text);

  const [doc] = await db
    .insert(agentDocuments)
    .values({
      agentType,
      filename: url,
      contentType: "url",
      chunkCount: chunks.length,
      fileSize: text.length,
    })
    .returning();

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    await db.insert(documentChunks).values({
      documentId: doc.id,
      agentType,
      content: chunks[i],
      chunkIndex: i,
      embedding,
    });
  }

  return doc;
}

export async function retrieveRelevantChunks(
  agentType: string,
  query: string,
  topK: number = 5
): Promise<string[]> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const result = await pool.query(
    `SELECT content, 1 - (embedding <=> $1::vector) as similarity
     FROM document_chunks
     WHERE agent_type = $2
     AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [embeddingStr, agentType, topK]
  );

  return result.rows
    .filter((row: any) => row.similarity > 0.3)
    .map((row: any) => row.content);
}

export async function getDocumentsByAgent(
  agentType: string
): Promise<AgentDocument[]> {
  return db
    .select()
    .from(agentDocuments)
    .where(eq(agentDocuments.agentType, agentType));
}

export async function deleteDocument(docId: number): Promise<void> {
  await db.delete(agentDocuments).where(eq(agentDocuments.id, docId));
}

export async function getDocumentCount(agentType: string): Promise<number> {
  const docs = await db
    .select()
    .from(agentDocuments)
    .where(eq(agentDocuments.agentType, agentType));
  return docs.length;
}
