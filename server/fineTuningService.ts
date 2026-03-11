import OpenAI from "openai";
import fs from "fs";
import { db } from "./db";
import { fineTuningJobs, type FineTuningJob } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function createFineTuningJob(
  agentType: string,
  trainingFilePath: string,
  originalFilename: string
): Promise<FineTuningJob> {
  const fileStream = fs.createReadStream(trainingFilePath);
  const uploadedFile = await openai.files.create({
    file: fileStream,
    purpose: "fine-tune",
  });

  const job = await openai.fineTuning.jobs.create({
    training_file: uploadedFile.id,
    model: "gpt-4o-mini-2024-07-18",
    suffix: `rentai-${agentType}`,
  });

  const [record] = await db
    .insert(fineTuningJobs)
    .values({
      agentType,
      openaiJobId: job.id,
      openaiFileId: uploadedFile.id,
      status: job.status,
      trainingFile: originalFilename,
    })
    .returning();

  try {
    fs.unlinkSync(trainingFilePath);
  } catch {}

  return record;
}

export async function syncJobStatus(jobId: number): Promise<FineTuningJob> {
  const [record] = await db
    .select()
    .from(fineTuningJobs)
    .where(eq(fineTuningJobs.id, jobId));

  if (!record?.openaiJobId) {
    throw new Error("Job not found");
  }

  const job = await openai.fineTuning.jobs.retrieve(record.openaiJobId);

  const updates: Partial<FineTuningJob> = {
    status: job.status,
    updatedAt: new Date(),
  };

  if (job.fine_tuned_model) {
    updates.fineTunedModel = job.fine_tuned_model;
  }

  if (job.error?.message) {
    updates.error = job.error.message;
  }

  const [updated] = await db
    .update(fineTuningJobs)
    .set(updates)
    .where(eq(fineTuningJobs.id, jobId))
    .returning();

  return updated;
}

export async function getJobsByAgent(
  agentType: string
): Promise<FineTuningJob[]> {
  return db
    .select()
    .from(fineTuningJobs)
    .where(eq(fineTuningJobs.agentType, agentType))
    .orderBy(desc(fineTuningJobs.createdAt));
}

export async function toggleActiveModel(
  jobId: number,
  agentType: string
): Promise<FineTuningJob> {
  await db
    .update(fineTuningJobs)
    .set({ isActive: false })
    .where(eq(fineTuningJobs.agentType, agentType));

  const [updated] = await db
    .update(fineTuningJobs)
    .set({ isActive: true })
    .where(
      and(
        eq(fineTuningJobs.id, jobId),
        eq(fineTuningJobs.status, "succeeded")
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Job not found or not completed successfully");
  }

  return updated;
}

export async function deactivateModel(agentType: string): Promise<void> {
  await db
    .update(fineTuningJobs)
    .set({ isActive: false })
    .where(eq(fineTuningJobs.agentType, agentType));
}

export async function getActiveModel(
  agentType: string
): Promise<string | null> {
  const [active] = await db
    .select()
    .from(fineTuningJobs)
    .where(
      and(
        eq(fineTuningJobs.agentType, agentType),
        eq(fineTuningJobs.isActive, true),
        eq(fineTuningJobs.status, "succeeded")
      )
    );

  return active?.fineTunedModel || null;
}
