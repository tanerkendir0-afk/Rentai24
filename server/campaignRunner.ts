import { storage } from "./storage";
import { sendEmail } from "./emailService";
import { getTemplate, fillTemplate } from "./emailTemplates";

const CAMPAIGN_CHECK_INTERVAL = 60 * 60 * 1000;

export function startCampaignRunner() {
  setTimeout(async () => {
    try {
      await processPendingCampaigns();
    } catch (error) {
      console.error("[CampaignRunner] Initial campaign check error:", error);
    }
  }, 5000);

  setInterval(async () => {
    try {
      await processPendingCampaigns();
    } catch (error) {
      console.error("[CampaignRunner] Error processing campaigns:", error);
    }
  }, CAMPAIGN_CHECK_INTERVAL);

  console.log("[CampaignRunner] Started — checking campaigns every hour");
}

async function processPendingCampaigns() {
  const allUsers = await storage.getAllUsers();
  for (const user of allUsers) {
    const campaigns = await storage.getActiveCampaigns(user.id);
    for (const campaign of campaigns) {
      try {
        await processOneCampaign(campaign, user.id);
      } catch (err) {
        console.error(`[CampaignRunner] Error processing campaign #${campaign.id}:`, err);
      }
    }
  }
}

async function processOneCampaign(campaign: { id: number; userId: number; leadId: number; steps: unknown; currentStep: number; status: string; createdAt: Date }, userId: number) {
  const steps = campaign.steps as Array<{ delayDays: number; templateId: string; stepName: string; sentAt?: string }>;
  const currentStepIndex = campaign.currentStep;

  if (currentStepIndex >= steps.length) {
    await storage.updateCampaignStep(campaign.id, userId, currentStepIndex, "completed");
    return;
  }

  const step = steps[currentStepIndex];
  const campaignStart = new Date(campaign.createdAt).getTime();
  const stepDueAt = campaignStart + step.delayDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now < stepDueAt) return;

  const lead = await storage.getLeadById(campaign.leadId, userId);
  if (!lead || !lead.email) {
    await storage.updateCampaignStep(campaign.id, userId, currentStepIndex, "failed");
    return;
  }

  const template = getTemplate(step.templateId);
  if (!template) {
    await storage.updateCampaignStep(campaign.id, userId, currentStepIndex, "failed");
    return;
  }

  const filled = fillTemplate(template, { name: lead.name, company: lead.company || undefined });

  const result = await sendEmail({
    userId,
    to: lead.email,
    subject: filled.subject,
    body: filled.body,
    agentType: "sales-sdr",
  });

  if (result.success) {
    steps[currentStepIndex].sentAt = new Date().toISOString();
    const nextStep = currentStepIndex + 1;
    const newStatus = nextStep >= steps.length ? "completed" : "active";
    await storage.updateCampaignStep(campaign.id, userId, nextStep, newStatus, steps);

    await storage.createAgentAction({
      userId,
      agentType: "sales-sdr",
      actionType: "drip_email_sent",
      description: `Drip campaign step ${currentStepIndex + 1}/${steps.length} sent to ${lead.name} (${lead.email}): "${step.stepName}"`,
      metadata: { campaignId: campaign.id, leadId: lead.id, step: step.stepName, templateId: step.templateId },
    });
  } else {
    await storage.updateCampaignStep(campaign.id, userId, currentStepIndex, "failed");

    await storage.createAgentAction({
      userId,
      agentType: "sales-sdr",
      actionType: "drip_email_failed",
      description: `Drip campaign step ${currentStepIndex + 1}/${steps.length} failed for ${lead.name} (${lead.email}): ${result.message}`,
      metadata: { campaignId: campaign.id, leadId: lead.id, step: step.stepName, error: result.message },
    });

    console.error(`[CampaignRunner] Campaign #${campaign.id} step ${currentStepIndex + 1} failed: ${result.message}`);
  }
}
