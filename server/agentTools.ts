import type OpenAI from "openai";
import { storage } from "./storage";
import { sendEmail } from "./emailService";
import { scheduleFollowup } from "./followupScheduler";
import { createCalendarEvent } from "./calendarService";
import { getTemplate, fillTemplate, listTemplates, DRIP_SEQUENCES } from "./emailTemplates";

export const salesSdrTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send a real email to a prospect or lead. Use this when the user asks you to email someone, send outreach, or follow up via email.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body content (professional sales tone)" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_lead",
      description: "Add a new lead/prospect to the CRM pipeline. Use this when the user mentions a new potential customer or asks to track someone.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Lead's full name" },
          email: { type: "string", description: "Lead's email address" },
          company: { type: "string", description: "Lead's company name" },
          notes: { type: "string", description: "Notes about this lead (source, interest, etc.)" },
        },
        required: ["name", "email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead",
      description: "Update an existing lead's status or information. Use this when the user says to update a lead's status, add notes, or change their info.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "number", description: "The lead ID to update" },
          status: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"], description: "New pipeline status" },
          notes: { type: "string", description: "Updated notes" },
          name: { type: "string", description: "Updated name" },
          email: { type: "string", description: "Updated email" },
          company: { type: "string", description: "Updated company" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_leads",
      description: "List all leads in the CRM pipeline. Use this when the user asks about their pipeline, prospects, or lead list.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"], description: "Optional: filter by status" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_followup",
      description: "Schedule a follow-up email to be sent to a lead at a future time. The email will be automatically sent via Resend when the scheduled time arrives.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Follow-up email subject" },
          body: { type: "string", description: "Follow-up email body content" },
          delay_days: { type: "number", description: "Number of days from now to send the follow-up (1-30)" },
        },
        required: ["to", "subject", "body", "delay_days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_meeting",
      description: "Create a meeting/demo appointment. If Google Calendar is connected, a calendar event with invite is created automatically. Otherwise the meeting is logged and tracked.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Meeting title" },
          attendee_email: { type: "string", description: "Attendee's email address" },
          date: { type: "string", description: "Meeting date (YYYY-MM-DD format)" },
          time: { type: "string", description: "Meeting time (HH:MM format, 24h)" },
          duration_minutes: { type: "number", description: "Meeting duration in minutes (default 30)" },
          description: { type: "string", description: "Meeting description/agenda" },
        },
        required: ["title", "attendee_email", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_email",
      description: "Send personalized emails to multiple leads at once filtered by status. Use when the user asks to email all leads, send bulk outreach, or email a group of leads.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"], description: "Filter leads by status to email" },
          template_id: { type: "string", enum: ["cold_outreach", "follow_up", "value_proposition", "meeting_request", "proposal"], description: "Email template to use for all leads" },
        },
        required: ["status_filter", "template_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "use_template",
      description: "Send an email using a pre-built template to a specific lead. Templates: cold_outreach, follow_up, value_proposition, meeting_request, proposal. Each is automatically personalized with the lead's name and company.",
      parameters: {
        type: "object",
        properties: {
          template_id: { type: "string", enum: ["cold_outreach", "follow_up", "value_proposition", "meeting_request", "proposal"], description: "Template to use" },
          lead_id: { type: "number", description: "Lead ID to send the template to" },
        },
        required: ["template_id", "lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_drip_campaign",
      description: "Start an automated drip email campaign for a lead. A drip campaign sends a series of emails over several days automatically. Campaign types: standard (3 emails over 7 days), aggressive (5 emails over 7 days), gentle (3 emails over 14 days).",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "number", description: "Lead ID to start the campaign for" },
          campaign_type: { type: "string", enum: ["standard", "aggressive", "gentle"], description: "Type of drip campaign (default: standard)" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_campaigns",
      description: "List all email drip campaigns with their current status and progress. Use when user asks about active campaigns or campaign status.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["active", "completed", "paused", "failed"], description: "Optional: filter by campaign status" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_templates",
      description: "Show all available email templates. Use when the user asks about templates or wants to see what templates are available.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "score_leads",
      description: "Recalculate and update lead scores (Hot/Warm/Cold) for all leads based on their status and activity. Use when the user asks about lead quality, wants to prioritize leads, or asks 'which leads are hot'.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pipeline_report",
      description: "Generate a pipeline analytics report with stats: total leads, leads by status, conversion rate, recent activity. Use when the user asks 'how is my pipeline', 'show me stats', 'conversion rate', or 'pipeline summary'.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_proposal",
      description: "Generate a professional sales proposal for a specific lead including executive summary, problem statement, solution, pricing, and next steps. Use when the user asks to create or draft a proposal.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "number", description: "Lead ID to create the proposal for" },
          custom_notes: { type: "string", description: "Optional custom notes or requirements to include in the proposal" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_competitors",
      description: "Generate a competitive analysis for a prospect's industry. Provides strengths, weaknesses, opportunities, and positioning recommendations. Use when the user asks for competitor research or competitive landscape analysis.",
      parameters: {
        type: "object",
        properties: {
          industry: { type: "string", description: "The industry or market to analyze (e.g. 'SaaS', 'E-commerce', 'Healthcare tech')" },
          company_context: { type: "string", description: "Optional: the prospect's company name and what they do for more targeted analysis" },
        },
        required: ["industry"],
      },
    },
  },
];

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: number,
  agentType: string
): Promise<{ result: string; actionType?: string; actionDescription?: string }> {
  switch (toolName) {
    case "send_email": {
      const emailResult = await sendEmail({
        userId,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        agentType,
      });
      return {
        result: emailResult.message,
        actionType: emailResult.success ? "email_sent" : "email_failed",
        actionDescription: emailResult.success
          ? `📧 Email sent to ${args.to}: "${args.subject}"`
          : `❌ Email failed to ${args.to}: ${emailResult.message}`,
      };
    }

    case "add_lead": {
      const lead = await storage.createLead({
        userId,
        name: String(args.name),
        email: String(args.email),
        company: args.company ? String(args.company) : null,
        notes: args.notes ? String(args.notes) : null,
      });
      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "lead_added",
        description: `Added lead: ${args.name} (${args.email})${args.company ? ` at ${args.company}` : ""}`,
        metadata: { leadId: lead.id, name: args.name, email: args.email, company: args.company },
      });
      return {
        result: `Lead added successfully: ${args.name} (${args.email})${args.company ? ` at ${args.company}` : ""}. Lead ID: ${lead.id}`,
        actionType: "lead_added",
        actionDescription: `➕ Added lead: ${args.name}${args.company ? ` at ${args.company}` : ""}`,
      };
    }

    case "update_lead": {
      const updates: Record<string, string> = {};
      if (args.status) updates.status = String(args.status);
      if (args.notes) updates.notes = String(args.notes);
      if (args.name) updates.name = String(args.name);
      if (args.email) updates.email = String(args.email);
      if (args.company) updates.company = String(args.company);

      const leadId = Number(args.lead_id);
      const updated = await storage.updateLead(leadId, userId, updates);
      if (!updated) {
        return { result: `Lead with ID ${leadId} not found or you don't have access to it.` };
      }
      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "lead_updated",
        description: `Updated lead #${leadId}: ${updated.name}${args.status ? ` → ${args.status}` : ""}`,
        metadata: { leadId, updates },
      });
      return {
        result: `Lead #${leadId} (${updated.name}) updated successfully.${args.status ? ` Status: ${args.status}` : ""}`,
        actionType: "lead_updated",
        actionDescription: `✏️ Updated lead: ${updated.name}${args.status ? ` → ${args.status}` : ""}`,
      };
    }

    case "list_leads": {
      const allLeads = await storage.getLeadsByUser(userId);
      const statusFilter = args.status_filter ? String(args.status_filter) : null;
      const filtered = statusFilter
        ? allLeads.filter(l => l.status === statusFilter)
        : allLeads;

      if (filtered.length === 0) {
        return { result: statusFilter ? `No leads found with status "${statusFilter}".` : "No leads in your pipeline yet. Add some with the add_lead tool!" };
      }

      const leadList = filtered.map(l =>
        `- #${l.id} ${l.name} (${l.email})${l.company ? ` @ ${l.company}` : ""} | Status: ${l.status}${l.notes ? ` | Notes: ${l.notes}` : ""}`
      ).join("\n");

      return { result: `Found ${filtered.length} lead(s):\n${leadList}` };
    }

    case "schedule_followup": {
      const delayDays = Math.min(Math.max(Number(args.delay_days) || 1, 1), 30);
      const { followupId, sendAt } = scheduleFollowup({
        userId,
        agentType,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        delayDays,
      });

      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "followup_scheduled",
        description: `Follow-up email scheduled for ${args.to} on ${sendAt.toLocaleDateString()}: "${args.subject}"`,
        metadata: { followupId, to: args.to, subject: args.subject, body: args.body, sendDate: sendAt.toISOString(), delayDays },
      });

      return {
        result: `Follow-up email #${followupId} scheduled for ${sendAt.toLocaleDateString()} (${delayDays} days from now) to ${args.to} with subject "${args.subject}". The email will be automatically sent via Resend at that time.`,
        actionType: "followup_scheduled",
        actionDescription: `⏰ Follow-up scheduled for ${args.to} on ${sendAt.toLocaleDateString()}`,
      };
    }

    case "create_meeting": {
      const duration = Number(args.duration_minutes) || 30;

      const calendarResult = await createCalendarEvent({
        userId,
        agentType,
        title: String(args.title),
        attendeeEmail: String(args.attendee_email),
        date: String(args.date),
        time: String(args.time),
        durationMinutes: duration,
        description: args.description ? String(args.description) : undefined,
      });

      return {
        result: calendarResult.message,
        actionType: "meeting_created",
        actionDescription: `📅 Meeting: "${args.title}" on ${args.date} at ${args.time}`,
      };
    }

    case "bulk_email": {
      const statusFilter = String(args.status_filter);
      const templateId = String(args.template_id);
      const template = getTemplate(templateId);
      if (!template) {
        return { result: `Template "${templateId}" not found. Available: cold_outreach, follow_up, value_proposition, meeting_request, proposal` };
      }

      const allLeads = await storage.getLeadsByUser(userId);
      const filtered = allLeads.filter(l => l.status === statusFilter && l.email);
      if (filtered.length === 0) {
        return { result: `No leads found with status "${statusFilter}" that have email addresses.` };
      }

      let sent = 0;
      let failed = 0;
      for (const lead of filtered) {
        const filled = fillTemplate(template, { name: lead.name, company: lead.company || undefined });
        const result = await sendEmail({
          userId,
          to: lead.email,
          subject: filled.subject,
          body: filled.body,
          agentType,
        });
        if (result.success) sent++;
        else failed++;
      }

      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "bulk_email_sent",
        description: `Bulk "${template.name}" email sent to ${sent} ${statusFilter} leads (${failed} failed)`,
        metadata: { templateId, statusFilter, sent, failed, total: filtered.length },
      });

      return {
        result: `Bulk email campaign completed: ${sent}/${filtered.length} emails sent successfully using "${template.name}" template to all "${statusFilter}" leads.${failed > 0 ? ` ${failed} failed.` : ""}`,
        actionType: "bulk_email_sent",
        actionDescription: `📨 Bulk email: ${sent} "${template.name}" emails sent to ${statusFilter} leads`,
      };
    }

    case "use_template": {
      const templateId = String(args.template_id);
      const leadId = Number(args.lead_id);
      const template = getTemplate(templateId);
      if (!template) {
        return { result: `Template "${templateId}" not found. Available: cold_outreach, follow_up, value_proposition, meeting_request, proposal` };
      }

      const lead = await storage.getLeadById(leadId, userId);
      if (!lead) {
        return { result: `Lead #${leadId} not found or you don't have access to it.` };
      }
      if (!lead.email) {
        return { result: `Lead #${leadId} (${lead.name}) has no email address.` };
      }

      const filled = fillTemplate(template, { name: lead.name, company: lead.company || undefined });
      const emailResult = await sendEmail({
        userId,
        to: lead.email,
        subject: filled.subject,
        body: filled.body,
        agentType,
      });

      if (emailResult.success) {
        await storage.createAgentAction({
          userId,
          agentType,
          actionType: "template_email_sent",
          description: `"${template.name}" template email sent to ${lead.name} (${lead.email})`,
          metadata: { templateId, leadId, leadName: lead.name, subject: filled.subject },
        });
      }

      return {
        result: emailResult.success
          ? `"${template.name}" template email sent successfully to ${lead.name} (${lead.email}) with subject: "${filled.subject}"`
          : `Failed to send template email: ${emailResult.message}`,
        actionType: emailResult.success ? "template_email_sent" : "email_failed",
        actionDescription: emailResult.success
          ? `📋 Template "${template.name}" sent to ${lead.name}`
          : `❌ Template email failed to ${lead.name}`,
      };
    }

    case "start_drip_campaign": {
      const leadId = Number(args.lead_id);
      const campaignType = args.campaign_type ? String(args.campaign_type) : "standard";
      const sequence = DRIP_SEQUENCES[campaignType];
      if (!sequence) {
        return { result: `Campaign type "${campaignType}" not found. Available: standard, aggressive, gentle` };
      }

      const lead = await storage.getLeadById(leadId, userId);
      if (!lead) {
        return { result: `Lead #${leadId} not found or you don't have access to it.` };
      }
      if (!lead.email) {
        return { result: `Lead #${leadId} (${lead.name}) has no email address. Cannot start drip campaign.` };
      }

      const campaign = await storage.createEmailCampaign({
        userId,
        leadId,
        campaignType,
        steps: sequence.map(s => ({ ...s })),
        currentStep: 0,
        status: "active",
      });

      const firstStep = sequence[0];
      if (firstStep.delayDays === 0) {
        const template = getTemplate(firstStep.templateId);
        if (template) {
          const filled = fillTemplate(template, { name: lead.name, company: lead.company || undefined });
          await sendEmail({
            userId,
            to: lead.email,
            subject: filled.subject,
            body: filled.body,
            agentType,
          });
          await storage.updateCampaignStep(campaign.id, userId, 1, sequence.length <= 1 ? "completed" : "active");
        }
      }

      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "drip_campaign_started",
        description: `"${campaignType}" drip campaign started for ${lead.name} (${lead.email}) — ${sequence.length} steps over ${sequence[sequence.length - 1].delayDays} days`,
        metadata: { campaignId: campaign.id, leadId, campaignType, totalSteps: sequence.length },
      });

      const stepList = sequence.map((s, i) => `  ${i + 1}. Day ${s.delayDays}: ${s.stepName} (${s.templateId})`).join("\n");

      return {
        result: `Drip campaign #${campaign.id} started for ${lead.name} (${lead.email})!\n\nType: ${campaignType}\nSteps:\n${stepList}\n\n${firstStep.delayDays === 0 ? "First email sent immediately. " : ""}Remaining emails will be sent automatically on schedule.`,
        actionType: "drip_campaign_started",
        actionDescription: `🔄 Drip campaign "${campaignType}" started for ${lead.name} — ${sequence.length} steps`,
      };
    }

    case "list_campaigns": {
      const allCampaigns = await storage.getCampaignsByUser(userId);
      const statusFilter = args.status_filter ? String(args.status_filter) : null;
      const filtered = statusFilter
        ? allCampaigns.filter(c => c.status === statusFilter)
        : allCampaigns;

      if (filtered.length === 0) {
        return { result: statusFilter ? `No campaigns found with status "${statusFilter}".` : "No drip campaigns yet. Start one with start_drip_campaign!" };
      }

      const campaignList = await Promise.all(filtered.map(async (c) => {
        const lead = await storage.getLeadById(c.leadId, userId);
        const steps = c.steps as Array<{ stepName: string }>;
        return `- Campaign #${c.id} | ${c.campaignType} | Lead: ${lead?.name || "Unknown"} | Step ${c.currentStep}/${steps.length} | Status: ${c.status}`;
      }));

      return { result: `Found ${filtered.length} campaign(s):\n${campaignList.join("\n")}` };
    }

    case "list_templates": {
      const templates = listTemplates();
      const templateList = templates.map(t => `- ${t.id}: ${t.name} — Subject: "${t.subject}"`).join("\n");
      return { result: `Available email templates:\n${templateList}\n\nUse use_template to send any of these to a specific lead.` };
    }

    case "score_leads": {
      const allLeads = await storage.getLeadsByUser(userId);
      if (allLeads.length === 0) {
        return { result: "No leads in your pipeline to score." };
      }

      const statusWeight: Record<string, number> = {
        won: 100, negotiation: 85, proposal: 70, qualified: 55,
        contacted: 35, new: 20, lost: 0,
      };

      let hot = 0, warm = 0, cold = 0;
      for (const lead of allLeads) {
        const baseScore = statusWeight[lead.status] || 20;
        const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const recencyBonus = daysSinceUpdate <= 3 ? 15 : daysSinceUpdate <= 7 ? 5 : -10;
        const totalScore = Math.max(0, Math.min(100, baseScore + recencyBonus));

        let scoreLabel: string;
        if (totalScore >= 60) { scoreLabel = "hot"; hot++; }
        else if (totalScore >= 30) { scoreLabel = "warm"; warm++; }
        else { scoreLabel = "cold"; cold++; }

        await storage.updateLead(lead.id, userId, { score: scoreLabel });
      }

      await storage.createAgentAction({
        userId, agentType,
        actionType: "leads_scored",
        description: `Lead scoring complete: ${hot} Hot, ${warm} Warm, ${cold} Cold out of ${allLeads.length} leads`,
        metadata: { hot, warm, cold, total: allLeads.length },
      });

      return {
        result: `Lead scoring complete!\n\n🔥 Hot (${hot}): Ready to close — high status + recent activity\n🌤️ Warm (${warm}): Engaged — mid-pipeline or moderate activity\n❄️ Cold (${cold}): Need attention — stale or early pipeline\n\nTotal: ${allLeads.length} leads scored.`,
        actionType: "leads_scored",
        actionDescription: `📊 Scored ${allLeads.length} leads: ${hot} Hot, ${warm} Warm, ${cold} Cold`,
      };
    }

    case "pipeline_report": {
      const allLeads = await storage.getLeadsByUser(userId);
      if (allLeads.length === 0) {
        return { result: "Your pipeline is empty. Add some leads first!" };
      }

      const statusCounts: Record<string, number> = {};
      let thisWeek = 0, thisMonth = 0;
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

      for (const lead of allLeads) {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
        const created = new Date(lead.createdAt).getTime();
        if (created >= weekAgo) thisWeek++;
        if (created >= monthAgo) thisMonth++;
      }

      const won = statusCounts["won"] || 0;
      const lost = statusCounts["lost"] || 0;
      const closed = won + lost;
      const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

      const statusReport = Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([s, c]) => `  ${s}: ${c}`)
        .join("\n");

      const scoreCounts: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
      for (const lead of allLeads) {
        if (lead.score) scoreCounts[lead.score] = (scoreCounts[lead.score] || 0) + 1;
      }

      return {
        result: `📊 PIPELINE REPORT\n\n` +
          `Total Leads: ${allLeads.length}\n` +
          `New This Week: ${thisWeek}\n` +
          `New This Month: ${thisMonth}\n\n` +
          `BY STATUS:\n${statusReport}\n\n` +
          `CONVERSION: ${conversionRate}% (${won} won / ${closed} closed)\n\n` +
          `LEAD SCORES: 🔥 ${scoreCounts.hot} Hot | 🌤️ ${scoreCounts.warm} Warm | ❄️ ${scoreCounts.cold} Cold`,
      };
    }

    case "create_proposal": {
      const leadId = Number(args.lead_id);
      const lead = await storage.getLeadById(leadId, userId);
      if (!lead) {
        return { result: `Lead #${leadId} not found or you don't have access to it.` };
      }

      const customNotes = args.custom_notes ? String(args.custom_notes) : "";
      const companyName = lead.company || "your organization";

      const proposal = `
═══════════════════════════════════════
   SALES PROPOSAL — ${companyName.toUpperCase()}
═══════════════════════════════════════

Prepared for: ${lead.name}
Company: ${companyName}
Date: ${new Date().toLocaleDateString()}

─── EXECUTIVE SUMMARY ───
We're excited to present a tailored AI workforce solution for ${companyName}. Our platform deploys pre-trained AI workers that integrate seamlessly with your existing workflows, delivering immediate productivity gains.

─── THE CHALLENGE ───
Modern businesses face:
• Rising operational costs and staffing challenges
• Repetitive tasks consuming valuable team time
• Difficulty scaling without proportional headcount growth
• Inconsistent quality during peak demand periods

─── OUR SOLUTION ───
RentAI 24 provides ${companyName} with:
✓ AI Workers trained for specific business functions
✓ 24/7 availability with zero downtime
✓ Instant deployment — no training period required
✓ Seamless integration with your existing tools
✓ Real-time performance monitoring and analytics

─── INVESTMENT ───
• Starter Plan: $49/month — 1 AI Worker, 500 messages
• Professional Plan: $39/month/worker — Up to 5 workers, 2,000 messages each
• Enterprise: Custom pricing for unlimited scale

─── IMPLEMENTATION TIMELINE ───
Day 1: Account setup and AI worker selection
Day 2-3: Integration with your workflows
Day 4-7: Optimization and fine-tuning
Week 2+: Full autonomous operation

─── NEXT STEPS ───
1. Schedule a personalized demo
2. Select the right AI workers for your needs
3. Begin your 30-day trial with full support
${customNotes ? `\n─── ADDITIONAL NOTES ───\n${customNotes}` : ""}

We look forward to partnering with ${companyName} on this journey.
═══════════════════════════════════════`;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "proposal_created",
        description: `Sales proposal created for ${lead.name} at ${companyName}`,
        metadata: { leadId, leadName: lead.name, company: companyName, proposalContent: proposal },
      });

      return {
        result: `Proposal created for ${lead.name} at ${companyName}!\n\n${proposal}\n\nWould you like me to email this proposal to ${lead.name} at ${lead.email}?`,
        actionType: "proposal_created",
        actionDescription: `📄 Proposal created for ${lead.name} at ${companyName}`,
      };
    }

    case "analyze_competitors": {
      const industry = String(args.industry);
      const companyContext = args.company_context ? String(args.company_context) : "";

      const analysis = `
═══════════════════════════════════════
   COMPETITIVE ANALYSIS: ${industry.toUpperCase()}
═══════════════════════════════════════
${companyContext ? `Context: ${companyContext}\n` : ""}
─── MARKET LANDSCAPE ───
The ${industry} market is experiencing rapid transformation driven by AI adoption, automation trends, and shifting business models. Key competitive forces include:

• Market consolidation among established players
• Rising demand for AI-powered solutions
• Increasing customer expectations for 24/7 service
• Cost pressure driving automation adoption

─── COMPETITIVE POSITIONING ───

Traditional Solutions:
⚠️ Strengths: Established brand, large teams, proven track record
⚠️ Weaknesses: High cost, slow to adapt, rigid contracts, 9-5 availability

Freelance/Contractor Models:
⚠️ Strengths: Flexible, specialized skills, cost-effective short-term
⚠️ Weaknesses: Inconsistent quality, availability gaps, management overhead

AI-First Competitors:
⚠️ Strengths: 24/7 availability, scalable, consistent quality
⚠️ Weaknesses: Limited customization, generic solutions, trust barriers

─── OUR DIFFERENTIATORS ───
✓ Pre-trained AI workers specialized by function (Sales, Support, HR, etc.)
✓ Month-to-month flexibility — no long-term contracts
✓ Starting at $39-49/month vs. $3,000-5,000+/month for human equivalents
✓ 24/7 operation with zero sick days or turnover
✓ Real integrations (email, calendar, CRM) — not just chat
✓ ROI typically realized within the first week

─── RECOMMENDATIONS ───
1. Lead with cost savings: Show the 90%+ cost reduction vs. traditional staffing
2. Emphasize 24/7 availability as a competitive advantage
3. Offer a trial period to overcome trust barriers
4. Focus on specific pain points in the ${industry} sector
5. Position AI workers as augmenting (not replacing) the existing team

─── KEY TALKING POINTS ───
• "Would you rather pay $49/month or $5,000/month for the same output?"
• "Our AI workers handle the repetitive work so your team can focus on strategy"
• "Start with one AI worker, scale to a full team as you see results"
═══════════════════════════════════════`;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "competitor_analysis",
        description: `Competitive analysis generated for ${industry}${companyContext ? ` (${companyContext})` : ""}`,
        metadata: { industry, companyContext },
      });

      return {
        result: analysis,
        actionType: "competitor_analysis",
        actionDescription: `🔍 Competitive analysis: ${industry}`,
      };
    }

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}
