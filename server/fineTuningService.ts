import OpenAI from "openai";
import fs from "fs";
import { db } from "./db";
import { fineTuningJobs, type FineTuningJob } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

function getFineTuningClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Fine-tuning requires a direct OpenAI API key. Set the OPENAI_API_KEY environment variable (not the Replit AI integration key)."
    );
  }
  return new OpenAI({ apiKey });
}

export async function createFineTuningJob(
  agentType: string,
  trainingFilePath: string,
  originalFilename: string
): Promise<FineTuningJob> {
  try {
    const client = getFineTuningClient();
    const fileStream = fs.createReadStream(trainingFilePath);
    const uploadedFile = await client.files.create({
      file: fileStream,
      purpose: "fine-tune",
    });

    const job = await client.fineTuning.jobs.create({
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

    return record;
  } finally {
    try { fs.unlinkSync(trainingFilePath); } catch {}
  }
}

export async function syncJobStatus(jobId: number): Promise<FineTuningJob> {
  const [record] = await db
    .select()
    .from(fineTuningJobs)
    .where(eq(fineTuningJobs.id, jobId));

  if (!record?.openaiJobId) {
    throw new Error("Job not found");
  }

  const client = getFineTuningClient();
  const job = await client.fineTuning.jobs.retrieve(record.openaiJobId);

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
        eq(fineTuningJobs.agentType, agentType),
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
