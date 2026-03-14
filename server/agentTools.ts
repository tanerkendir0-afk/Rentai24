import type OpenAI from "openai";
import { storage } from "./storage";
import { sendEmail } from "./emailService";
import { scheduleFollowup } from "./followupScheduler";
import { createCalendarEvent } from "./calendarService";
import { getTemplate, fillTemplate, listTemplates, DRIP_SEQUENCES } from "./emailTemplates";
import { generateAIImage, findStockImages } from "./imageService";
import { isGmailConnected, listInbox, readEmail, replyToEmail, getActiveUserGmailInfo } from "./gmailService";

const gmailInboxTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_inbox",
      description: "List the latest emails from the user's Gmail inbox. Use when the user asks to check their email, see new messages, or view their inbox.",
      parameters: {
        type: "object",
        properties: {
          max_results: { type: "number", description: "Number of emails to fetch (1-20, default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_email",
      description: "Read the full content of a specific email by its ID. Use when the user asks to open, read, or see the details of an email from the inbox list.",
      parameters: {
        type: "object",
        properties: {
          email_id: { type: "string", description: "The email ID (from list_inbox results)" },
        },
        required: ["email_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reply_email",
      description: "Reply to a specific email in the same thread. Use when the user asks to respond to, reply to, or answer an email.",
      parameters: {
        type: "object",
        properties: {
          email_id: { type: "string", description: "The email ID to reply to (from list_inbox or read_email results)" },
          body: { type: "string", description: "The reply message body" },
        },
        required: ["email_id", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_gmail_status",
      description: "Check if Gmail is properly connected and configured. Use when the user has issues with email functionality or asks about their email connection status.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export const salesSdrTools: OpenAI.ChatCompletionTool[] = [
  ...gmailInboxTools,
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
      description: "Schedule a follow-up email to be sent to a lead at a future time. The email will be automatically sent via the user's connected email provider (Gmail if connected, otherwise platform email) when the scheduled time arrives.",
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

export const customerSupportTools: OpenAI.ChatCompletionTool[] = [
  ...gmailInboxTools,
  {
    type: "function",
    function: {
      name: "create_ticket",
      description: "Create a new support ticket to track a customer issue. Use when a customer reports a problem, bug, or needs help.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Short summary of the issue" },
          description: { type: "string", description: "Detailed description of the problem" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Ticket priority level" },
          customer_email: { type: "string", description: "Customer's email address for follow-up" },
        },
        required: ["subject", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tickets",
      description: "List all support tickets. Use when the user asks about open tickets, ticket status, or wants to see all issues.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["open", "in_progress", "resolved", "closed"], description: "Optional: filter by ticket status" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_ticket",
      description: "Update a support ticket's status, priority, or add notes. Use when working on a ticket or changing its priority.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: { type: "number", description: "Ticket ID to update" },
          status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"], description: "New ticket status" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Updated priority" },
          resolution: { type: "string", description: "Resolution notes when closing/resolving a ticket" },
        },
        required: ["ticket_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_ticket",
      description: "Close a resolved support ticket with a resolution summary. Use when an issue is fully resolved.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: { type: "number", description: "Ticket ID to close" },
          resolution: { type: "string", description: "How the issue was resolved" },
        },
        required: ["ticket_id", "resolution"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "email_customer",
      description: "Send an email update to a customer about their support ticket. Use to notify customers about ticket progress or resolution.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Customer email address" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body with the update" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
];

export const schedulingTools: OpenAI.ChatCompletionTool[] = [
  ...gmailInboxTools,
  {
    type: "function",
    function: {
      name: "create_appointment",
      description: "Create a new appointment or meeting. If Google Calendar is connected, a calendar event with invite will be created automatically.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Appointment title" },
          attendee_email: { type: "string", description: "Attendee's email address" },
          date: { type: "string", description: "Appointment date (YYYY-MM-DD format)" },
          time: { type: "string", description: "Appointment time (HH:MM format, 24h)" },
          duration_minutes: { type: "number", description: "Duration in minutes (default 30)" },
          description: { type: "string", description: "Appointment description/notes" },
        },
        required: ["title", "attendee_email", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_appointments",
      description: "List all scheduled appointments and meetings. Shows upcoming and past appointments from the activity log.",
      parameters: {
        type: "object",
        properties: {
          upcoming_only: { type: "boolean", description: "If true, show only future appointments" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_reminder",
      description: "Send a reminder email about an upcoming appointment or meeting.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Reminder subject" },
          body: { type: "string", description: "Reminder message body" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_followup_reminder",
      description: "Schedule a follow-up reminder email to be sent at a future date.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Reminder email subject" },
          body: { type: "string", description: "Reminder email body" },
          delay_days: { type: "number", description: "Number of days from now to send (1-30)" },
        },
        required: ["to", "subject", "body", "delay_days"],
      },
    },
  },
];

export const dataAnalystTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "query_leads",
      description: "Query and analyze the user's lead data from the CRM. Returns stats, counts, and breakdowns by status or score.",
      parameters: {
        type: "object",
        properties: {
          group_by: { type: "string", enum: ["status", "score", "company"], description: "How to group the results" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_actions",
      description: "Query the activity log to analyze agent actions, email sends, meetings, and other tracked events.",
      parameters: {
        type: "object",
        properties: {
          action_type: { type: "string", description: "Optional: filter by action type (email_sent, lead_added, meeting_created, etc.)" },
          agent_type: { type: "string", description: "Optional: filter by agent (sales-sdr, customer-support, etc.)" },
          days: { type: "number", description: "Look back this many days (default: 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_campaigns",
      description: "Analyze email campaign data — active vs completed campaigns, success rates, and campaign performance.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_rentals",
      description: "Query rental/subscription data to analyze active AI worker usage, message consumption, and worker distribution.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_report",
      description: "Generate a comprehensive business intelligence report combining leads, actions, campaigns, and rental data into a single executive summary.",
      parameters: {
        type: "object",
        properties: {
          report_type: { type: "string", enum: ["executive_summary", "sales_performance", "activity_overview", "agent_usage"], description: "Type of report to generate" },
        },
        required: ["report_type"],
      },
    },
  },
];

export const socialMediaTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_connected_accounts",
      description: "Check which social media accounts the user has connected. Returns a list of platforms with usernames. Use this at the start of a conversation to understand the user's social media presence and suggest connecting more accounts if needed.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate a custom AI image for social media content. Creates brand visuals, post graphics, story images, cover photos, or any creative visual content. Use when the user asks for a visual, graphic, image, or design.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed description of the image to generate. Include style, colors, mood, and composition details for best results." },
          aspect_ratio: { type: "string", enum: ["1:1", "4:3", "16:9", "9:16", "3:4"], description: "Image aspect ratio. 1:1 for Instagram posts, 9:16 for Stories/Reels, 16:9 for YouTube/LinkedIn covers, 4:3 for Facebook." },
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"], description: "Target platform (helps optimize dimensions)" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_stock_image",
      description: "Find and retrieve professional stock photos matching a description. Use when the user needs realistic photography rather than AI-generated graphics — such as office scenes, people, products, or nature.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Description of the stock image needed" },
          count: { type: "number", description: "Number of images to find (1-5, default: 3)" },
          orientation: { type: "string", enum: ["horizontal", "vertical", "all"], description: "Image orientation preference (default: horizontal)" },
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_post",
      description: "Create a social media post draft for a specific platform. Generates ready-to-publish content with hashtags and emojis.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok"], description: "Target social media platform" },
          topic: { type: "string", description: "Topic or subject of the post" },
          tone: { type: "string", enum: ["professional", "casual", "humorous", "inspirational", "educational"], description: "Tone of voice (default: professional)" },
          include_hashtags: { type: "boolean", description: "Whether to include hashtags (default: true)" },
        },
        required: ["platform", "topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_content_calendar",
      description: "Generate a content calendar with post ideas for a specified time period. Creates a structured posting schedule.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days to plan (1-30, default 7)" },
          platforms: { type: "string", description: "Comma-separated platforms (e.g. 'instagram,twitter,linkedin')" },
          theme: { type: "string", description: "Overall theme or focus area for the content" },
        },
        required: ["theme"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_hashtags",
      description: "Generate relevant hashtags for a topic, optimized for reach and engagement on a specific platform.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic to generate hashtags for" },
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok"], description: "Target platform" },
          count: { type: "number", description: "Number of hashtags to generate (default: 10)" },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_response",
      description: "Draft a response to a customer comment, review, or social media mention. Generates professional, brand-appropriate replies.",
      parameters: {
        type: "object",
        properties: {
          original_message: { type: "string", description: "The customer's original comment/message to respond to" },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral", "question"], description: "Sentiment of the original message" },
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok", "google_review"], description: "Where the comment was posted" },
        },
        required: ["original_message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "publish_post",
      description: "Publish a post directly to a connected social media platform via API. Only works for Business/API accounts (Twitter, Instagram Business, Facebook, LinkedIn). For personal accounts, use prepare_post_for_manual_sharing instead.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["twitter", "instagram", "facebook", "linkedin"], description: "Target platform to publish to" },
          content: { type: "string", description: "The post content/caption text" },
          hashtags: { type: "string", description: "Hashtags to append (optional)" },
          image_url: { type: "string", description: "URL of an image to include (optional, required for Instagram)" },
        },
        required: ["platform", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_post_for_manual_sharing",
      description: "Prepare a post for manual sharing on personal accounts (Instagram, TikTok, etc). Creates a Publish Assistant card with copy-to-clipboard buttons and deep links to open the app. Use this for personal accounts that don't support API posting.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"], description: "Target platform" },
          content: { type: "string", description: "The post content/caption text" },
          hashtags: { type: "string", description: "Hashtags to include" },
          image_url: { type: "string", description: "URL of the image to share (optional)" },
        },
        required: ["platform", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_post",
      description: "Schedule a post to be published at a future date/time. For API accounts, it will auto-publish. For personal accounts, it will send a reminder notification.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok"], description: "Target platform" },
          content: { type: "string", description: "The post content/caption text" },
          hashtags: { type: "string", description: "Hashtags to include" },
          image_url: { type: "string", description: "URL of the image to include (optional)" },
          scheduled_date: { type: "string", description: "ISO 8601 date/time string for when to publish (e.g. '2025-01-15T14:00:00Z')" },
        },
        required: ["platform", "content", "scheduled_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_scheduled_posts",
      description: "List all scheduled posts for the user. Shows pending, published, failed, and cancelled posts.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_scheduled_post",
      description: "Cancel a pending scheduled post by its ID.",
      parameters: {
        type: "object",
        properties: {
          post_id: { type: "number", description: "The ID of the scheduled post to cancel" },
        },
        required: ["post_id"],
      },
    },
  },
];

export const bookkeepingTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Generate a professional invoice with line items, totals, and payment terms.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Client/company name" },
          client_email: { type: "string", description: "Client email for sending the invoice" },
          items: { type: "string", description: "Line items in format: 'Description|Qty|Price' separated by semicolons. e.g. 'Web Design|1|5000;Hosting|12|50'" },
          due_days: { type: "number", description: "Payment due in N days (default: 30)" },
          notes: { type: "string", description: "Additional notes on the invoice" },
        },
        required: ["client_name", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_expense",
      description: "Log a business expense for tracking and categorization.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "What the expense is for" },
          amount: { type: "number", description: "Expense amount" },
          category: { type: "string", enum: ["office", "software", "travel", "marketing", "payroll", "utilities", "equipment", "professional_services", "other"], description: "Expense category" },
          date: { type: "string", description: "Expense date (YYYY-MM-DD, default: today)" },
          vendor: { type: "string", description: "Vendor/supplier name" },
        },
        required: ["description", "amount", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "financial_summary",
      description: "Generate a financial summary showing logged expenses, invoices, and cash flow overview.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter", "year"], description: "Time period for the summary (default: month)" },
        },
      },
    },
  },
];

