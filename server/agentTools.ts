import type OpenAI from "openai";
import { storage } from "./storage";
import { sendEmail } from "./emailService";
import { scheduleFollowup } from "./followupScheduler";
import { createCalendarEvent } from "./calendarService";

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

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}
