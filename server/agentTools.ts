import type OpenAI from "openai";
import { storage } from "./storage";
import { sendEmail } from "./emailService";

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
      description: "Schedule a follow-up email to be sent to a lead at a future time. Use this when the user asks to follow up later or schedule a reminder email.",
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
      description: "Create a meeting/demo appointment. Use this when the user asks to schedule a meeting, demo, or call with a prospect.",
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
];

export async function executeToolCall(
  toolName: string,
  args: any,
  userId: number,
  agentType: string
): Promise<{ result: string; actionType?: string; actionDescription?: string }> {
  switch (toolName) {
    case "send_email": {
      const emailResult = await sendEmail({
        userId,
        to: args.to,
        subject: args.subject,
        body: args.body,
        agentType,
      });
      return {
        result: emailResult.message,
        actionType: "email_sent",
        actionDescription: `📧 Email sent to ${args.to}: "${args.subject}"`,
      };
    }

    case "add_lead": {
      const lead = await storage.createLead({
        userId,
        name: args.name,
        email: args.email,
        company: args.company || null,
        notes: args.notes || null,
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
      const updates: any = {};
      if (args.status) updates.status = args.status;
      if (args.notes) updates.notes = args.notes;
      if (args.name) updates.name = args.name;
      if (args.email) updates.email = args.email;
      if (args.company) updates.company = args.company;

      const updated = await storage.updateLead(args.lead_id, userId, updates);
      if (!updated) {
        return { result: `Lead with ID ${args.lead_id} not found or you don't have access to it.` };
      }
      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "lead_updated",
        description: `Updated lead #${args.lead_id}: ${updated.name}${args.status ? ` → ${args.status}` : ""}`,
        metadata: { leadId: args.lead_id, updates },
      });
      return {
        result: `Lead #${args.lead_id} (${updated.name}) updated successfully.${args.status ? ` Status: ${args.status}` : ""}`,
        actionType: "lead_updated",
        actionDescription: `✏️ Updated lead: ${updated.name}${args.status ? ` → ${args.status}` : ""}`,
      };
    }

    case "list_leads": {
      const allLeads = await storage.getLeadsByUser(userId);
      const filtered = args.status_filter
        ? allLeads.filter(l => l.status === args.status_filter)
        : allLeads;

      if (filtered.length === 0) {
        return { result: args.status_filter ? `No leads found with status "${args.status_filter}".` : "No leads in your pipeline yet. Add some with the add_lead tool!" };
      }

      const leadList = filtered.map(l =>
        `- #${l.id} ${l.name} (${l.email})${l.company ? ` @ ${l.company}` : ""} | Status: ${l.status}${l.notes ? ` | Notes: ${l.notes}` : ""}`
      ).join("\n");

      return { result: `Found ${filtered.length} lead(s):\n${leadList}` };
    }

    case "schedule_followup": {
      const delayDays = Math.min(Math.max(args.delay_days || 1, 1), 30);
      const sendDate = new Date();
      sendDate.setDate(sendDate.getDate() + delayDays);

      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "followup_scheduled",
        description: `Follow-up scheduled for ${args.to} on ${sendDate.toLocaleDateString()}: "${args.subject}"`,
        metadata: { to: args.to, subject: args.subject, body: args.body, sendDate: sendDate.toISOString(), delayDays },
      });

      return {
        result: `Follow-up email scheduled for ${sendDate.toLocaleDateString()} (${delayDays} days from now) to ${args.to} with subject "${args.subject}"`,
        actionType: "followup_scheduled",
        actionDescription: `⏰ Follow-up scheduled for ${args.to} on ${sendDate.toLocaleDateString()}`,
      };
    }

    case "create_meeting": {
      const duration = args.duration_minutes || 30;

      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "meeting_created",
        description: `Meeting created: "${args.title}" with ${args.attendee_email} on ${args.date} at ${args.time} (${duration}min)`,
        metadata: { title: args.title, attendeeEmail: args.attendee_email, date: args.date, time: args.time, duration, description: args.description },
      });

      return {
        result: `Meeting "${args.title}" created for ${args.date} at ${args.time} (${duration} minutes) with ${args.attendee_email}.${args.description ? ` Agenda: ${args.description}` : ""}`,
        actionType: "meeting_created",
        actionDescription: `📅 Meeting created: "${args.title}" on ${args.date} at ${args.time}`,
      };
    }

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}