export const hrRecruitingTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_job_posting",
      description: "Create a professional job posting with requirements, responsibilities, and benefits.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Job title" },
          department: { type: "string", description: "Department (e.g. Engineering, Marketing, Sales)" },
          type: { type: "string", enum: ["full-time", "part-time", "contract", "internship", "remote"], description: "Employment type" },
          description: { type: "string", description: "Brief job description and key responsibilities" },
          requirements: { type: "string", description: "Required skills and qualifications (comma-separated)" },
          salary_range: { type: "string", description: "Salary range (e.g. '$80,000 - $120,000')" },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "screen_resume",
      description: "Evaluate a resume/candidate description against job requirements and provide a fit score with recommendations.",
      parameters: {
        type: "object",
        properties: {
          candidate_info: { type: "string", description: "Candidate's resume text, skills, or background description" },
          job_requirements: { type: "string", description: "Required skills and qualifications for the role" },
          job_title: { type: "string", description: "Title of the position being filled" },
        },
        required: ["candidate_info", "job_requirements"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_interview_kit",
      description: "Generate an interview question kit tailored to a specific role, including behavioral, technical, and situational questions.",
      parameters: {
        type: "object",
        properties: {
          job_title: { type: "string", description: "Job title to create questions for" },
          focus_areas: { type: "string", description: "Key areas to evaluate (comma-separated, e.g. 'leadership,problem-solving,technical')" },
          experience_level: { type: "string", enum: ["junior", "mid", "senior", "lead", "executive"], description: "Candidate experience level" },
        },
        required: ["job_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_candidate_email",
      description: "Send an email to a candidate (interview invite, status update, offer, or rejection).",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Candidate email address" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
];

export const ecommerceOpsTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "optimize_listing",
      description: "Generate an optimized product listing with SEO-friendly title, description, bullet points, and keywords.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Product name" },
          category: { type: "string", description: "Product category" },
          features: { type: "string", description: "Key product features (comma-separated)" },
          target_audience: { type: "string", description: "Target customer segment" },
          platform: { type: "string", enum: ["amazon", "shopify", "etsy", "ebay", "general"], description: "E-commerce platform (default: general)" },
        },
        required: ["product_name", "features"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "price_analysis",
      description: "Generate a pricing strategy analysis with competitive positioning, margin calculations, and pricing recommendations.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Product name" },
          cost_price: { type: "number", description: "Cost/wholesale price per unit" },
          current_price: { type: "number", description: "Current selling price (if any)" },
          competitor_prices: { type: "string", description: "Competitor prices (comma-separated, e.g. '29.99,34.99,24.99')" },
          target_margin: { type: "number", description: "Target profit margin percentage (e.g. 40 for 40%)" },
        },
        required: ["product_name", "cost_price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_review_response",
      description: "Draft a professional response to a customer product review. Handles positive, negative, and neutral reviews appropriately.",
      parameters: {
        type: "object",
        properties: {
          review_text: { type: "string", description: "The customer's review text" },
          rating: { type: "number", description: "Star rating (1-5)" },
          product_name: { type: "string", description: "Name of the product being reviewed" },
        },
        required: ["review_text", "rating"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_shipping_providers",
      description: "Check which shipping/cargo providers the user has connected. Returns a list of providers with connection status. Use this to understand the user's shipping setup and suggest connecting providers if needed.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

export const realEstateTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_properties",
      description: "Search for rental properties and apartments matching specific criteria. Returns listings with addresses, prices, and key details.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City or neighborhood to search in" },
          bedrooms: { type: "number", description: "Number of bedrooms (1-5)" },
          max_budget: { type: "number", description: "Maximum monthly rent budget" },
          property_type: { type: "string", enum: ["apartment", "condo", "townhouse", "house", "studio", "any"], description: "Type of property (default: any)" },
          preferences: { type: "string", description: "Additional preferences (e.g. parking, pets, furnished, waterfront)" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "evaluate_listing",
      description: "Evaluate a property listing for value, red flags, scam indicators, and overall quality. Provides a rating and recommendation.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Property address" },
          price: { type: "number", description: "Monthly rent price" },
          bedrooms: { type: "number", description: "Number of bedrooms" },
          bathrooms: { type: "number", description: "Number of bathrooms" },
          sqft: { type: "number", description: "Square footage" },
          description: { type: "string", description: "Listing description text" },
          source: { type: "string", description: "Where the listing was found (e.g. Zillow, Craigslist, Facebook)" },
        },
        required: ["address", "price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "neighborhood_analysis",
      description: "Analyze a neighborhood for safety, amenities, transit access, schools, walkability, and overall livability.",
      parameters: {
        type: "object",
        properties: {
          neighborhood: { type: "string", description: "Neighborhood or area name" },
          city: { type: "string", description: "City name" },
          priorities: { type: "string", description: "What matters most (e.g. safety, transit, nightlife, schools, parks)" },
        },
        required: ["neighborhood", "city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_listing",
      description: "Create a professional property listing with compelling description, features, and pricing recommendations.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Property address" },
          property_type: { type: "string", description: "Type of property (apartment, house, condo, etc.)" },
          bedrooms: { type: "number", description: "Number of bedrooms" },
          bathrooms: { type: "number", description: "Number of bathrooms" },
          sqft: { type: "number", description: "Square footage" },
          features: { type: "string", description: "Key features (comma-separated)" },
          target_rent: { type: "number", description: "Target monthly rent" },
        },
        required: ["address", "property_type", "bedrooms"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lease_review",
      description: "Review lease terms and flag potential issues, unfavorable clauses, or red flags for tenants.",
      parameters: {
        type: "object",
        properties: {
          lease_terms: { type: "string", description: "Key lease terms to review (duration, rent, deposit, clauses, etc.)" },
          monthly_rent: { type: "number", description: "Monthly rent amount" },
          deposit: { type: "number", description: "Security deposit amount" },
          lease_duration: { type: "string", description: "Lease duration (e.g. 12 months, month-to-month)" },
        },
        required: ["lease_terms"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "market_report",
      description: "Generate a local real estate market report with trends, average pricing, and forecasts for a specific area.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          neighborhood: { type: "string", description: "Specific neighborhood (optional)" },
          property_type: { type: "string", description: "Property type to focus on (apartment, house, condo)" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_costs",
      description: "Calculate total move-in costs, monthly living expenses, and true cost comparison for a rental property.",
      parameters: {
        type: "object",
        properties: {
          monthly_rent: { type: "number", description: "Monthly rent amount" },
          deposit: { type: "number", description: "Security deposit" },
          city: { type: "string", description: "City (for utility estimates)" },
          parking: { type: "number", description: "Monthly parking cost (if any)" },
          utilities_included: { type: "boolean", description: "Whether utilities are included in rent" },
          pet_deposit: { type: "number", description: "Pet deposit if applicable" },
        },
        required: ["monthly_rent"],
      },
    },
  },
  ...gmailInboxTools,
];

export const agentToolRegistry: Record<string, OpenAI.ChatCompletionTool[]> = {
  "sales-sdr": salesSdrTools,
  "customer-support": customerSupportTools,
  "scheduling": schedulingTools,
  "data-analyst": dataAnalystTools,
  "social-media": socialMediaTools,
  "bookkeeping": bookkeepingTools,
  "hr-recruiting": hrRecruitingTools,
  "ecommerce-ops": ecommerceOpsTools,
  "real-estate": realEstateTools,
};

export function getToolsForAgent(agentType: string): OpenAI.ChatCompletionTool[] | undefined {
  return agentToolRegistry[agentType];
}

const TOOL_KEYWORD_MAP: Record<string, string[]> = {
  check_gmail_status: ["gmail", "email status", "email connection", "mail bağlantı", "e-posta durumu", "connected"],
  list_inbox: ["inbox", "email", "mail", "e-posta", "gelen kutusu", "mesaj", "check email"],
  read_email: ["read", "open", "email", "mail", "e-posta", "oku"],
  reply_email: ["reply", "respond", "yanıtla", "cevap", "email", "mail"],
  send_email: ["email", "mail", "send", "gönder", "e-posta", "outreach", "reach out"],
  email_customer: ["email", "mail", "send", "gönder", "müşteri", "customer"],
  add_lead: ["lead", "prospect", "müşteri adayı", "add", "ekle", "new contact", "pipeline"],
  update_lead: ["update", "güncelle", "lead", "status", "durum"],
  list_leads: ["leads", "pipeline", "prospects", "list", "listele", "müşteri"],
  schedule_followup: ["follow", "takip", "schedule", "hatırlat", "remind"],
  create_meeting: ["meeting", "toplantı", "demo", "schedule", "randevu", "görüşme"],
  bulk_email: ["bulk", "toplu", "all leads", "tüm", "mass"],
  use_template: ["template", "şablon", "kalıp"],
  start_drip_campaign: ["drip", "campaign", "kampanya", "sequence", "otomatik", "automated"],
  list_campaigns: ["campaign", "kampanya"],
  list_templates: ["template", "şablon"],
  score_leads: ["score", "hot", "warm", "cold", "puan", "sıcak", "soğuk"],
  pipeline_report: ["pipeline", "report", "stats", "analiz", "istatistik", "performans"],
  create_proposal: ["proposal", "teklif"],
  analyze_competitors: ["competitor", "rakip", "competitive"],
  create_ticket: ["ticket", "issue", "sorun", "problem", "create", "oluştur"],
  list_tickets: ["tickets", "list", "open", "listele"],
  update_ticket: ["update", "ticket", "güncelle"],
  close_ticket: ["close", "resolve", "kapat", "çöz"],
  create_appointment: ["appointment", "randevu", "schedule", "meeting", "toplantı"],
  list_appointments: ["appointments", "list", "randevu", "listele"],
  send_reminder: ["reminder", "hatırlatma", "remind"],
  schedule_followup_reminder: ["follow", "reminder", "hatırlat", "takip"],
  list_connected_accounts: ["account", "hesap", "connect", "bağla", "social", "sosyal", "platform", "instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube", "profile", "profil"],
  list_shipping_providers: ["kargo", "cargo", "shipping", "gönderi", "takip", "tracking", "teslimat", "delivery", "aras", "yurtiçi", "mng", "sürat", "ptt", "ups", "fedex", "dhl", "shipment", "paket", "package", "lojistik", "logistics"],
  generate_image: ["image", "visual", "görsel", "photo", "graphic", "design", "resim", "oluştur"],
  find_stock_image: ["stock", "photo", "image", "görsel", "fotoğraf"],
  create_post: ["post", "gönderi", "content", "içerik", "yaz", "write"],
  create_content_calendar: ["calendar", "takvim", "plan", "schedule", "content"],
  generate_hashtags: ["hashtag", "etiket"],
  draft_response: ["response", "comment", "yorum", "yanıt", "review"],
  publish_post: ["publish", "paylaş", "share", "post", "yayınla", "at", "tweet"],
  prepare_post_for_manual_sharing: ["manual", "share", "paylaş", "copy", "kopyala", "clipboard"],
  schedule_post: ["schedule", "zamanla", "later", "sonra", "yarın", "tomorrow", "time", "saat"],
  list_scheduled_posts: ["scheduled", "zamanlı", "pending", "bekleyen", "list"],
  cancel_scheduled_post: ["cancel", "iptal", "remove", "kaldır"],
  create_invoice: ["invoice", "fatura"],
  log_expense: ["expense", "gider", "harcama", "masraf"],
  financial_summary: ["financial", "summary", "report", "mali", "özet", "rapor", "gelir", "gider"],
  create_job_posting: ["job", "posting", "iş ilanı", "ilan", "pozisyon"],
  screen_resume: ["resume", "cv", "candidate", "aday", "screen", "değerlendir"],
  create_interview_kit: ["interview", "mülakat", "soru"],
  send_candidate_email: ["candidate", "aday", "email", "mail"],
  optimize_listing: ["listing", "product", "ürün", "optimize", "seo"],
  price_analysis: ["price", "fiyat", "pricing", "margin", "maliyet"],
  draft_review_response: ["review", "yorum", "response", "yanıt"],
  query_leads: ["leads", "data", "analyze", "analiz", "veri"],
  query_actions: ["actions", "activity", "aktivite", "log"],
  query_campaigns: ["campaign", "kampanya", "performance"],
  query_rentals: ["rental", "usage", "kullanım", "agent"],
  generate_report: ["report", "rapor", "summary", "özet"],
  search_properties: ["search", "find", "apartment", "daire", "ev", "property", "rental", "kiralık", "ara"],
  evaluate_listing: ["evaluate", "değerlendir", "listing", "ilan"],
  neighborhood_analysis: ["neighborhood", "mahalle", "area", "bölge", "safe", "güvenli"],
  create_listing: ["listing", "ilan", "property", "create"],
  lease_review: ["lease", "kira sözleşme", "contract", "sözleşme"],
  market_report: ["market", "piyasa", "trend", "fiyat"],
  calculate_costs: ["cost", "calculate", "maliyet", "hesapla", "expense"],
};

export function getRelevantToolsForMessage(
  agentType: string,
  message: string
): OpenAI.ChatCompletionTool[] | undefined {
  const allTools = agentToolRegistry[agentType];
  if (!allTools) return undefined;

  if (allTools.length <= 5) return allTools;

  const msgLower = message.toLowerCase();

  const relevant = allTools.filter((tool) => {
    const toolName = tool.function.name;
    const keywords = TOOL_KEYWORD_MAP[toolName];
    if (!keywords) return true;
    return keywords.some((kw) => msgLower.includes(kw));
  });

  if (relevant.length === 0) return allTools;

  return relevant;
}

const lastInboxResults = new Map<number, string[]>();

function resolveEmailId(rawId: string, userId: number): string {
  const num = parseInt(rawId, 10);
  if (!isNaN(num) && num >= 1) {
    const cached = lastInboxResults.get(userId);
    if (cached && num <= cached.length) {
      return cached[num - 1];
    }
  }
  return rawId;
}

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: number,
  agentType: string
): Promise<{ result: string; actionType?: string; actionDescription?: string }> {
  switch (toolName) {
    case "check_gmail_status": {
      const gmailConnected = await isGmailConnected();
      const userGmailInfo = getActiveUserGmailInfo();
      const hasUserCreds = !!(userGmailInfo?.hasCredentials);
      let statusMsg = "";
      if (gmailConnected && hasUserCreds) {
        statusMsg = `✅ **Gmail Connected**\n\nYour Gmail account (${userGmailInfo?.email}) is properly configured and ready to use. You can send emails, check your inbox, and reply to messages.`;
      } else if (gmailConnected) {
        statusMsg = `✅ **Gmail Connected** (System Level)\n\nGmail is connected via the platform integration. For personalized email (send from your own address), go to **Settings** and add your Gmail address and App Password.`;
      } else if (hasUserCreds) {
        statusMsg = `⚠️ **Gmail Partially Configured**\n\nYour Gmail credentials are saved (${userGmailInfo?.email}), but there may be a connection issue. Please verify your App Password is correct in **Settings** → Gmail section.`;
      } else {
        statusMsg = `❌ **Gmail Not Connected**\n\nTo use email features, please go to **Settings** (click the ⚙️ icon) → Gmail section:\n1. Enter your Gmail address\n2. Generate an App Password from your Google Account (Security → 2-Step Verification → App Passwords)\n3. Enter the App Password and save\n\nOnce connected, I can check your inbox, read emails, send emails, and reply to messages.`;
      }
      await storage.createAgentAction({
        userId, agentType, actionType: "gmail_status_check",
        description: `Gmail status check: ${gmailConnected ? "connected" : "not connected"}, user creds: ${hasUserCreds ? "yes" : "no"}`,
        metadata: { connected: gmailConnected, hasUserCreds },
      });
      return { result: statusMsg, actionType: "gmail_status_check", actionDescription: `📧 Gmail status: ${gmailConnected ? "Connected" : "Not connected"}` };
    }

    case "list_inbox": {
      const connected = await isGmailConnected();
      if (!connected) {
        await storage.createAgentAction({
          userId, agentType, actionType: "inbox_check_failed",
          description: "Attempted to check Gmail inbox — Gmail not connected",
          metadata: { error: "gmail_not_connected" },
        });
        return {
          result: "Gmail is not connected. To use email features, please go to **Settings** (click the ⚙️ icon in the top navigation) and connect your Gmail account with your email address and App Password. Once connected, I'll be able to check your inbox, read emails, and send replies.",
          actionType: "inbox_check_failed",
          actionDescription: "❌ Gmail not connected — cannot check inbox",
        };
      }
      const maxResults = Math.min(Math.max(Number(args.max_results) || 10, 1), 20);
      const inboxResult = await listInbox(maxResults);
      if (!inboxResult.success || !inboxResult.emails) {
        const errorMsg = inboxResult.message || "Unknown error";
        const isImapRelated = /IMAP/i.test(errorMsg);
        const guidanceMsg = isImapRelated
          ? `\n\n**How to fix:** Go to **Settings** → Gmail section and verify your email address and App Password are correct. Make sure IMAP is enabled in your Gmail settings.`
          : `\n\n**How to fix:** Go to **Settings** → Gmail section and check your connection settings.`;
        await storage.createAgentAction({
          userId, agentType, actionType: "inbox_check_failed",
          description: `Failed to check Gmail inbox: ${errorMsg}`,
          metadata: { error: errorMsg },
        });
        return { result: `Could not retrieve your inbox. ${errorMsg}${guidanceMsg}`, actionType: "inbox_check_failed", actionDescription: `❌ Inbox check failed` };
      }
      if (inboxResult.emails.length === 0) {
        await storage.createAgentAction({
          userId, agentType, actionType: "inbox_checked",
          description: "Checked Gmail inbox — no emails found",
          metadata: { count: 0 },
        });
        return { result: "Your inbox is empty. No new emails.", actionType: "inbox_checked", actionDescription: "📬 Inbox checked — empty" };
      }
      lastInboxResults.set(userId, inboxResult.emails.map(e => e.id));
      const isImapSource = inboxResult.message?.includes("IMAP");
      const sourceLabel = isImapSource ? " (via IMAP)" : "";
      const emailList = inboxResult.emails.map((e, i) =>
        `${i + 1}. **From:** ${e.from}\n   **Subject:** ${e.subject}\n   **Date:** ${e.date}\n   **Preview:** ${e.snippet}\n   **Email ID:** \`${e.id}\``
      ).join("\n\n");
      await storage.createAgentAction({
        userId, agentType, actionType: "inbox_checked",
        description: `Checked Gmail inbox${sourceLabel} — ${inboxResult.emails.length} emails found`,
        metadata: { count: inboxResult.emails.length, emailIds: inboxResult.emails.map(e => e.id), source: isImapSource ? "imap" : "gmail" },
      });
      return {
        result: `📬 **Gmail Inbox${sourceLabel}** (${inboxResult.emails.length} emails):\n\n${emailList}\n\nTo read an email's full content, tell me the email number (e.g. "read email #3") or provide the Email ID.`,
        actionType: "inbox_checked",
        actionDescription: `📬 Checked inbox${sourceLabel} — ${inboxResult.emails.length} emails`,
      };
    }

    case "read_email": {
      const connected = await isGmailConnected();
      if (!connected) {
        await storage.createAgentAction({
          userId, agentType, actionType: "email_read_failed",
          description: "Attempted to read email — Gmail not connected",
          metadata: { error: "gmail_not_connected", emailId: args.email_id },
        });
        return {
          result: "Gmail is not connected. To use email features, please go to **Settings** (click the ⚙️ icon in the top navigation) and connect your Gmail account with your email address and App Password.",
          actionType: "email_read_failed",
          actionDescription: "❌ Gmail not connected",
        };
      }
      if (!args.email_id) {
        await storage.createAgentAction({
          userId, agentType, actionType: "email_read_failed",
          description: "Attempted to read email — no email ID provided",
          metadata: { error: "missing_email_id" },
        });
        return { result: "Please provide an email ID or number to read.", actionType: "email_read_failed", actionDescription: "❌ No email ID provided" };
      }
      const emailId = resolveEmailId(String(args.email_id), userId);
      const readResult = await readEmail(emailId);
      if (!readResult.success || !readResult.email) {
        const readErrorMsg = readResult.message || "Unknown error";
        const readGuidance = `\n\n**How to fix:** Go to **Settings** → Gmail section and check your connection settings.`;
        await storage.createAgentAction({
          userId, agentType, actionType: "email_read_failed",
          description: `Failed to read email ${emailId}: ${readErrorMsg}`,
          metadata: { error: readErrorMsg, emailId },
        });
        return { result: `Could not read this email. ${readErrorMsg}${readGuidance}`, actionType: "email_read_failed", actionDescription: `❌ Email read failed` };
      }
      const e = readResult.email;
      const isReadViaImap = readResult.message?.includes("IMAP");
      const readSourceLabel = isReadViaImap ? " (via IMAP)" : "";
      await storage.createAgentAction({
        userId, agentType, actionType: "email_read",
        description: `Read email${readSourceLabel} from ${e.from}: "${e.subject}"`,
        metadata: { emailId: e.id, threadId: e.threadId, from: e.from, subject: e.subject, source: isReadViaImap ? "imap" : "gmail" },
      });
      return {
        result: `📧 **Email Details${readSourceLabel}**\n\n**From:** ${e.from}\n**To:** ${e.to}\n**Subject:** ${e.subject}\n**Date:** ${e.date}\n**Email ID:** \`${e.id}\`\n\n---\n\n${e.body}\n\n---\n\nTo reply to this email, ask me to "reply to this email" with your message.`,
        actionType: "email_read",
        actionDescription: `📧 Read email${readSourceLabel}: "${e.subject}"`,
      };
    }

    case "reply_email": {
      const connected = await isGmailConnected();
      if (!connected) {
        await storage.createAgentAction({
          userId, agentType, actionType: "email_reply_failed",
          description: "Attempted to reply to email — Gmail not connected",
          metadata: { error: "gmail_not_connected", emailId: args.email_id },
        });
        return {
          result: "Gmail is not connected. Please connect your Gmail account to reply to emails.",
          actionType: "email_reply_failed",
          actionDescription: "❌ Gmail not connected",
        };
      }
      if (!args.email_id || !args.body) {
        await storage.createAgentAction({
          userId, agentType, actionType: "email_reply_failed",
          description: "Attempted to reply — missing email ID or reply body",
          metadata: { error: "missing_required_args", hasEmailId: !!args.email_id, hasBody: !!args.body },
        });
        return { result: "Please provide both the email ID and reply message.", actionType: "email_reply_failed", actionDescription: "❌ Missing email ID or reply body" };
      }
      const replyEmailId = resolveEmailId(String(args.email_id), userId);
      const replyBody = String(args.body);
      const replyResult = await replyToEmail(replyEmailId, replyBody);
      if (!replyResult.success) {
        await storage.createAgentAction({
          userId, agentType, actionType: "email_reply_failed",
          description: `Failed to reply to email ${replyEmailId}: ${replyResult.message}`,
          metadata: { error: replyResult.message, emailId: replyEmailId },
        });
        return { result: replyResult.message, actionType: "email_reply_failed", actionDescription: `❌ ${replyResult.message}` };
      }
      await storage.createAgentAction({
        userId, agentType, actionType: "email_replied",
        description: `Replied to email ${replyEmailId}`,
        metadata: { originalEmailId: replyEmailId, replyMessageId: replyResult.replyMessageId },
      });
      try {
        const { triggerEmailReplyNotification } = await import("./bossNotificationService");
        await triggerEmailReplyNotification({
          userId,
          agentType,
          teamMemberName: agentType,
          recipientEmail: replyEmailId,
          subject: "Email Reply",
          replySnippet: replyBody,
        });
      } catch (e) { console.error("[BossAI] reply notification error:", e); }
      return {
        result: `✅ ${replyResult.message}`,
        actionType: "email_replied",
        actionDescription: `↩️ ${replyResult.message}`,
      };
    }

    case "send_email": {
      const emailResult = await sendEmail({
        userId,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        agentType,
      });
      if (emailResult.success) {
        try {
          const { triggerEmailReplyNotification } = await import("./bossNotificationService");
          await triggerEmailReplyNotification({
            userId,
            agentType,
            teamMemberName: agentType,
            recipientEmail: String(args.to),
            subject: String(args.subject),
            replySnippet: String(args.body),
          });
        } catch (e) { console.error("[BossAI] send email notification error:", e); }
      }
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
        result: `Follow-up email #${followupId} scheduled for ${sendAt.toLocaleDateString()} (${delayDays} days from now) to ${args.to} with subject "${args.subject}". The email will be automatically sent via your connected email provider at that time.`,
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

    case "create_ticket": {
      const ticket = await storage.createSupportTicket({
        userId,
        subject: String(args.subject),
        description: String(args.description),
        priority: args.priority ? String(args.priority) : "medium",
        customerEmail: args.customer_email ? String(args.customer_email) : null,
        status: "open",
        resolution: null,
      });

      await storage.createAgentAction({
        userId, agentType,
        actionType: "ticket_created",
        description: `Support ticket #${ticket.id} created: "${ticket.subject}" [${ticket.priority}]`,
        metadata: { ticketId: ticket.id, subject: ticket.subject, priority: ticket.priority, customerEmail: ticket.customerEmail },
      });

      return {
        result: `Support ticket #${ticket.id} created successfully!\n\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\nStatus: open${ticket.customerEmail ? `\nCustomer: ${ticket.customerEmail}` : ""}\n\nI'll track this issue and help resolve it.`,
        actionType: "ticket_created",
        actionDescription: `🎫 Ticket #${ticket.id}: "${ticket.subject}" [${ticket.priority}]`,
      };
    }

    case "list_tickets": {
      const allTickets = await storage.getTicketsByUser(userId);
      const statusFilter = args.status_filter ? String(args.status_filter) : null;
      const filtered = statusFilter
        ? allTickets.filter(t => t.status === statusFilter)
        : allTickets;

      if (filtered.length === 0) {
        return { result: statusFilter ? `No tickets found with status "${statusFilter}".` : "No support tickets yet." };
      }

      const priorityEmoji: Record<string, string> = { urgent: "🔴", high: "🟠", medium: "🟡", low: "🟢" };
      const ticketList = filtered.map(t =>
        `- #${t.id} ${priorityEmoji[t.priority] || "⚪"} [${t.status}] "${t.subject}"${t.customerEmail ? ` — ${t.customerEmail}` : ""}`
      ).join("\n");

      return { result: `Found ${filtered.length} ticket(s):\n${ticketList}` };
    }

    case "update_ticket": {
      const ticketId = Number(args.ticket_id);
      const updates: Record<string, string> = {};
      if (args.status) updates.status = String(args.status);
      if (args.priority) updates.priority = String(args.priority);
      if (args.resolution) updates.resolution = String(args.resolution);

      const updated = await storage.updateTicket(ticketId, userId, updates);
      if (!updated) {
        return { result: `Ticket #${ticketId} not found.` };
      }

      await storage.createAgentAction({
        userId, agentType,
        actionType: "ticket_updated",
        description: `Ticket #${ticketId} updated: "${updated.subject}"${args.status ? ` → ${args.status}` : ""}`,
        metadata: { ticketId, updates },
      });

      return {
        result: `Ticket #${ticketId} updated!\n\nSubject: ${updated.subject}\nStatus: ${updated.status}\nPriority: ${updated.priority}${updated.resolution ? `\nResolution: ${updated.resolution}` : ""}`,
        actionType: "ticket_updated",
        actionDescription: `🎫 Ticket #${ticketId} updated${args.status ? ` → ${args.status}` : ""}`,
      };
    }

    case "close_ticket": {
      const closeId = Number(args.ticket_id);
      const resolution = String(args.resolution);
      const closed = await storage.updateTicket(closeId, userId, { status: "closed", resolution });
      if (!closed) {
        return { result: `Ticket #${closeId} not found.` };
      }

      await storage.createAgentAction({
        userId, agentType,
        actionType: "ticket_closed",
        description: `Ticket #${closeId} closed: "${closed.subject}" — ${resolution}`,
        metadata: { ticketId: closeId, resolution },
      });

      return {
        result: `Ticket #${closeId} closed!\n\nSubject: ${closed.subject}\nResolution: ${resolution}`,
        actionType: "ticket_closed",
        actionDescription: `✅ Ticket #${closeId} closed: "${closed.subject}"`,
      };
    }

    case "email_customer": {
      const emailResult = await sendEmail({
        userId,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        agentType,
      });

      if (emailResult.success) {
        await storage.createAgentAction({
          userId, agentType,
          actionType: "customer_email_sent",
          description: `Customer email sent to ${args.to}: "${args.subject}"`,
          metadata: { to: args.to, subject: args.subject },
        });
      }

      return {
        result: emailResult.success
          ? `Email sent to ${args.to}: "${args.subject}"`
          : `Failed to send email: ${emailResult.message}`,
        actionType: emailResult.success ? "customer_email_sent" : "email_failed",
        actionDescription: emailResult.success
          ? `📧 Customer email sent to ${args.to}`
          : `❌ Email failed to ${args.to}`,
      };
    }

    case "create_appointment": {
      const duration = Number(args.duration_minutes) || 30;
      const calResult = await createCalendarEvent({
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
        result: calResult.message,
        actionType: "appointment_created",
        actionDescription: `📅 Appointment: "${args.title}" on ${args.date} at ${args.time}`,
      };
    }

    case "list_appointments": {
      const actions = await storage.getActionsByUser(userId);
      const meetings = actions.filter(a => a.actionType === "meeting_created" || a.actionType === "appointment_created");

      if (meetings.length === 0) {
        return { result: "No appointments found. Create one with create_appointment!" };
      }

      const upcomingOnly = args.upcoming_only === true;
      const now = new Date();

      const meetingList = meetings
        .filter(m => {
          if (!upcomingOnly) return true;
          const meta = m.metadata as Record<string, unknown>;
          if (meta?.date) {
            const meetingDate = new Date(`${meta.date}T${meta.time || "00:00"}:00`);
            return meetingDate > now;
          }
          return true;
        })
        .slice(0, 15)
        .map(m => {
          const meta = m.metadata as Record<string, unknown>;
          return `- "${meta?.title || "Meeting"}" with ${meta?.attendeeEmail || "N/A"} on ${meta?.date || "N/A"} at ${meta?.time || "N/A"} (${meta?.duration || 30}min)`;
        })
        .join("\n");

      return { result: `${upcomingOnly ? "Upcoming" : "All"} appointments:\n${meetingList}` };
    }

    case "send_reminder": {
      const reminderResult = await sendEmail({
        userId,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        agentType,
      });

      if (reminderResult.success) {
        await storage.createAgentAction({
          userId, agentType,
          actionType: "reminder_sent",
          description: `Reminder sent to ${args.to}: "${args.subject}"`,
          metadata: { to: args.to, subject: args.subject },
        });
      }

      return {
        result: reminderResult.success
          ? `Reminder sent to ${args.to}: "${args.subject}"`
          : `Failed to send reminder: ${reminderResult.message}`,
        actionType: reminderResult.success ? "reminder_sent" : "email_failed",
        actionDescription: reminderResult.success
          ? `🔔 Reminder sent to ${args.to}`
          : `❌ Reminder failed to ${args.to}`,
      };
    }

    case "schedule_followup_reminder": {
      const delayDays = Math.min(Math.max(Number(args.delay_days) || 1, 1), 30);
      const { followupId, sendAt } = scheduleFollowup({
        userId, agentType,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        delayDays,
      });

      await storage.createAgentAction({
        userId, agentType,
        actionType: "reminder_scheduled",
        description: `Reminder scheduled for ${args.to} on ${sendAt.toLocaleDateString()}: "${args.subject}"`,
        metadata: { followupId, to: args.to, subject: args.subject, sendDate: sendAt.toISOString(), delayDays },
      });

      return {
        result: `Reminder #${followupId} scheduled for ${sendAt.toLocaleDateString()} (${delayDays} days from now) to ${args.to}.`,
        actionType: "reminder_scheduled",
        actionDescription: `⏰ Reminder scheduled for ${args.to} on ${sendAt.toLocaleDateString()}`,
      };
    }

    case "query_leads": {
      const allLeads = await storage.getLeadsByUser(userId);
      if (allLeads.length === 0) {
        return { result: "No lead data found. The sales pipeline is empty." };
      }

      const groupBy = args.group_by ? String(args.group_by) : "status";
      const groups: Record<string, number> = {};
      for (const lead of allLeads) {
        const key = groupBy === "score" ? (lead.score || "unscored") :
                    groupBy === "company" ? (lead.company || "No company") :
                    lead.status;
        groups[key] = (groups[key] || 0) + 1;
      }

      const groupReport = Object.entries(groups)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");

      return {
        result: `📊 LEAD DATA ANALYSIS\n\nTotal Leads: ${allLeads.length}\n\nGrouped by ${groupBy}:\n${groupReport}\n\nOldest lead: ${allLeads[allLeads.length - 1]?.name} (${new Date(allLeads[allLeads.length - 1]?.createdAt).toLocaleDateString()})\nNewest lead: ${allLeads[0]?.name} (${new Date(allLeads[0]?.createdAt).toLocaleDateString()})`,
      };
    }

    case "query_actions": {
      const allActions = await storage.getActionsByUser(userId);
      const days = Number(args.days) || 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      let filtered = allActions.filter(a => new Date(a.createdAt).getTime() >= cutoff);
      if (args.action_type) filtered = filtered.filter(a => a.actionType === String(args.action_type));
      if (args.agent_type) filtered = filtered.filter(a => a.agentType === String(args.agent_type));

      const typeCounts: Record<string, number> = {};
      for (const action of filtered) {
        typeCounts[action.actionType] = (typeCounts[action.actionType] || 0) + 1;
      }

      const typeReport = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");

      return {
        result: `📊 ACTIVITY LOG ANALYSIS (last ${days} days)\n\nTotal Actions: ${filtered.length}\n\nBy Type:\n${typeReport}\n\nMost Recent:\n${filtered.slice(0, 5).map(a => `  - ${a.description} (${new Date(a.createdAt).toLocaleString()})`).join("\n")}`,
      };
    }

    case "query_campaigns": {
      const campaigns = await storage.getCampaignsByUser(userId);
      if (campaigns.length === 0) {
        return { result: "No email campaign data found." };
      }

      const statusCounts: Record<string, number> = {};
      for (const c of campaigns) {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      }

      return {
        result: `📊 CAMPAIGN ANALYSIS\n\nTotal Campaigns: ${campaigns.length}\n\nBy Status:\n${Object.entries(statusCounts).map(([k, v]) => `  ${k}: ${v}`).join("\n")}\n\nActive campaigns: ${statusCounts["active"] || 0}\nCompleted: ${statusCounts["completed"] || 0}`,
      };
    }

    case "query_rentals": {
      const rentals = await storage.getRentalsByUser(userId);
      if (rentals.length === 0) {
        return { result: "No rental data found. No AI workers are currently rented." };
      }

      const activeRentals = rentals.filter(r => r.status === "active");
      const totalUsage = activeRentals.reduce((sum, r) => sum + r.messagesUsed, 0);
      const totalLimit = activeRentals.reduce((sum, r) => sum + r.messagesLimit, 0);

      const rentalList = activeRentals.map(r =>
        `  - ${r.agentType}: ${r.messagesUsed}/${r.messagesLimit} messages (${Math.round((r.messagesUsed / r.messagesLimit) * 100)}% used)`
      ).join("\n");

      return {
        result: `📊 AI WORKER USAGE\n\nActive Workers: ${activeRentals.length}\nTotal Messages Used: ${totalUsage}/${totalLimit} (${totalLimit > 0 ? Math.round((totalUsage / totalLimit) * 100) : 0}%)\n\nBy Worker:\n${rentalList}`,
      };
    }

    case "generate_report": {
      const reportType = String(args.report_type);
      const leads = await storage.getLeadsByUser(userId);
      const actions = await storage.getActionsByUser(userId);
      const rentals = await storage.getRentalsByUser(userId);
      const campaigns = await storage.getCampaignsByUser(userId);

      const activeRentals = rentals.filter(r => r.status === "active");
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const recentActions = actions.filter(a => new Date(a.createdAt).getTime() >= weekAgo);

      const statusCounts: Record<string, number> = {};
      for (const l of leads) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;

      let report = "";

      if (reportType === "executive_summary") {
        const won = statusCounts["won"] || 0;
        const closed = won + (statusCounts["lost"] || 0);
        const convRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

        report = `
═══════════════════════════════════════
   EXECUTIVE SUMMARY REPORT
═══════════════════════════════════════

📈 KEY METRICS
• Total Leads: ${leads.length}
• Active AI Workers: ${activeRentals.length}
• Conversion Rate: ${convRate}%
• Active Campaigns: ${campaigns.filter(c => c.status === "active").length}
• Actions This Week: ${recentActions.length}

📊 PIPELINE BREAKDOWN
${Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `• ${k}: ${v}`).join("\n")}

🤖 WORKER UTILIZATION
${activeRentals.map(r => `• ${r.agentType}: ${r.messagesUsed}/${r.messagesLimit} messages`).join("\n") || "• No active workers"}

📅 WEEKLY HIGHLIGHTS
• ${recentActions.length} actions performed
• ${actions.filter(a => a.actionType === "email_sent" && new Date(a.createdAt).getTime() >= weekAgo).length} emails sent
• ${leads.filter(l => new Date(l.createdAt).getTime() >= weekAgo).length} new leads added
═══════════════════════════════════════`;
      } else if (reportType === "sales_performance") {
        const scoreCounts: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
        for (const l of leads) if (l.score) scoreCounts[l.score]++;

        report = `
📊 SALES PERFORMANCE REPORT

Pipeline: ${leads.length} total leads
${Object.entries(statusCounts).map(([k, v]) => `  ${k}: ${v}`).join("\n")}

Lead Scores: 🔥 ${scoreCounts.hot} Hot | 🌤️ ${scoreCounts.warm} Warm | ❄️ ${scoreCounts.cold} Cold

Email Activity:
  Sent: ${actions.filter(a => a.actionType === "email_sent").length}
  Bulk: ${actions.filter(a => a.actionType === "bulk_email_sent").length}
  Templates: ${actions.filter(a => a.actionType === "template_email_sent").length}

Campaigns: ${campaigns.length} total (${campaigns.filter(c => c.status === "active").length} active)`;
      } else if (reportType === "activity_overview") {
        const typeCounts: Record<string, number> = {};
        for (const a of recentActions) typeCounts[a.actionType] = (typeCounts[a.actionType] || 0) + 1;

        report = `
📊 ACTIVITY OVERVIEW (Last 7 Days)

Total Actions: ${recentActions.length}

By Type:
${Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join("\n")}

Recent Activity:
${recentActions.slice(0, 10).map(a => `  - ${a.description}`).join("\n")}`;
      } else {
        report = `
📊 AGENT USAGE REPORT

Active Workers: ${activeRentals.length}
Total Messages: ${activeRentals.reduce((s, r) => s + r.messagesUsed, 0)}/${activeRentals.reduce((s, r) => s + r.messagesLimit, 0)}

Per Worker:
${activeRentals.map(r => `  ${r.agentType}: ${r.messagesUsed}/${r.messagesLimit} (${Math.round((r.messagesUsed / r.messagesLimit) * 100)}%)`).join("\n") || "  No active workers"}`;
      }

      await storage.createAgentAction({
        userId, agentType,
        actionType: "report_generated",
        description: `${reportType} report generated`,
        metadata: { reportType },
      });

      return {
        result: report,
        actionType: "report_generated",
        actionDescription: `📊 ${reportType.replace(/_/g, " ")} report generated`,
      };
    }

    case "generate_image": {
      const creditUsed = await storage.useImageCredit(userId);
      if (!creditUsed) {
        return {
          result: `You don't have any image credits remaining. Each AI image generation costs 1 credit ($3.00). Please purchase image credits from the credits panel in the chat interface to continue generating images.`,
          actionType: "image_credit_insufficient",
          actionDescription: `⚠️ Image generation blocked — no credits`,
        };
      }

      const prompt = String(args.prompt);
      const aspectRatio = args.aspect_ratio ? String(args.aspect_ratio) : "1:1";
      const platform = args.platform ? String(args.platform) : "general";

      try {
        const result = await generateAIImage(prompt, aspectRatio);

        if (result.success && result.imageUrl) {
          await storage.createAgentAction({
            userId, agentType,
            actionType: "image_generated",
            description: `🎨 AI image generated for ${platform}: "${prompt.substring(0, 80)}..."`,
            metadata: { prompt, aspectRatio, platform, imageUrl: result.imageUrl },
          });

          return {
            result: `Image generated successfully! (1 credit used)\n\n🎨 Prompt: "${prompt}"\n📐 Aspect Ratio: ${aspectRatio}\n📱 Platform: ${platform}\n\n![Generated Image](${result.imageUrl})\n\nThe image is ready to use. You can download it or I can create more variations.`,
            actionType: "image_generated",
            actionDescription: `🎨 AI image generated for ${platform}`,
          };
        }

        await storage.addImageCredits(userId, 1);
        return {
          result: `Image generation failed: ${result.error}. Your credit has been refunded. Please try a different description or try again later.`,
          actionType: "image_failed",
          actionDescription: `❌ Image generation failed (credit refunded)`,
        };
      } catch (err: any) {
        await storage.addImageCredits(userId, 1);
        return {
          result: `Image generation encountered an error. Your credit has been refunded. Please try again later.`,
          actionType: "image_failed",
          actionDescription: `❌ Image generation error (credit refunded)`,
        };
      }
    }

    case "find_stock_image": {
      const creditUsed = await storage.useImageCredit(userId);
      if (!creditUsed) {
        return {
          result: `You don't have any image credits remaining. Stock image search costs 1 credit ($3.00). Please purchase image credits from the credits panel in the chat interface.`,
          actionType: "image_credit_insufficient",
          actionDescription: `⚠️ Stock image search blocked — no credits`,
        };
      }

      const description = String(args.description);
      const count = Math.min(Number(args.count) || 3, 5);
      const orientation = args.orientation ? String(args.orientation) : "horizontal";

      try {
        const result = await findStockImages(description, count, orientation);

        if (result.success && result.images && result.images.length > 0) {
          await storage.createAgentAction({
            userId, agentType,
            actionType: "stock_image_found",
            description: `📷 ${result.images.length} stock image(s) found: "${description}"`,
            metadata: { description, count, orientation, images: result.images },
          });

          const imageList = result.images.map((img, i) =>
            `${i + 1}. ![${img.alt}](${img.url})`
          ).join("\n\n");

          return {
            result: `Found ${result.images.length} stock image(s) for "${description}" (1 credit used):\n\n${imageList}\n\nThese are professional-quality images ready for use in your social media content.`,
            actionType: "stock_image_found",
            actionDescription: `📷 ${result.images.length} stock image(s) found`,
          };
        }

        await storage.addImageCredits(userId, 1);
        return {
          result: `Could not find stock images for "${description}": ${result.error || "No results"}. Your credit has been refunded. Try a different search description.`,
          actionType: "stock_search_failed",
          actionDescription: `❌ Stock image search failed (credit refunded)`,
        };
      } catch (err: any) {
        await storage.addImageCredits(userId, 1);
        return {
          result: `Stock image search encountered an error. Your credit has been refunded. Please try again later.`,
          actionType: "stock_search_failed",
          actionDescription: `❌ Stock image search error (credit refunded)`,
        };
      }
    }

    case "list_connected_accounts": {
      const accounts = await storage.getSocialAccounts(userId);
      await storage.createAgentAction({
        userId, agentType, actionType: "social_accounts_checked",
        description: `Checked connected social media accounts — ${accounts.length} found`,
        metadata: { count: accounts.length, platforms: accounts.map(a => a.platform) },
      });
      if (accounts.length === 0) {
        return {
          result: "No social media accounts are connected yet. The user should go to **Settings > Social Media Accounts** to connect their Instagram, Twitter/X, LinkedIn, Facebook, TikTok, or YouTube accounts. Once connected, you can create content tailored to their specific profiles and audiences.",
          actionType: "social_accounts_checked",
          actionDescription: "📱 No social accounts connected",
        };
      }
      const allPlatforms = ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"];
      const connectedPlatforms = accounts.map(a => a.platform);
      const missingPlatforms = allPlatforms.filter(p => !connectedPlatforms.includes(p));
      const accountList = accounts.map(a =>
        `- **${a.platform.charAt(0).toUpperCase() + a.platform.slice(1)}**: @${a.username}${a.profileUrl ? ` (${a.profileUrl})` : ""} — ${a.status}`
      ).join("\n");
      let suggestion = "";
      if (missingPlatforms.length > 0) {
        suggestion = `\n\nNot yet connected: ${missingPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}. The user can add these in Settings > Social Media Accounts.`;
      }
      return {
        result: `📱 **Connected Social Media Accounts** (${accounts.length}):\n\n${accountList}${suggestion}`,
        actionType: "social_accounts_checked",
        actionDescription: `📱 ${accounts.length} social accounts connected`,
      };
    }

    case "list_shipping_providers": {
      const providers = await storage.getShippingProviders(userId);
      await storage.createAgentAction({
        userId, agentType, actionType: "shipping_providers_checked",
        description: `Checked connected shipping providers — ${providers.length} found`,
        metadata: { count: providers.length, providers: providers.map(p => p.provider) },
      });
      const providerNames: Record<string, string> = {
        aras: "Aras Kargo", yurtici: "Yurtiçi Kargo", mng: "MNG Kargo",
        surat: "Sürat Kargo", ptt: "PTT Kargo", ups: "UPS", fedex: "FedEx", dhl: "DHL"
      };
      if (providers.length === 0) {
        return {
          result: "No shipping/cargo providers are connected yet. The user should go to **Settings > Shipping Providers** to connect their cargo API. Supported providers: Aras Kargo, Yurtiçi Kargo, MNG Kargo, Sürat Kargo, PTT Kargo, UPS, FedEx, DHL.",
          actionType: "shipping_providers_checked",
          actionDescription: "📦 No shipping providers connected",
        };
      }
      const providerList = providers.map(p =>
        `- **${providerNames[p.provider] || p.provider}** — Status: ${p.status}`
      ).join("\n");
      const allProviders = ["aras", "yurtici", "mng", "surat", "ptt", "ups", "fedex", "dhl"];
      const connectedProviders = providers.map(p => p.provider);
      const missing = allProviders.filter(p => !connectedProviders.includes(p));
      let suggestion = "";
      if (missing.length > 0) {
        suggestion = `\n\nOther available providers: ${missing.map(p => providerNames[p] || p).join(", ")}. Add them in Settings > Shipping Providers.`;
      }
      return {
        result: `📦 **Connected Shipping Providers** (${providers.length}):\n\n${providerList}${suggestion}`,
        actionType: "shipping_providers_checked",
        actionDescription: `📦 ${providers.length} shipping providers connected`,
      };
    }

    case "create_post": {
      const platform = String(args.platform);
      const topic = String(args.topic);
      const tone = args.tone ? String(args.tone) : "professional";
      const includeHashtags = args.include_hashtags !== false;

      const platformLimits: Record<string, number> = { twitter: 280, instagram: 2200, linkedin: 3000, facebook: 5000, tiktok: 2200 };
      const charLimit = platformLimits[platform] || 2200;

      const platformEmojis: Record<string, string> = { instagram: "📸", twitter: "🐦", linkedin: "💼", facebook: "📘", tiktok: "🎵" };
      const emoji = platformEmojis[platform] || "📱";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "post_created",
        description: `${emoji} ${platform} post drafted about "${topic}" (${tone} tone)`,
        metadata: { platform, topic, tone, includeHashtags },
      });

      return {
        result: `I've drafted a ${platform} post about "${topic}" in a ${tone} tone. Here's the content:\n\n[${platform.toUpperCase()} POST — ${charLimit} char limit]\n\nTopic: ${topic}\nTone: ${tone}\n${includeHashtags ? "Hashtags: included" : "Hashtags: excluded"}\n\nPlease note: I've prepared the structure. The AI will generate the actual creative content in my response.`,
        actionType: "post_created",
        actionDescription: `${emoji} ${platform} post: "${topic}"`,
      };
    }

    case "create_content_calendar": {
      const days = Math.min(Math.max(Number(args.days) || 7, 1), 30);
      const platforms = args.platforms ? String(args.platforms) : "instagram,twitter,linkedin";
      const theme = String(args.theme);

      await storage.createAgentAction({
        userId, agentType,
        actionType: "content_calendar_created",
        description: `📅 ${days}-day content calendar created for "${theme}" on ${platforms}`,
        metadata: { days, platforms, theme },
      });

      return {
        result: `Content calendar created!\n\nTheme: ${theme}\nDuration: ${days} days\nPlatforms: ${platforms}\n\nI'll outline the posting schedule with specific post ideas for each day and platform.`,
        actionType: "content_calendar_created",
        actionDescription: `📅 ${days}-day content calendar: "${theme}"`,
      };
    }

    case "generate_hashtags": {
      const topic = String(args.topic);
      const platform = args.platform ? String(args.platform) : "instagram";
      const count = Math.min(Number(args.count) || 10, 30);

      await storage.createAgentAction({
        userId, agentType,
        actionType: "hashtags_generated",
        description: `#️⃣ ${count} hashtags generated for "${topic}" on ${platform}`,
        metadata: { topic, platform, count },
      });

      return {
        result: `Generating ${count} optimized hashtags for "${topic}" on ${platform}.\n\nI'll provide a mix of high-volume, medium, and niche hashtags for maximum reach.`,
        actionType: "hashtags_generated",
        actionDescription: `#️⃣ Hashtags for "${topic}" on ${platform}`,
      };
    }

    case "draft_response": {
      const originalMessage = String(args.original_message);
      const sentiment = args.sentiment ? String(args.sentiment) : "neutral";
      const platform = args.platform ? String(args.platform) : "general";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "response_drafted",
        description: `💬 Response drafted for ${sentiment} ${platform} comment`,
        metadata: { sentiment, platform, originalMessagePreview: originalMessage.substring(0, 100) },
      });

      return {
        result: `Drafting a professional response to this ${sentiment} comment on ${platform}.\n\nOriginal: "${originalMessage.substring(0, 200)}${originalMessage.length > 200 ? "..." : ""}"\n\nI'll craft an appropriate, brand-aligned response.`,
        actionType: "response_drafted",
        actionDescription: `💬 ${sentiment} comment response drafted (${platform})`,
      };
    }

    case "publish_post": {
      const platform = String(args.platform);
      const content = String(args.content);
      const hashtags = args.hashtags ? String(args.hashtags) : "";
      const imageUrl = args.image_url ? String(args.image_url) : undefined;

      const accounts = await storage.getSocialAccounts(userId);
      const account = accounts.find(a => a.platform === platform);

      if (!account) {
        return {
          result: `No ${platform} account is connected. Please go to **Settings > Social Media Accounts** to connect your ${platform} account first.`,
          actionType: "publish_failed",
          actionDescription: `❌ No ${platform} account connected`,
        };
      }

      if (account.accountType === "personal") {
        return {
          result: `Your ${platform} account (@${account.username}) is a personal account. Personal accounts don't support API auto-posting. I'll prepare the content for manual sharing instead — use the prepare_post_for_manual_sharing tool.`,
          actionType: "publish_redirect",
          actionDescription: `ℹ️ ${platform} is personal — use manual sharing`,
        };
      }

      const { publishToSocialMedia } = await import("./socialPostingService");
      const fullContent = hashtags ? `${content}\n\n${hashtags}` : content;
      const result = await publishToSocialMedia(account, fullContent, imageUrl);

      if (result.success) {
        await storage.createAgentAction({
          userId, agentType,
          actionType: "post_published",
          description: `🚀 Post published to ${platform} @${account.username}`,
          metadata: { platform, postId: result.postId, postUrl: result.postUrl },
        });

        return {
          result: `✅ **Post published successfully!**\n\n📱 Platform: ${platform}\n👤 Account: @${account.username}\n🔗 Post URL: ${result.postUrl || "View on platform"}\n\nYour post is now live!`,
          actionType: "post_published",
          actionDescription: `🚀 Published to ${platform} @${account.username}`,
        };
      }

      return {
        result: `❌ **Publishing failed**: ${result.error}\n\nPlease check your API credentials in Settings > Social Media Accounts. If the issue persists, I can prepare the content for manual sharing.`,
        actionType: "publish_failed",
        actionDescription: `❌ ${platform} publish failed`,
      };
    }

    case "prepare_post_for_manual_sharing": {
      const platform = String(args.platform);
      const content = String(args.content);
      const hashtags = args.hashtags ? String(args.hashtags) : "";
      const imageUrl = args.image_url ? String(args.image_url) : "";

      const deepLinks: Record<string, string> = {
        instagram: "instagram://app",
        twitter: "twitter://post",
        tiktok: "tiktok://",
        facebook: "fb://",
        linkedin: "linkedin://",
        youtube: "youtube://",
      };

      const webLinks: Record<string, string> = {
        instagram: "https://instagram.com",
        twitter: "https://twitter.com/compose/tweet",
        tiktok: "https://tiktok.com/upload",
        facebook: "https://facebook.com",
        linkedin: "https://linkedin.com/feed",
        youtube: "https://studio.youtube.com",
      };

      await storage.createAgentAction({
        userId, agentType,
        actionType: "manual_post_prepared",
        description: `📋 Manual sharing content prepared for ${platform}`,
        metadata: { platform, contentPreview: content.substring(0, 100) },
      });

      const publishAssistantData = JSON.stringify({
        type: "publish_assistant",
        platform,
        content,
        hashtags,
        imageUrl,
        deepLink: deepLinks[platform] || "",
        webLink: webLinks[platform] || "",
      });

      return {
        result: `📋 **Publish Assistant Ready!**\n\n<!--PUBLISH_ASSISTANT:${publishAssistantData}:END_PUBLISH_ASSISTANT-->\n\nI've prepared your ${platform} post content. Use the card above to:\n1. 📥 Download the image (if included)\n2. 📋 Copy the caption to clipboard\n3. #️⃣ Copy hashtags separately\n4. 📱 Open ${platform} app\n5. ✅ Paste and share!`,
        actionType: "manual_post_prepared",
        actionDescription: `📋 ${platform} manual sharing ready`,
      };
    }

    case "schedule_post": {
      const platform = String(args.platform);
      const content = String(args.content);
      const hashtags = args.hashtags ? String(args.hashtags) : "";
      const imageUrl = args.image_url ? String(args.image_url) : null;
      const scheduledDate = new Date(String(args.scheduled_date));

      if (isNaN(scheduledDate.getTime())) {
        return {
          result: "Invalid date format. Please provide a valid ISO 8601 date (e.g., '2025-01-15T14:00:00Z').",
          actionType: "schedule_failed",
          actionDescription: "❌ Invalid schedule date",
        };
      }

      if (scheduledDate <= new Date()) {
        return {
          result: "The scheduled time must be in the future. Please provide a future date/time.",
          actionType: "schedule_failed",
          actionDescription: "❌ Schedule date is in the past",
        };
      }

      const accounts = await storage.getSocialAccounts(userId);
      const account = accounts.find(a => a.platform === platform);

      if (!account) {
        return {
          result: `No ${platform} account is connected. Please go to **Settings > Social Media Accounts** to connect your account first.`,
          actionType: "schedule_failed",
          actionDescription: `❌ No ${platform} account connected`,
        };
      }

      const scheduledPost = await storage.createScheduledPost({
        userId,
        platform,
        accountId: account.id,
        content,
        hashtags: hashtags || null,
        imageUrl,
        scheduledAt: scheduledDate,
        status: "pending",
        publishedAt: null,
        errorMessage: null,
      });

      const autoPublish = account.accountType === "business";
      const dateStr = scheduledDate.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

      await storage.createAgentAction({
        userId, agentType,
        actionType: "post_scheduled",
        description: `⏰ Post scheduled for ${platform} on ${dateStr}`,
        metadata: { postId: scheduledPost.id, platform, scheduledAt: scheduledDate.toISOString(), autoPublish },
      });

      return {
        result: `⏰ **Post Scheduled!** (ID: #${scheduledPost.id})\n\n📱 Platform: ${platform}\n👤 Account: @${account.username}\n📅 Scheduled: ${dateStr}\n${autoPublish ? "🤖 Mode: Auto-publish (API)" : "🔔 Mode: Reminder notification (personal account)"}\n\n${autoPublish ? "The post will be automatically published at the scheduled time." : "You'll receive a reminder notification when it's time to post. The content will be ready for you to copy and share."}`,
        actionType: "post_scheduled",
        actionDescription: `⏰ Scheduled for ${platform} — ${dateStr}`,
      };
    }

    case "list_scheduled_posts": {
      const posts = await storage.getScheduledPosts(userId);

      if (posts.length === 0) {
        return {
          result: "No scheduled posts found. You can schedule posts by telling me when you'd like to publish content.",
          actionType: "scheduled_posts_listed",
          actionDescription: "📋 No scheduled posts",
        };
      }

      const statusEmojis: Record<string, string> = {
        pending: "⏳", published: "✅", failed: "❌", cancelled: "🚫", reminder_sent: "🔔",
      };

      const postList = posts.map(p => {
        const date = new Date(p.scheduledAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
        const emoji = statusEmojis[p.status] || "❓";
        return `${emoji} **#${p.id}** — ${p.platform} | ${date} | ${p.status}\n   "${p.content.substring(0, 80)}${p.content.length > 80 ? "..." : ""}"`;
      }).join("\n\n");

      return {
        result: `📋 **Scheduled Posts** (${posts.length}):\n\n${postList}`,
        actionType: "scheduled_posts_listed",
        actionDescription: `📋 ${posts.length} scheduled posts`,
      };
    }

    case "cancel_scheduled_post": {
      const postId = Number(args.post_id);
      if (!postId || isNaN(postId)) {
        return {
          result: "Please provide a valid post ID. You can use the list_scheduled_posts tool to see all posts.",
          actionType: "cancel_failed",
          actionDescription: "❌ Invalid post ID",
        };
      }

      const cancelled = await storage.cancelScheduledPost(postId, userId);

      if (!cancelled) {
        return {
          result: `Could not cancel post #${postId}. It may not exist, not belong to you, or already be published/cancelled.`,
          actionType: "cancel_failed",
          actionDescription: `❌ Could not cancel post #${postId}`,
        };
      }

      await storage.createAgentAction({
        userId, agentType,
        actionType: "post_cancelled",
        description: `🚫 Scheduled post #${postId} cancelled`,
        metadata: { postId },
      });

      return {
        result: `🚫 Scheduled post **#${postId}** has been cancelled successfully.`,
        actionType: "post_cancelled",
        actionDescription: `🚫 Post #${postId} cancelled`,
      };
    }

    case "create_invoice": {
      const clientName = String(args.client_name);
      const clientEmail = args.client_email ? String(args.client_email) : null;
      const dueDays = Number(args.due_days) || 30;
      const notes = args.notes ? String(args.notes) : null;

      const itemsRaw = String(args.items);
      const parsedItems = itemsRaw.split(";").map(item => {
        const parts = item.trim().split("|");
        return {
          description: parts[0]?.trim() || "Item",
          quantity: Number(parts[1]?.trim()) || 1,
          price: Number(parts[2]?.trim()) || 0,
        };
      });

      const subtotal = parsedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const itemLines = parsedItems.map(item =>
        `  ${item.description} × ${item.quantity} = $${(item.quantity * item.price).toFixed(2)}`
      ).join("\n");

      await storage.createAgentAction({
        userId, agentType,
        actionType: "invoice_created",
        description: `🧾 Invoice ${invoiceNumber} created for ${clientName} — $${subtotal.toFixed(2)}`,
        metadata: { invoiceNumber, clientName, clientEmail, subtotal, items: parsedItems, dueDays, notes },
      });

      if (clientEmail) {
        await sendEmail({
          userId,
          to: clientEmail,
          subject: `Invoice ${invoiceNumber} from your business`,
          body: `Dear ${clientName},\n\nPlease find your invoice below:\n\nInvoice #: ${invoiceNumber}\nItems:\n${itemLines}\n\nSubtotal: $${subtotal.toFixed(2)}\nDue: ${dueDays} days\n\n${notes ? `Notes: ${notes}\n\n` : ""}Thank you for your business.`,
          agentType,
        });
      }

      return {
        result: `Invoice ${invoiceNumber} created!\n\nClient: ${clientName}${clientEmail ? `\nEmail: ${clientEmail} (invoice sent)` : ""}\n\nItems:\n${itemLines}\n\nSubtotal: $${subtotal.toFixed(2)}\nDue: Net ${dueDays}${notes ? `\nNotes: ${notes}` : ""}`,
        actionType: "invoice_created",
        actionDescription: `🧾 Invoice ${invoiceNumber}: $${subtotal.toFixed(2)} for ${clientName}`,
      };
    }

    case "log_expense": {
      const description = String(args.description);
      const amount = Number(args.amount);
      const category = String(args.category);
      const date = args.date ? String(args.date) : new Date().toISOString().split("T")[0];
      const vendor = args.vendor ? String(args.vendor) : null;

      const expenseId = `EXP-${Date.now().toString(36).toUpperCase()}`;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "expense_logged",
        description: `💸 Expense logged: $${amount.toFixed(2)} — ${description} [${category}]`,
        metadata: { expenseId, description, amount, category, date, vendor },
      });

      return {
        result: `Expense ${expenseId} logged!\n\nDescription: ${description}\nAmount: $${amount.toFixed(2)}\nCategory: ${category}\nDate: ${date}${vendor ? `\nVendor: ${vendor}` : ""}`,
        actionType: "expense_logged",
        actionDescription: `💸 Expense: $${amount.toFixed(2)} — ${description}`,
      };
    }

    case "financial_summary": {
      const period = args.period ? String(args.period) : "month";
      const periodDays: Record<string, number> = { week: 7, month: 30, quarter: 90, year: 365 };
      const days = periodDays[period] || 30;

      const allActions = await storage.getActionsByUser(userId);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const periodActions = allActions.filter(a => new Date(a.createdAt).getTime() >= cutoff);

      const invoices = periodActions.filter(a => a.actionType === "invoice_created");
      const expenses = periodActions.filter(a => a.actionType === "expense_logged");

      const totalInvoiced = invoices.reduce((sum, a) => {
        const meta = a.metadata as Record<string, unknown>;
        return sum + (Number(meta?.subtotal) || 0);
      }, 0);

      const totalExpenses = expenses.reduce((sum, a) => {
        const meta = a.metadata as Record<string, unknown>;
        return sum + (Number(meta?.amount) || 0);
      }, 0);

      const categoryCounts: Record<string, number> = {};
      for (const e of expenses) {
        const meta = e.metadata as Record<string, unknown>;
        const cat = String(meta?.category || "other");
        categoryCounts[cat] = (categoryCounts[cat] || 0) + (Number(meta?.amount) || 0);
      }

      const categoryReport = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `  ${k}: $${v.toFixed(2)}`)
        .join("\n");

      await storage.createAgentAction({
        userId, agentType,
        actionType: "financial_summary",
        description: `📊 ${period} financial summary generated`,
        metadata: { period, totalInvoiced, totalExpenses, invoiceCount: invoices.length, expenseCount: expenses.length },
      });

      return {
        result: `📊 FINANCIAL SUMMARY (${period})\n\n💰 Revenue (Invoiced): $${totalInvoiced.toFixed(2)} (${invoices.length} invoices)\n💸 Expenses: $${totalExpenses.toFixed(2)} (${expenses.length} entries)\n📈 Net: $${(totalInvoiced - totalExpenses).toFixed(2)}\n\n${categoryReport ? `Expense Categories:\n${categoryReport}` : "No expenses logged this period."}`,
        actionType: "financial_summary",
        actionDescription: `📊 ${period} financial summary`,
      };
    }

    case "create_job_posting": {
      const title = String(args.title);
      const dept = args.department ? String(args.department) : "General";
      const type = args.type ? String(args.type) : "full-time";
      const description = String(args.description);
      const requirements = args.requirements ? String(args.requirements) : "";
      const salaryRange = args.salary_range ? String(args.salary_range) : null;

      const postingId = `JOB-${Date.now().toString(36).toUpperCase()}`;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "job_posting_created",
        description: `📋 Job posting created: ${title} (${dept}, ${type})`,
        metadata: { postingId, title, department: dept, type, description, requirements, salaryRange },
      });

      return {
        result: `Job posting ${postingId} created!\n\n📋 ${title}\nDepartment: ${dept}\nType: ${type}${salaryRange ? `\nSalary: ${salaryRange}` : ""}\n\nDescription: ${description}\n${requirements ? `\nRequirements: ${requirements}` : ""}\n\nI'll format this as a professional job posting.`,
        actionType: "job_posting_created",
        actionDescription: `📋 Job posting: ${title} (${type})`,
      };
    }

    case "screen_resume": {
      const candidateInfo = String(args.candidate_info);
      const jobRequirements = String(args.job_requirements);
      const jobTitle = args.job_title ? String(args.job_title) : "the position";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "resume_screened",
        description: `📄 Resume screened for ${jobTitle}`,
        metadata: { jobTitle, requirementsPreview: jobRequirements.substring(0, 200), candidatePreview: candidateInfo.substring(0, 200) },
      });

      return {
        result: `Screening candidate for: ${jobTitle}\n\nJob Requirements: ${jobRequirements}\n\nCandidate Profile: ${candidateInfo.substring(0, 500)}${candidateInfo.length > 500 ? "..." : ""}\n\nI'll provide a detailed fit analysis with scoring and recommendations.`,
        actionType: "resume_screened",
        actionDescription: `📄 Resume screened for ${jobTitle}`,
      };
    }

    case "create_interview_kit": {
      const jobTitle = String(args.job_title);
      const focusAreas = args.focus_areas ? String(args.focus_areas) : "general,problem-solving,culture-fit";
      const level = args.experience_level ? String(args.experience_level) : "mid";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "interview_kit_created",
        description: `🎯 Interview kit created for ${jobTitle} (${level} level)`,
        metadata: { jobTitle, focusAreas, level },
      });

      return {
        result: `Interview kit for: ${jobTitle} (${level} level)\n\nFocus Areas: ${focusAreas}\n\nI'll generate behavioral, technical, and situational questions tailored to this role and level.`,
        actionType: "interview_kit_created",
        actionDescription: `🎯 Interview kit: ${jobTitle} (${level})`,
      };
    }

    case "send_candidate_email": {
      const emailResult = await sendEmail({
        userId,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        agentType,
      });

      if (emailResult.success) {
        await storage.createAgentAction({
          userId, agentType,
          actionType: "candidate_email_sent",
          description: `📧 Candidate email sent to ${args.to}: "${args.subject}"`,
          metadata: { to: args.to, subject: args.subject },
        });
      }

      return {
        result: emailResult.success
          ? `Email sent to candidate at ${args.to}: "${args.subject}"`
          : `Failed to send email: ${emailResult.message}`,
        actionType: emailResult.success ? "candidate_email_sent" : "email_failed",
        actionDescription: emailResult.success
          ? `📧 Candidate email sent to ${args.to}`
          : `❌ Email failed to ${args.to}`,
      };
    }

    case "optimize_listing": {
      const productName = String(args.product_name);
      const category = args.category ? String(args.category) : "General";
      const features = String(args.features);
      const targetAudience = args.target_audience ? String(args.target_audience) : "general consumers";
      const platform = args.platform ? String(args.platform) : "general";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "listing_optimized",
        description: `🏷️ Product listing optimized: "${productName}" for ${platform}`,
        metadata: { productName, category, features, targetAudience, platform },
      });

      return {
        result: `Optimizing listing for "${productName}" on ${platform}.\n\nCategory: ${category}\nFeatures: ${features}\nTarget: ${targetAudience}\n\nI'll generate an SEO-optimized title, bullet points, description, and keywords.`,
        actionType: "listing_optimized",
        actionDescription: `🏷️ Listing optimized: "${productName}" (${platform})`,
      };
    }

    case "price_analysis": {
      const productName = String(args.product_name);
      const costPrice = Number(args.cost_price);
      const currentPrice = args.current_price ? Number(args.current_price) : null;
      const competitorPrices = args.competitor_prices ? String(args.competitor_prices).split(",").map(p => Number(p.trim())) : [];
      const targetMargin = args.target_margin ? Number(args.target_margin) : 40;

      const suggestedPrice = costPrice / (1 - targetMargin / 100);
      const avgCompetitor = competitorPrices.length > 0 ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length : null;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "price_analysis",
        description: `💲 Price analysis: "${productName}" — cost $${costPrice.toFixed(2)}, suggested $${suggestedPrice.toFixed(2)}`,
        metadata: { productName, costPrice, currentPrice, competitorPrices, targetMargin, suggestedPrice, avgCompetitor },
      });

      return {
        result: `💲 PRICE ANALYSIS: ${productName}\n\nCost: $${costPrice.toFixed(2)}${currentPrice ? `\nCurrent Price: $${currentPrice.toFixed(2)} (${((currentPrice - costPrice) / costPrice * 100).toFixed(1)}% markup)` : ""}\nTarget Margin: ${targetMargin}%\nSuggested Price: $${suggestedPrice.toFixed(2)}\n${avgCompetitor ? `\nCompetitor Avg: $${avgCompetitor.toFixed(2)}\nCompetitor Range: $${Math.min(...competitorPrices).toFixed(2)} — $${Math.max(...competitorPrices).toFixed(2)}` : ""}\n\nI'll provide detailed positioning recommendations.`,
        actionType: "price_analysis",
        actionDescription: `💲 Price analysis: "${productName}"`,
      };
    }

    case "draft_review_response": {
      const reviewText = String(args.review_text);
      const rating = Number(args.rating);
      const productName = args.product_name ? String(args.product_name) : "your product";

      const ratingEmoji = rating >= 4 ? "⭐" : rating >= 3 ? "😐" : "⚠️";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "review_response_drafted",
        description: `${ratingEmoji} Review response drafted for ${productName} (${rating}/5 stars)`,
        metadata: { rating, productName, reviewPreview: reviewText.substring(0, 200) },
      });

      return {
        result: `Drafting response to ${rating}/5 star review for "${productName}".\n\nReview: "${reviewText.substring(0, 300)}${reviewText.length > 300 ? "..." : ""}"\n\nI'll create an appropriate, professional response that ${rating >= 4 ? "thanks the customer and encourages loyalty" : rating >= 3 ? "acknowledges feedback and offers to improve" : "addresses concerns empathetically and offers resolution"}.`,
        actionType: "review_response_drafted",
        actionDescription: `${ratingEmoji} Review response: ${productName} (${rating}★)`,
      };
    }

    case "search_properties": {
      const city = String(args.city);
      const bedrooms = args.bedrooms ? Number(args.bedrooms) : null;
      const maxBudget = args.max_budget ? Number(args.max_budget) : null;
      const propertyType = args.property_type ? String(args.property_type) : "any";
      const preferences = args.preferences ? String(args.preferences) : "";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "property_search",
        description: `🏠 Property search: ${bedrooms || "Any"}BR in ${city}${maxBudget ? ` under $${maxBudget}/mo` : ""}`,
        metadata: { city, bedrooms, maxBudget, propertyType, preferences },
      });

      return {
        result: `🔍 PROPERTY SEARCH\n\nLocation: ${city}\nBedrooms: ${bedrooms || "Any"}\nBudget: ${maxBudget ? `$${maxBudget}/mo max` : "Open"}\nType: ${propertyType}\n${preferences ? `Preferences: ${preferences}\n` : ""}\nSearching major listing sites (Zillow, Apartments.com, Redfin, Craigslist) for matching properties. I'll present the best options grouped by value tier with addresses, prices, features, and direct links.`,
        actionType: "property_search",
        actionDescription: `🏠 Searching ${bedrooms || "any"}BR in ${city}`,
      };
    }

    case "evaluate_listing": {
      const address = String(args.address);
      const price = Number(args.price);
      const bedrooms = args.bedrooms ? Number(args.bedrooms) : null;
      const bathrooms = args.bathrooms ? Number(args.bathrooms) : null;
      const sqft = args.sqft ? Number(args.sqft) : null;
      const description = args.description ? String(args.description) : "";
      const source = args.source ? String(args.source) : "Unknown";

      const pricePerSqft = sqft ? (price / sqft).toFixed(2) : "N/A";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "listing_evaluated",
        description: `🔍 Listing evaluated: ${address} — $${price}/mo`,
        metadata: { address, price, bedrooms, bathrooms, sqft, source, pricePerSqft },
      });

      return {
        result: `🔍 LISTING EVALUATION\n\nAddress: ${address}\nPrice: $${price}/mo\n${bedrooms ? `Bedrooms: ${bedrooms}` : ""}${bathrooms ? ` | Bathrooms: ${bathrooms}` : ""}\n${sqft ? `Size: ${sqft} sq ft ($${pricePerSqft}/sq ft)\n` : ""}Source: ${source}\n\nI'll analyze this listing for:\n- Fair market value comparison\n- Scam indicators and red flags\n- Hidden costs assessment\n- Overall recommendation`,
        actionType: "listing_evaluated",
        actionDescription: `🔍 Evaluated: ${address} ($${price}/mo)`,
      };
    }

    case "neighborhood_analysis": {
      const neighborhood = String(args.neighborhood);
      const city = String(args.city);
      const priorities = args.priorities ? String(args.priorities) : "safety, transit, amenities";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "neighborhood_analyzed",
        description: `📍 Neighborhood analysis: ${neighborhood}, ${city}`,
        metadata: { neighborhood, city, priorities },
      });

      return {
        result: `📍 NEIGHBORHOOD ANALYSIS: ${neighborhood}, ${city}\n\nPriorities: ${priorities}\n\nAnalyzing:\n- Safety & crime statistics\n- Public transit access\n- Walkability score\n- Nearby amenities (grocery, restaurants, parks)\n- School ratings\n- Noise levels & livability\n- Average rents in the area\n- Pros and cons summary`,
        actionType: "neighborhood_analyzed",
        actionDescription: `📍 Analyzed: ${neighborhood}, ${city}`,
      };
    }

    case "create_listing": {
      const address = String(args.address);
      const propertyType = String(args.property_type);
      const bedrooms = Number(args.bedrooms);
      const bathrooms = args.bathrooms ? Number(args.bathrooms) : null;
      const sqft = args.sqft ? Number(args.sqft) : null;
      const features = args.features ? String(args.features) : "";
      const targetRent = args.target_rent ? Number(args.target_rent) : null;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "listing_created",
        description: `📝 Property listing created: ${bedrooms}BR ${propertyType} at ${address}`,
        metadata: { address, propertyType, bedrooms, bathrooms, sqft, features, targetRent },
      });

      return {
        result: `📝 PROPERTY LISTING DRAFT\n\nAddress: ${address}\nType: ${propertyType}\nBedrooms: ${bedrooms}${bathrooms ? ` | Bathrooms: ${bathrooms}` : ""}\n${sqft ? `Size: ${sqft} sq ft\n` : ""}${features ? `Features: ${features}\n` : ""}${targetRent ? `Target Rent: $${targetRent}/mo\n` : ""}\nI'll create a professional listing with:\n- Compelling headline and description\n- Feature highlights\n- Pricing recommendation based on market data\n- Photography and staging tips`,
        actionType: "listing_created",
        actionDescription: `📝 Listing created: ${address}`,
      };
    }

    case "lease_review": {
      const leaseTerms = String(args.lease_terms);
      const monthlyRent = args.monthly_rent ? Number(args.monthly_rent) : null;
      const deposit = args.deposit ? Number(args.deposit) : null;
      const leaseDuration = args.lease_duration ? String(args.lease_duration) : null;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "lease_reviewed",
        description: `📋 Lease review completed${monthlyRent ? ` — $${monthlyRent}/mo` : ""}`,
        metadata: { monthlyRent, deposit, leaseDuration, termsPreview: leaseTerms.substring(0, 300) },
      });

      return {
        result: `📋 LEASE REVIEW\n\n${monthlyRent ? `Rent: $${monthlyRent}/mo\n` : ""}${deposit ? `Deposit: $${deposit}\n` : ""}${leaseDuration ? `Duration: ${leaseDuration}\n` : ""}\nTerms provided: "${leaseTerms.substring(0, 500)}${leaseTerms.length > 500 ? "..." : ""}"\n\nI'll review for:\n- Unfavorable or unusual clauses\n- Hidden fees and penalties\n- Early termination conditions\n- Maintenance responsibilities\n- Red flags and recommendations\n\n⚠️ Note: This is guidance only, not legal advice. Consult an attorney for official lease review.`,
        actionType: "lease_reviewed",
        actionDescription: `📋 Lease reviewed${monthlyRent ? ` ($${monthlyRent}/mo)` : ""}`,
      };
    }

    case "market_report": {
      const city = String(args.city);
      const neighborhood = args.neighborhood ? String(args.neighborhood) : null;
      const propertyType = args.property_type ? String(args.property_type) : "all";

      await storage.createAgentAction({
        userId, agentType,
        actionType: "market_report",
        description: `📊 Market report generated: ${neighborhood ? `${neighborhood}, ` : ""}${city}`,
        metadata: { city, neighborhood, propertyType },
      });

      return {
        result: `📊 MARKET REPORT: ${neighborhood ? `${neighborhood}, ` : ""}${city}\n\nProperty Type: ${propertyType}\n\nGenerating report with:\n- Average rental prices by bedroom count\n- Price trends (3-month, 6-month, YoY)\n- Vacancy rates\n- Supply vs demand analysis\n- Seasonal patterns\n- Forecast and recommendations`,
        actionType: "market_report",
        actionDescription: `📊 Market report: ${city}`,
      };
    }

    case "calculate_costs": {
      const monthlyRent = Number(args.monthly_rent);
      const deposit = args.deposit ? Number(args.deposit) : monthlyRent;
      const city = args.city ? String(args.city) : "Unknown";
      const parking = args.parking ? Number(args.parking) : 0;
      const utilitiesIncluded = args.utilities_included === true;
      const petDeposit = args.pet_deposit ? Number(args.pet_deposit) : 0;

      const estimatedUtilities = utilitiesIncluded ? 0 : 150;
      const totalMonthly = monthlyRent + parking + estimatedUtilities;
      const moveInCost = monthlyRent + deposit + petDeposit;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "costs_calculated",
        description: `💰 Cost calculation: $${monthlyRent}/mo rent → $${totalMonthly}/mo total`,
        metadata: { monthlyRent, deposit, parking, utilitiesIncluded, petDeposit, totalMonthly, moveInCost, city },
      });

      return {
        result: `💰 COST CALCULATION\n\n**Move-In Costs:**\nFirst Month: $${monthlyRent}\nDeposit: $${deposit}\n${petDeposit ? `Pet Deposit: $${petDeposit}\n` : ""}Total Move-In: $${moveInCost}\n\n**Monthly Costs:**\nRent: $${monthlyRent}\n${parking ? `Parking: $${parking}\n` : ""}Utilities: ${utilitiesIncluded ? "Included" : `~$${estimatedUtilities} (estimated for ${city})`}\n**Total Monthly: $${totalMonthly}**\n\n**Annual Cost: $${(totalMonthly * 12).toLocaleString()}**\n\nI'll provide a detailed breakdown with area-specific utility estimates and additional cost considerations.`,
        actionType: "costs_calculated",
        actionDescription: `💰 Costs: $${totalMonthly}/mo total (${city})`,
      };
    }

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}
