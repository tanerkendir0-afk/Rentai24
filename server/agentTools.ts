import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { LEAD_SOURCE_VALUES, CUSTOMER_SEGMENT_VALUES, DEAL_STAGE_VALUES, ACTIVITY_TYPE_VALUES, type LeadSourceValue, type CustomerSegmentValue, type DealStageValue, type ActivityTypeValue } from "@shared/schema";
import { sendEmail } from "./emailService";
import { scheduleFollowup } from "./followupScheduler";
import { createCalendarEvent } from "./calendarService";
import { getTemplate, fillTemplate, listTemplates, DRIP_SEQUENCES } from "./emailTemplates";
import type { SupportedLang } from "./i18n";
import { generateAIImage, findStockImages } from "./imageService";
import { isUserGmailReady, listInbox, readEmail, replyToEmail } from "./gmailService";
import { computeLeadScore } from "./leadScoring";
import { realWebSearch, fetchWebPage, analyzeCompany, findLeads } from "./services/webSearchService";
import { generateInvoicePDF } from "./services/invoiceGenerator";
import { generateInvoiceExcel } from "./services/invoiceExcelGenerator";
import { generateMizan, generateBordro, generateGelirTablosu, generateKdvOzet, generateBilanco } from "./services/reportGenerator";
import { hesaplaKDV, hesaplaBordro, hesaplaAmortisman, hesaplaKurDegerlemesi, hesaplaStopaj, formatYevmiyeKaydi, yevmiyeToMarkdown, formatTL } from "./services/calculationService";
import { handleGeneratePdf } from "./services/pdfBrandingService";
import { parseCVText, calculateMatchScore } from "./services/cvParserService";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { invoices, invoiceItems } from "@shared/schema";
import type { UserBranding } from "@shared/schema";
import { triggerAutomations } from "./n8n/agentBridge";

const aiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ProposalMetadata {
  leadId: number;
  leadName: string;
  company: string;
  proposalContent: string;
}

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

const whatsappTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "send_whatsapp",
      description: "Send a WhatsApp message to a customer or contact. Use when the user asks to message someone on WhatsApp, send a notification, follow up via WhatsApp, or contact a phone number.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient phone number (with country code, e.g. +905551234567)" },
          message: { type: "string", description: "Message content to send" },
        },
        required: ["to", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_whatsapp_template",
      description: "Send a pre-approved WhatsApp template message. Use for sending notifications outside the 24-hour window (e.g., appointment reminders, order updates, payment confirmations).",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient phone number (with country code)" },
          template_name: { type: "string", description: "Name of the approved WhatsApp template" },
          language_code: { type: "string", description: "Template language code (default: en)" },
          parameters: {
            type: "array",
            items: { type: "object", properties: { type: { type: "string" }, text: { type: "string" } }, required: ["text"] },
            description: "Template parameters to fill in placeholders",
          },
        },
        required: ["to", "template_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_whatsapp_status",
      description: "Check if WhatsApp Business is connected and configured. Use when the user asks about WhatsApp connection or has issues sending messages.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const webSearchTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "web_search",
    description: "Search the internet for real-time information related to your task. Use this proactively when the user asks you to find, research, or look up anything — potential customers, market trends, competitors, properties, job candidates, industry data, local businesses, pricing info, etc. ALWAYS use this tool instead of saying 'I cannot search the internet'.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query — be specific and include location, industry, or other relevant context. Examples: 'Hatay restoran işletmeleri potansiyel müşteriler', 'Istanbul e-ticaret trendleri 2024', '2024 social media marketing trends'" },
        context: { type: "string", description: "Brief context about why you're searching — helps produce more relevant results. Example: 'Looking for potential B2B clients in food industry'" },
      },
      required: ["query"],
    },
  },
};

const generatePdfTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "generate_pdf",
    description: "Müşterinin kendi markasıyla PDF belgesi oluşturur (fatura, rapor, teklif). Türkçe karakter desteği var. PDF oluşturmadan 'ekte PDF var' gibi ifadeler KULLANMA. Önce bu tool'u çağır, sonra sonucu kullanıcıya bildir.",
    parameters: {
      type: "object",
      required: ["document_type", "data"],
      properties: {
        document_type: {
          type: "string",
          enum: ["invoice", "report", "proposal", "receipt"],
          description: "Belge tipi: invoice=fatura, report=rapor, proposal=teklif, receipt=makbuz",
        },
        data: {
          type: "object",
          description: "Belge verisi. Fatura için: invoice_no, date, due_date, seller{name,address,tax_office,tax_no,phone,email}, buyer{name,address,tax_office,tax_no}, items[{description,quantity,unit,unit_price,vat_rate,withholding_rate}], payment_terms, bank_info{bank_name,iban,account_holder}, notes, currency alanları. Rapor için: title, subtitle, author, date, sections[{heading, content, table{headers, rows}}].",
        },
        filename: {
          type: "string",
          description: "Dosya adı (örn: fatura_FTR-2026-001.pdf)",
        },
      },
    },
  },
};

const sendEmailWithAttachmentTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "send_email",
    description: "E-posta gönderir. generate_pdf ile oluşturulan PDF'i eklemek için pdf_ref alanına generate_pdf'den dönen pdf_ref değerini ver. Email body'sini HTML olarak gönder, markdown KULLANMA.",
    parameters: {
      type: "object",
      required: ["to", "subject", "body"],
      properties: {
        to: { type: "string", description: "Alıcı email adresi" },
        cc: { type: "string", description: "CC email adresi (opsiyonel)" },
        subject: { type: "string", description: "E-posta konusu" },
        body: { type: "string", description: "E-posta gövdesi (düz metin fallback)" },
        html_body: { type: "string", description: "HTML formatında e-posta gövdesi" },
        pdf_ref: { type: "number", description: "generate_pdf tool'undan dönen pdf_ref ID değeri. Bu verildiğinde PDF otomatik olarak ek dosya olarak eklenir." },
        attachments: {
          type: "array",
          description: "Manuel ek dosyalar listesi (pdf_ref kullanıyorsan bu alana gerek yok)",
          items: {
            type: "object",
            required: ["filename", "content_base64", "content_type"],
            properties: {
              filename: { type: "string", description: "Dosya adı (örn: fatura.pdf)" },
              content_base64: { type: "string", description: "Base64 encoded dosya içeriği" },
              content_type: { type: "string", description: "MIME tipi (örn: application/pdf)" },
            },
          },
        },
      },
    },
  },
};

export const salesSdrTools: OpenAI.ChatCompletionTool[] = [
  webSearchTool,
  ...gmailInboxTools,
  ...whatsappTools,
  sendEmailWithAttachmentTool,
  generatePdfTool,
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
      description: "List all leads in the CRM pipeline. Use this when the user asks about their pipeline, prospects, or lead list. Can filter by status or score (hot/warm/cold). When user asks 'show my hot leads' or 'which leads are hot', use score_filter='hot'.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"], description: "Optional: filter by status" },
          score_filter: { type: "string", enum: ["hot", "warm", "cold"], description: "Optional: filter by lead score (hot/warm/cold)" },
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
      description: "Send an email using a pre-built template to a specific lead. Templates: cold_outreach, follow_up, value_proposition, meeting_request, proposal. Each is automatically personalized with the lead's name and company. You can identify the lead by their ID, email address, or name.",
      parameters: {
        type: "object",
        properties: {
          template_id: { type: "string", enum: ["cold_outreach", "follow_up", "value_proposition", "meeting_request", "proposal"], description: "Template to use" },
          lead_id: { type: "number", description: "Lead ID to send the template to (use this or lead_email/lead_name)" },
          lead_email: { type: "string", description: "Lead's email address to find and send template to (alternative to lead_id)" },
          lead_name: { type: "string", description: "Lead's name to find and send template to (alternative to lead_id)" },
        },
        required: ["template_id"],
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
      description: "Generate a professional AI-written sales proposal. Can target a specific lead by ID, or generate for a company/industry. Use when the user asks to create, draft, or write a proposal.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "number", description: "Lead ID to create the proposal for (use this or company_name/industry)" },
          company_name: { type: "string", description: "Company name if no lead_id (e.g. 'Acme Corp')" },
          industry: { type: "string", description: "Industry context for the proposal (e.g. 'SaaS', 'Healthcare')" },
          custom_notes: { type: "string", description: "Optional custom notes or requirements to include in the proposal" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_proposal",
      description: "Send a previously created proposal to a lead via email. Fetches the latest stored proposal for the given lead and emails it. Use when the user says 'send the proposal to lead #5' or 'email the proposal'.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "number", description: "Lead ID whose proposal to send" },
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
  {
    type: "function",
    function: {
      name: "research_company",
      description: "Research a specific company by searching the web and analyzing their website. Determines if they are a potential buyer, seller, manufacturer, or service provider for your product. Use when you want to qualify a lead or learn about a company before reaching out.",
      parameters: {
        type: "object",
        properties: {
          company_name: { type: "string", description: "The company name to research" },
          website_url: { type: "string", description: "Optional: the company's website URL to analyze directly" },
          product_context: { type: "string", description: "The product/service you are selling, used to classify the company (e.g. 'galvanized wire', 'steel pipes', 'packaging materials')" },
        },
        required: ["company_name", "product_context"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_leads",
      description: "Intelligently search the web for potential B2B customers who USE/BUY your product (not who sell it). Automatically researches and qualifies companies, then adds qualifying leads to CRM. Use when the user asks to find new customers, leads, or buyers for their product.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string", description: "The product/raw material you are selling (e.g. 'galvanized wire', 'steel sheets', 'PVC pipes')" },
          industry: { type: "string", description: "Optional: target industry to focus on (e.g. 'construction', 'agriculture', 'automotive')" },
          location: { type: "string", description: "Optional: geographic location to focus on (e.g. 'Istanbul', 'Ankara', 'Marmara bölgesi')" },
          count: { type: "number", description: "Number of leads to find (default 5, max 10)" },
        },
        required: ["product"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_contacts",
      description: "Search and list contacts in the Rex CRM. Can filter by text query, segment (enterprise/mid/smb), source (website/referral/cold/event/ad/social/partner), or minimum lead score. Use when the user asks about contacts, customers, or wants to find someone in the CRM.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text search across company name, contact name, email, industry" },
          segment: { type: "string", enum: ["enterprise", "mid", "smb"], description: "Filter by customer segment" },
          source: { type: "string", enum: ["website", "referral", "cold", "event", "ad", "social", "partner"], description: "Filter by lead source" },
          min_score: { type: "number", description: "Minimum lead score to filter by" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Create a new contact in the Rex CRM. Use when the user mentions a new company/person to track, or when you find a potential lead.",
      parameters: {
        type: "object",
        properties: {
          company_name: { type: "string", description: "Company name" },
          contact_name: { type: "string", description: "Contact person's full name" },
          email: { type: "string", description: "Email address" },
          phone: { type: "string", description: "Phone number" },
          position: { type: "string", description: "Job title/position" },
          company_size: { type: "string", description: "Company size (e.g. '10-50', '50-200', '200-1000', '1000+')" },
          industry: { type: "string", description: "Industry/sector" },
          website: { type: "string", description: "Company website URL" },
          is_decision_maker: { type: "boolean", description: "Whether this person is a decision maker" },
          source: { type: "string", enum: ["website", "referral", "cold", "event", "ad", "social", "partner"], description: "How this lead was found" },
          segment: { type: "string", enum: ["enterprise", "mid", "smb"], description: "Customer segment" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
          notes: { type: "string", description: "Additional notes about this contact" },
        },
        required: ["company_name", "contact_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_deal",
      description: "Create a new deal/opportunity in the Rex CRM pipeline, linked to an existing contact. Use when the user wants to track a sales opportunity.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "The contact ID this deal belongs to" },
          title: { type: "string", description: "Deal title (e.g. 'Acme Corp - Enterprise Package')" },
          description: { type: "string", description: "Deal description" },
          value: { type: "number", description: "Deal value in TRY" },
          currency: { type: "string", description: "Currency code (default TRY)" },
          monthly_recurring: { type: "number", description: "Monthly recurring revenue if applicable" },
          stage: { type: "string", enum: ["new_lead", "contacted", "qualified", "proposal_sent", "negotiation", "closed_won", "closed_lost"], description: "Initial deal stage (default new_lead)" },
          expected_close: { type: "string", description: "Expected close date (YYYY-MM-DD)" },
          products: { type: "array", items: { type: "string" }, description: "Products/services in this deal" },
        },
        required: ["contact_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_deal_stage",
      description: "Move a deal to a new pipeline stage. Automatically logs stage history and updates probability. Use when the user says to move a deal forward, close it, or change its stage.",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "Deal ID to update" },
          stage: { type: "string", enum: ["new_lead", "contacted", "qualified", "proposal_sent", "negotiation", "closed_won", "closed_lost"], description: "New stage" },
          notes: { type: "string", description: "Notes about this stage change" },
        },
        required: ["deal_id", "stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Get a summary of the entire Rex CRM sales pipeline. Shows deal count and total value per stage. Use when the user asks about pipeline health, deal flow, or revenue forecast.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_activity",
      description: "Log a sales activity (email, call, meeting, note) against a contact. Use to track interactions and touchpoints.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "Contact ID this activity is for" },
          deal_id: { type: "string", description: "Optional deal ID to link this activity to" },
          type: { type: "string", enum: ["email_sent", "email_received", "call", "meeting", "note", "task"], description: "Activity type" },
          subject: { type: "string", description: "Activity subject/title" },
          body: { type: "string", description: "Activity details/notes" },
          duration_minutes: { type: "number", description: "Duration in minutes (for calls/meetings)" },
        },
        required: ["contact_id", "type", "subject"],
      },
    },
  },
];

export const customerSupportTools: OpenAI.ChatCompletionTool[] = [
  webSearchTool,
  ...gmailInboxTools,
  ...whatsappTools,
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
  webSearchTool,
  ...gmailInboxTools,
  ...whatsappTools,
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
  webSearchTool,
  ...whatsappTools,
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
  {
    type: "function",
    function: {
      name: "send_report_email",
      description: "Send a data analysis report, insights summary, or business intelligence findings via email. Use when the user asks to share or email a report.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body content (professional analytical tone)" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_uploaded_files",
      description: "Kullanıcının yüklediği dosyaları listeler. Her dosya için ad, boyut, satır sayısı, kolon adları gösterilir.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_file",
      description: "Yüklenen bir Excel veya CSV dosyasını analiz eder. Temel istatistikler (satır/kolon sayısı, min/max/ortalama, null değerler, dağılım) ve otomatik içgörüler üretir. Dosya yüklendikten sonra ilk çağrılması gereken tool budur.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "number", description: "Analiz edilecek dosyanın ID'si" },
          focus_columns: { type: "string", description: "Odaklanılacak kolonlar (virgülle ayrılmış, opsiyonel)" },
        },
        required: ["file_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_file_data",
      description: "Yüklenen dosya üzerinde sorgu çalıştırır — filtreleme, gruplama, toplama, sıralama. Örn: 'Şehir bazında toplam satış', 'Tutarı 1000₺ üstü kayıtlar'.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "number", description: "Dosya ID'si" },
          group_by: { type: "string", description: "Gruplama kolonu (örn: 'Şehir', 'Ay')" },
          aggregate_column: { type: "string", description: "Toplama yapılacak kolon (örn: 'Tutar')" },
          aggregate_function: { type: "string", enum: ["sum", "avg", "count", "min", "max"], description: "Toplama fonksiyonu" },
          filter_column: { type: "string", description: "Filtre kolonu" },
          filter_operator: { type: "string", enum: ["=", "!=", ">", "<", ">=", "<=", "contains", "starts_with"], description: "Filtre operatörü" },
          filter_value: { type: "string", description: "Filtre değeri" },
          sort_by: { type: "string", description: "Sıralama kolonu" },
          sort_order: { type: "string", enum: ["asc", "desc"], description: "Sıralama yönü" },
          limit: { type: "number", description: "Maksimum sonuç sayısı (varsayılan: 20)" },
        },
        required: ["file_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_chart",
      description: "Veriden grafik oluşturur. Bar, çizgi, pasta, dağılım grafikleri desteklenir. Grafik chat'te inline olarak görünür.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "number", description: "Veri kaynağı dosya ID'si" },
          chart_type: { type: "string", enum: ["bar", "line", "pie", "doughnut", "scatter", "area", "horizontal_bar"], description: "Grafik tipi" },
          x_column: { type: "string", description: "X ekseni kolonu" },
          y_column: { type: "string", description: "Y ekseni kolonu" },
          group_column: { type: "string", description: "Gruplama kolonu (opsiyonel)" },
          title: { type: "string", description: "Grafik başlığı" },
          aggregate: { type: "string", enum: ["sum", "avg", "count", "min", "max"], description: "Toplama fonksiyonu" },
        },
        required: ["file_id", "chart_type", "x_column", "y_column"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_columns",
      description: "İki kolon arasındaki ilişkiyi analiz eder — korelasyon hesaplar. İki sayısal kolon gerektirir.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "number", description: "Dosya ID'si" },
          column_1: { type: "string", description: "Birinci kolon" },
          column_2: { type: "string", description: "İkinci kolon" },
        },
        required: ["file_id", "column_1", "column_2"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_anomalies",
      description: "Veride anomali (outlier) tespiti yapar. Normal dağılımdan sapan değerleri bulur.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "number", description: "Dosya ID'si" },
          column: { type: "string", description: "Anomali aranacak kolon" },
          sensitivity: { type: "string", enum: ["low", "medium", "high"], description: "Hassasiyet seviyesi" },
        },
        required: ["file_id", "column"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trend_analysis",
      description: "Zaman serisi trend analizi yapar. Tarih kolonu bazında değişim trendini hesaplar.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "number", description: "Dosya ID'si" },
          date_column: { type: "string", description: "Tarih kolonu" },
          value_column: { type: "string", description: "Değer kolonu" },
          period: { type: "string", enum: ["daily", "weekly", "monthly", "quarterly", "yearly"], description: "Periyot" },
        },
        required: ["file_id", "date_column", "value_column"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_analysis_report",
      description: "Kapsamlı analiz raporu oluşturur — tüm istatistikler ve içgörüler PDF olarak. generate_pdf tool'unu kullanarak profesyonel rapor üretir.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "number", description: "Veri kaynağı dosya ID'si" },
          report_title: { type: "string", description: "Rapor başlığı" },
          sections: { type: "string", description: "Bölümler: summary, statistics, charts, anomalies, trends, recommendations" },
        },
        required: ["file_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "export_filtered_data",
      description: "Filtrelenmiş veya dönüştürülmüş veriyi yeni Excel/CSV dosyası olarak dışa aktarır.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "number", description: "Kaynak dosya ID'si" },
          format: { type: "string", enum: ["xlsx", "csv"], description: "Çıktı formatı" },
          filename: { type: "string", description: "Çıktı dosya adı" },
          filter_column: { type: "string", description: "Filtre kolonu" },
          filter_operator: { type: "string", enum: ["=", "!=", ">", "<", ">=", "<=", "contains"], description: "Filtre operatörü" },
          filter_value: { type: "string", description: "Filtre değeri" },
          group_by: { type: "string", description: "Gruplama kolonu" },
          aggregate_column: { type: "string", description: "Toplama kolonu" },
          aggregate_function: { type: "string", enum: ["sum", "avg", "count"], description: "Toplama fonksiyonu" },
        },
        required: ["file_id"],
      },
    },
  },
];

export const socialMediaTools: OpenAI.ChatCompletionTool[] = [
  webSearchTool,
  ...whatsappTools,
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
  {
    type: "function",
    function: {
      name: "get_account_insights",
      description: "Fetch real-time statistics and insights from a connected social media account (followers, post count, engagement). Only works for Business/API accounts. For personal accounts, explains how to upgrade.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"], description: "Which platform to fetch insights for" },
          include_recent_posts: { type: "boolean", description: "Whether to include recent post performance data (default: false, only works for Instagram Business)" },
        },
        required: ["platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_special_days",
      description: "Get upcoming special days, holidays, and observances for a target country (default: Turkey). Returns official holidays, religious holidays (Ramazan/Kurban Bayramı), commercial days (Black Friday, Anneler Günü), and international days with content ideas for each. Use when the user asks about holidays, special days, what to post this month, or needs a content calendar.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "Month number (1-12)" },
          year: { type: "number", description: "Year (default: current year)" },
          country: { type: "string", enum: ["TR", "US"], description: "Target country code (default: TR)" },
        },
        required: ["month"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_monthly_program",
      description: "Create a comprehensive 30-day social media content program for a specific month. Integrates special days/holidays, suggests daily content types (carousel, reel, story, post), themes, and optimal posting times. Much more detailed than create_content_calendar.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "Month number (1-12)" },
          year: { type: "number", description: "Year (default: current year)" },
          platforms: { type: "string", description: "Comma-separated platforms (e.g. 'instagram,twitter')" },
          industry: { type: "string", description: "Business industry/niche (e.g. 'restaurant', 'fashion', 'tech', 'real estate')" },
          country: { type: "string", enum: ["TR", "US"], description: "Target country for special days (default: TR)" },
        },
        required: ["month"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_competitor",
      description: "Analyze a competitor's social media presence. Uses web search to research their profile, content strategy, posting frequency, hashtag usage, and provides differentiation recommendations.",
      parameters: {
        type: "object",
        properties: {
          competitor_handle: { type: "string", description: "Competitor's username/handle (e.g. '@competitor' or 'competitor')" },
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"], description: "Which platform to analyze" },
        },
        required: ["competitor_handle", "platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_best_posting_times",
      description: "Get the scientifically-backed best posting times for a specific platform and country. Returns optimal weekday and weekend time slots with engagement data.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"], description: "Target platform" },
          country: { type: "string", enum: ["TR", "US"], description: "Target country (default: TR)" },
        },
        required: ["platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "optimize_profile",
      description: "Analyze and suggest improvements for a social media profile/bio. Provides SEO-optimized bio suggestions, keyword recommendations, CTA ideas, and emoji usage tips. If a Business account is connected, reads the current bio automatically.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"], description: "Which platform's profile to optimize" },
          current_bio: { type: "string", description: "Current bio text (optional — will be auto-fetched for Business accounts)" },
          industry: { type: "string", description: "Business industry for targeted suggestions" },
        },
        required: ["platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_trending_topics",
      description: "Discover current trending topics and hashtags for a specific platform and country. Uses web search to find real-time trends and viral content ideas.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"], description: "Target platform" },
          country: { type: "string", enum: ["TR", "US"], description: "Target country (default: TR)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_campaign_email",
      description: "Send a marketing or campaign-related email — content calendars, performance reports, campaign briefs, or collaboration requests. Use when the user asks to email campaign details or social media reports.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body content (professional marketing tone)" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
];

export const bookkeepingTools: OpenAI.ChatCompletionTool[] = [
  webSearchTool,
  ...whatsappTools,
  ...gmailInboxTools,
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Profesyonel fatura oluşturur. KDV ve tevkifat hesaplaması yapar. Tüm tutarlar ₺ (TL) bazındadır.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Müşteri/firma adı" },
          client_email: { type: "string", description: "Müşteri e-posta adresi (fatura göndermek için)" },
          items: { type: "string", description: "Kalemler: 'Açıklama|Adet|Birim Fiyat|KDV%' noktalı virgülle ayrılır. KDV% opsiyonel (belirtilmezse kdv_rate kullanılır). Örn: 'Web Tasarım|1|5000|20;Kitap|5|100|1'" },
          kdv_rate: { type: "number", enum: [0, 1, 10, 20], description: "Varsayılan KDV oranı (kalem bazında belirtilmezse uygulanır): %0 (muaf), %1, %10, %20 (varsayılan: 20)" },
          tevkifat_rate: { type: "string", enum: ["none", "2/10", "4/10", "5/10", "7/10", "8/10", "9/10", "10/10"], description: "KDV tevkifat oranı (varsayılan: none — tevkifatsız)" },
          due_days: { type: "number", description: "Vade süresi gün olarak (varsayılan: 30)" },
          notes: { type: "string", description: "Fatura notları" },
          currency: { type: "string", enum: ["TRY", "USD", "EUR", "GBP"], description: "Para birimi (varsayılan: TRY). Döviz seçilirse TCMB satış kuru ile TL karşılığı otomatik hesaplanır (VUK md. 280)." },
        },
        required: ["client_name", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_expense",
      description: "İşletme gideri kaydeder. Tutar ₺ (TL) cinsindendir.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Gider açıklaması" },
          amount: { type: "number", description: "Gider tutarı (₺)" },
          category: { type: "string", enum: ["ofis", "yazilim", "seyahat", "pazarlama", "maas", "faturalar", "ekipman", "profesyonel_hizmet", "vergi", "kira", "sigorta", "diger"], description: "Gider kategorisi" },
          date: { type: "string", description: "Gider tarihi (YYYY-MM-DD, varsayılan: bugün)" },
          vendor: { type: "string", description: "Tedarikçi/satıcı adı" },
          kdv_amount: { type: "number", description: "KDV tutarı (varsa, ₺)" },
        },
        required: ["description", "amount", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_income",
      description: "Gelir kaydeder (satış, hizmet, kira vb.). Tutar ₺ (TL) cinsindendir.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Gelir açıklaması" },
          amount: { type: "number", description: "Gelir tutarı (₺)" },
          category: { type: "string", enum: ["satis", "hizmet", "kira", "faiz", "komisyon", "diger"], description: "Gelir kategorisi" },
          date: { type: "string", description: "Gelir tarihi (YYYY-MM-DD, varsayılan: bugün)" },
          client_name: { type: "string", description: "Müşteri/firma adı" },
          kdv_amount: { type: "number", description: "KDV tutarı (varsa, ₺)" },
        },
        required: ["description", "amount", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "financial_summary",
      description: "Finansal özet rapor oluşturur — gelirler, giderler, faturalar ve nakit akışı. Tüm tutarlar ₺ cinsindendir.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter", "year"], description: "Dönem (varsayılan: month)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_invoice_email",
      description: "Finansal e-posta gönderir — ödeme hatırlatmaları, fatura özetleri, gider raporları. Fatura veya mali belge e-postası istendiğinde kullan.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Alıcı e-posta adresi" },
          subject: { type: "string", description: "E-posta konusu" },
          body: { type: "string", description: "E-posta içeriği (profesyonel mali üslup)" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_exchange_rate",
      description: "TCMB (Merkez Bankası) günlük döviz kurlarını getirir. Döviz çevirme hesaplaması yapar. Her zaman TCMB kuru kullanılır (VUK md. 280).",
      parameters: {
        type: "object",
        properties: {
          currency: { type: "string", description: "Döviz kodu (USD, EUR, GBP vb.). Belirtilmezse tüm kurlar gösterilir." },
          amount: { type: "number", description: "Çevrilecek tutar (opsiyonel — belirtilirse TL karşılığı hesaplanır)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_receivable",
      description: "Alacak kaydı ekler (müşteriden alınacak tutar). Vadesi takip edilir.",
      parameters: {
        type: "object",
        properties: {
          entity_name: { type: "string", description: "Borçlu kişi/firma adı" },
          amount: { type: "number", description: "Alacak tutarı (₺)" },
          due_date: { type: "string", description: "Vade tarihi (YYYY-MM-DD)" },
          description: { type: "string", description: "Alacak açıklaması" },
          invoice_no: { type: "string", description: "İlgili fatura numarası (opsiyonel)" },
        },
        required: ["entity_name", "amount", "due_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_payable",
      description: "Borç kaydı ekler (tedarikçiye ödenecek tutar). Vadesi takip edilir.",
      parameters: {
        type: "object",
        properties: {
          entity_name: { type: "string", description: "Alacaklı kişi/firma adı" },
          amount: { type: "number", description: "Borç tutarı (₺)" },
          due_date: { type: "string", description: "Vade tarihi (YYYY-MM-DD)" },
          description: { type: "string", description: "Borç açıklaması" },
          invoice_no: { type: "string", description: "İlgili fatura numarası (opsiyonel)" },
        },
        required: ["entity_name", "amount", "due_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_debts",
      description: "Tüm borç ve alacakları listeler. Vadesi geçenleri vurgular.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["all", "receivable", "payable", "overdue"], description: "Filtre: tümü, alacaklar, borçlar veya vadesi geçenler (varsayılan: all)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cash_flow_forecast",
      description: "Nakit akış tahmini oluşturur. Gelir/gider trendleri ve borç/alacak vadelerine göre gelecek projeksiyonu yapar.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", enum: [30, 60, 90], description: "Projeksiyon süresi gün olarak (varsayılan: 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_balance_sheet",
      description: "Tekdüzen Hesap Planına uygun bilanço oluşturur (Excel dosyası). Varlık, borç ve özkaynak kalemlerini pipe-separated formatında gönder. Her kalem: HesapKodu|HesapAdı|Tutar şeklinde, kalemler noktalı virgülle ayrılır. Örnek: entries_aktif_donen='100|Kasa|150000;102|Bankalar|500000'",
      parameters: {
        type: "object",
        properties: {
          entries_aktif_donen: { type: "string", description: "Dönen varlıklar: 'HesapKodu|HesapAdı|Tutar' şeklinde, ; ile ayrılmış" },
          entries_aktif_duran: { type: "string", description: "Duran varlıklar: 'HesapKodu|HesapAdı|Tutar' şeklinde, ; ile ayrılmış" },
          entries_kisa_vadeli: { type: "string", description: "Kısa vadeli yabancı kaynaklar: 'HesapKodu|HesapAdı|Tutar' şeklinde, ; ile ayrılmış" },
          entries_uzun_vadeli: { type: "string", description: "Uzun vadeli yabancı kaynaklar: 'HesapKodu|HesapAdı|Tutar' şeklinde, ; ile ayrılmış (boş olabilir)" },
          entries_ozkaynak: { type: "string", description: "Özkaynaklar: 'HesapKodu|HesapAdı|Tutar' şeklinde, ; ile ayrılmış" },
          period: { type: "string", description: "Dönem (ör: '31 Aralık 2025')" },
          company_name: { type: "string", description: "Firma adı" },
        },
        required: ["entries_aktif_donen", "entries_ozkaynak"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_income_statement",
      description: "Gelir tablosu oluşturur — satışlar, SMM, brüt kâr, faaliyet giderleri, net kâr. Tekdüzen Hesap Planı formatında.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["month", "quarter", "year"], description: "Dönem (varsayılan: month)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_payroll",
      description: "Bordro hesaplama yapar. Brüt maaştan SGK, gelir vergisi, damga vergisi keserek net maaş hesaplar. 2025 ve 2026 vergi dilimleri ve SGK oranları desteklenir.",
      parameters: {
        type: "object",
        properties: {
          gross_salary: { type: "number", description: "Brüt maaş (₺)" },
          cumulative_tax_base: { type: "number", description: "Yıl içi kümülatif gelir vergisi matrahı (₺, önceki ayların toplamı — ilk ay için 0)" },
          disability_degree: { type: "number", enum: [0, 1, 2, 3], description: "Engellilik derecesi (0: yok, 1: 1. derece, 2: 2. derece, 3: 3. derece — varsayılan: 0)" },
          is_minimum_wage: { type: "boolean", description: "Asgari ücretli mi? (true ise gelir vergisi ve damga vergisi istisna)" },
          year: { type: "number", enum: [2025, 2026], description: "Hesaplama yılı (varsayılan: 2026). 2025 ve 2026 vergi dilimleri/asgari ücret desteklenir." },
        },
        required: ["gross_salary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_withholding",
      description: "Stopaj hesaplama yapar. Serbest meslek, kira, telif hakkı vb. ödemeler için stopaj tutarını hesaplar.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Ödeme tutarı (₺)" },
          type: { type: "string", enum: ["serbest_meslek", "kira_gercek", "kira_tuzel", "telif", "insaat_hakedis", "temettü", "faiz"], description: "Stopaj türü" },
          is_gross: { type: "boolean", description: "Tutar brüt mü? (true: brütten stopaj düş, false: netten brüte çıkar — varsayılan: true)" },
        },
        required: ["amount", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_kdv",
      description: "KDV hesaplama yapar. KDV dahil/hariç ayırma, tevkifat hesaplama. Kullanıcı herhangi bir KDV hesaplaması istediğinde MUTLAKA bu tool'u kullan, kendin hesaplama.",
      parameters: {
        type: "object",
        properties: {
          tutar: { type: "number", description: "Tutar" },
          kdvOrani: { type: "number", enum: [1, 10, 20], description: "KDV oranı, default 20" },
          dahilMi: { type: "boolean", description: "true: KDV dahil fiyattan ayır, false: KDV hariç fiyata ekle" },
          tevkifatOrani: { type: "string", enum: ["9/10", "7/10", "5/10", "3/10", "2/10"], description: "Tevkifat oranı (varsa)" }
        },
        required: ["tutar"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_bordro",
      description: "Brüt maaştan net maaş ve tüm kesintileri hesaplar (SGK, GV, damga vergisi, AGİ, BES). Bordro sorusu geldiğinde MUTLAKA bu tool'u kullan, kendin hesaplama.",
      parameters: {
        type: "object",
        properties: {
          brutUcret: { type: "number", description: "Brüt ücret (TL)" },
          cocukSayisi: { type: "number", description: "Çocuk sayısı (AGİ için)" },
          medeniDurum: { type: "string", enum: ["bekar", "evli"], description: "Medeni durum" },
          besOrani: { type: "number", description: "BES kesinti oranı (yüzde, örn: 3)" },
          kumulatifGvMatrahi: { type: "number", description: "Önceki aylardan kümülatif GV matrahı" }
        },
        required: ["brutUcret"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_amortisman",
      description: "Sabit kıymet amortisman hesaplama ve tablo oluşturma. Normal veya azalan bakiyeler yöntemi.",
      parameters: {
        type: "object",
        properties: {
          maliyet: { type: "number", description: "Sabit kıymet maliyeti (TL)" },
          faydaliOmur: { type: "number", description: "Faydalı ömür (yıl)" },
          yontem: { type: "string", enum: ["normal", "azalan"], description: "Normal (doğrusal) veya azalan bakiyeler" }
        },
        required: ["maliyet"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_kur_degerleme",
      description: "Dönem sonu döviz kur değerlemesi hesaplama ve yevmiye kaydı. VUK md. 280 kurallarına göre.",
      parameters: {
        type: "object",
        properties: {
          dovizTutar: { type: "number", description: "Döviz tutarı" },
          dovizCinsi: { type: "string", description: "USD, EUR vb." },
          kayitKuru: { type: "number", description: "İlk kayıt kuru" },
          degerlemeKuru: { type: "number", description: "Değerleme günü TCMB kuru" },
          hesapTuru: { type: "string", enum: ["alacak", "borc"], description: "Alacak mı borç mu?" }
        },
        required: ["dovizTutar", "dovizCinsi", "kayitKuru", "degerlemeKuru", "hesapTuru"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_stopaj",
      description: "Serbest meslek, kira, royalty vb. ödemeler için stopaj ve KDV tevkifat hesaplama. Yevmiye kaydı dahil.",
      parameters: {
        type: "object",
        properties: {
          brutTutar: { type: "number", description: "Brüt ödeme tutarı" },
          gelirTuru: { type: "string", enum: ["serbest_meslek", "kira", "royalty", "insaat", "diger"], description: "Gelir türü" },
          kdvOrani: { type: "number", enum: [1, 10, 20], description: "KDV oranı" },
          kdvTevkifatOrani: { type: "string", enum: ["9/10", "7/10", "5/10", "3/10", "2/10"], description: "KDV tevkifat oranı (varsa)" }
        },
        required: ["brutTutar", "gelirTuru"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "parse_efatura_xml",
      description: "e-Fatura UBL-TR XML dosyasını parse eder. Satıcı bilgileri, matrah, KDV oranı ve tutarını çıkarır. İndirilecek KDV listesi oluşturmak için kullanılır.",
      parameters: {
        type: "object",
        properties: {
          xml_content: { type: "string", description: "e-Fatura XML dosyasının içeriği" },
          donem: { type: "string", description: "KDV beyanname dönemi (AA/YYYY formatında, örn: 01/2025)" }
        },
        required: ["xml_content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_kdv_listesi",
      description: "Parse edilmiş faturaların İndirilecek KDV Listesini oluşturur. Excel veya PDF formatında dışa aktarır. Kullanıcı KDV listesi, indirilecek KDV, fatura listesi istediğinde kullan.",
      parameters: {
        type: "object",
        properties: {
          donem: { type: "string", description: "KDV beyanname dönemi (AA/YYYY)" },
          format: { type: "string", enum: ["xlsx", "pdf", "json"], description: "Çıktı formatı" },
        },
        required: ["donem", "format"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "format_yevmiye",
      description: "Muhasebe yevmiye kaydı oluşturur. Borç/alacak tablosu formatında. Herhangi bir muhasebe kaydı istendiğinde bu tool'u kullan.",
      parameters: {
        type: "object",
        properties: {
          tarih: { type: "string", description: "Kayıt tarihi (GG.AA.YYYY)" },
          aciklama: { type: "string", description: "İşlem açıklaması" },
          satirlar: {
            type: "array",
            items: {
              type: "object",
              properties: {
                hesapKodu: { type: "string", description: "Tekdüzen hesap kodu (örn: 120)" },
                hesapAdi: { type: "string", description: "Hesap adı (örn: Alıcılar)" },
                borc: { type: "number", description: "Borç tutarı (0 ise alacak)" },
                alacak: { type: "number", description: "Alacak tutarı (0 ise borç)" }
              },
              required: ["hesapKodu", "hesapAdi", "borc", "alacak"]
            },
            description: "Yevmiye satırları"
          }
        },
        required: ["tarih", "aciklama", "satirlar"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_mizan",
      description: "Geçici mizan raporu oluşturur (Excel). Hesap kodları, borç/alacak toplamları ve kalanlarıyla Excel çıktısı üretir.",
      parameters: {
        type: "object",
        properties: {
          entries: { type: "string", description: "Mizan kalemleri: 'HesapKodu|HesapAdı|BorçToplamı|AlacakToplamı' noktalı virgülle ayrılır. Örn: '100|Kasa|50000|30000;120|Bankalar|200000|80000'" },
          period: { type: "string", description: "Dönem bilgisi (Örn: 'Ocak 2026')" },
          company_name: { type: "string", description: "Firma adı" },
        },
        required: ["entries"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_bordro",
      description: "Aylık bordro raporu oluşturur (Excel). Çalışanların brüt/net maaş, SGK, vergi kesintileri ve işveren maliyetini hesaplar.",
      parameters: {
        type: "object",
        properties: {
          employees: { type: "string", description: "Çalışan listesi: 'AdSoyad|TCKimlik|BrütÜcret' noktalı virgülle ayrılır. TC opsiyoneldir. Örn: 'Ahmet Yılmaz|12345678901|35000;Ayşe Kaya||28000'" },
          period: { type: "string", description: "Dönem bilgisi (Örn: 'Mart 2026')" },
          company_name: { type: "string", description: "Firma adı" },
        },
        required: ["employees"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_gelir_tablosu",
      description: "Gelir tablosu raporu oluşturur (Excel). Satışlar, maliyet, brüt kâr, faaliyet giderleri ve net kâr formatında Excel çıktısı üretir.",
      parameters: {
        type: "object",
        properties: {
          satislar: { type: "number", description: "Brüt satış geliri (₺)" },
          satis_indirimleri: { type: "number", description: "Satış indirimleri/iadeler (₺, opsiyonel)" },
          satislarin_maliyeti: { type: "number", description: "Satışların maliyeti / SMM (₺)" },
          faaliyet_giderleri: { type: "string", description: "Faaliyet giderleri: 'GiderAdı|Tutar' noktalı virgülle ayrılır. Örn: 'Genel Yönetim|45000;Pazarlama|20000;Ar-Ge|15000'" },
          diger_gelirler: { type: "number", description: "Diğer gelirler (₺, opsiyonel)" },
          diger_giderler: { type: "number", description: "Diğer giderler (₺, opsiyonel)" },
          finansman_giderleri: { type: "number", description: "Finansman giderleri (₺, opsiyonel)" },
          period: { type: "string", description: "Dönem bilgisi (Örn: 'Q1 2026')" },
          company_name: { type: "string", description: "Firma adı" },
        },
        required: ["satislar", "satislarin_maliyeti", "faaliyet_giderleri"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_kdv_ozet",
      description: "KDV beyanname hazırlık özeti oluşturur (Excel). Hesaplanan KDV, indirilecek KDV, tevkifat ve ödenecek/devreden KDV hesaplar.",
      parameters: {
        type: "object",
        properties: {
          hesaplanan_kdv: { type: "number", description: "Hesaplanan KDV tutarı (₺)" },
          indirilecek_kdv: { type: "number", description: "İndirilecek KDV tutarı (₺)" },
          tevkifat_kdv: { type: "number", description: "Tevkifat yoluyla ödenen KDV (₺, opsiyonel)" },
          ihracat_istisnasi: { type: "number", description: "İhracat istisnası KDV (₺, opsiyonel)" },
          period: { type: "string", description: "Dönem bilgisi (Örn: 'Şubat 2026')" },
          company_name: { type: "string", description: "Firma adı" },
        },
        required: ["hesaplanan_kdv", "indirilecek_kdv"],
      },
    },
  },
];

export const hrRecruitingTools: OpenAI.ChatCompletionTool[] = [
  webSearchTool,
  ...whatsappTools,
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
  {
    type: "function",
    function: {
      name: "upload_cv",
      description: "Parse CV/resume text and create a candidate profile with extracted skills, contact info, and automatically score against an active job posting.",
      parameters: {
        type: "object",
        properties: {
          cv_text: { type: "string", description: "The full text of the candidate's CV/resume" },
          job_posting_id: { type: "string", description: "Optional job posting ID (e.g. JOB-ABC123) to score the candidate against" },
          override_name: { type: "string", description: "Override detected name if known" },
        },
        required: ["cv_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_candidates",
      description: "List all candidates, optionally filtered by job posting or sorted by score.",
      parameters: {
        type: "object",
        properties: {
          job_posting_id: { type: "string", description: "Filter by job posting ID" },
          sort_by_score: { type: "boolean", description: "Sort by match score descending" },
          top_n: { type: "number", description: "Return only top N candidates" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_candidate_detail",
      description: "Get detailed information about a specific candidate including their skills, applications, and scores.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "number", description: "The numeric candidate ID" },
        },
        required: ["candidate_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "score_candidate",
      description: "Score a specific candidate against a job posting and update their application score.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "number", description: "The numeric candidate ID" },
          job_posting_id: { type: "string", description: "The job posting ID (e.g. JOB-ABC123)" },
        },
        required: ["candidate_id", "job_posting_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_score_candidates",
      description: "Score all candidates that applied to a specific job posting and rank them by fit.",
      parameters: {
        type: "object",
        properties: {
          job_posting_id: { type: "string", description: "The job posting ID to score all candidates for" },
        },
        required: ["job_posting_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_application_status",
      description: "Update the status of a candidate's application in the pipeline. Valid statuses: new, screening, interview_scheduled, interviewed, offer, hired, rejected.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "number", description: "The candidate ID" },
          job_posting_id: { type: "string", description: "The job posting ID" },
          status: {
            type: "string",
            enum: ["new", "screening", "interview_scheduled", "interviewed", "offer", "hired", "rejected"],
            description: "New status for the application",
          },
          notes: { type: "string", description: "Optional notes about the status change" },
        },
        required: ["candidate_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_interview",
      description: "Schedule an interview for a candidate. Updates application status to interview_scheduled and records the date.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "number", description: "The candidate ID" },
          job_posting_id: { type: "string", description: "The job posting ID" },
          interview_date: { type: "string", description: "Interview date and time (ISO 8601 format or natural language)" },
          notes: { type: "string", description: "Interview notes or instructions" },
        },
        required: ["candidate_id", "interview_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_job_postings",
      description: "List all job postings, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "closed", "draft"], description: "Filter by status" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hiring_pipeline_summary",
      description: "Show the hiring pipeline summary — how many candidates are at each stage.",
      parameters: {
        type: "object",
        properties: {
          job_posting_id: { type: "string", description: "Optional: filter by specific job posting" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_offer_letter",
      description: "Generate a professional offer letter for a candidate.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "number", description: "The candidate ID" },
          job_title: { type: "string", description: "Job title being offered" },
          salary: { type: "string", description: "Offered salary (e.g. '120,000 TL/month')" },
          start_date: { type: "string", description: "Proposed start date" },
          additional_benefits: { type: "string", description: "Additional benefits or terms" },
        },
        required: ["candidate_id", "job_title", "salary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_rejection_email",
      description: "Generate a professional, empathetic rejection email for a candidate.",
      parameters: {
        type: "object",
        properties: {
          candidate_id: { type: "number", description: "The candidate ID" },
          job_title: { type: "string", description: "Job title they applied for" },
          reason: { type: "string", description: "Brief reason (optional, for personalization)" },
        },
        required: ["candidate_id", "job_title"],
      },
    },
  },
];

export const ecommerceOpsTools: OpenAI.ChatCompletionTool[] = [
  webSearchTool,
  ...whatsappTools,
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
  {
    type: "function",
    function: {
      name: "send_order_email",
      description: "Send an e-commerce related email — order confirmations, shipping updates, stock alerts, price change notifications, or customer communications. Use when the user asks to email order details or notifications.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body content (professional e-commerce tone)" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_list_connections",
      description: "List all connected marketplace platforms (Trendyol, Shopify) for this user. Shows connection status and store names.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_get_products",
      description: "Fetch product list from a connected marketplace. Returns product names, prices, stock levels, and status.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["trendyol", "shopify", "all"], description: "Which marketplace to query. Use 'all' to get from all connected platforms." },
          search: { type: "string", description: "Search/filter keyword for product name" },
        },
        required: ["platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_get_orders",
      description: "Fetch recent orders from a connected marketplace. Returns order details, status, customer info, and totals.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["trendyol", "shopify", "all"], description: "Which marketplace to query" },
          status: { type: "string", description: "Filter by order status (e.g. Created, Picking, Shipped, Delivered, Cancelled)" },
          days: { type: "number", description: "How many days back to look (default: 7)" },
        },
        required: ["platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_get_order_detail",
      description: "Get detailed information about a specific order including items, shipping, and customer details.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["trendyol", "shopify"], description: "Which marketplace" },
          order_id: { type: "string", description: "Order ID or shipment package ID" },
        },
        required: ["platform", "order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_update_stock",
      description: "Update product stock/inventory on a marketplace. Supports batch updates.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["trendyol", "shopify"], description: "Which marketplace" },
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                barcode: { type: "string", description: "Product barcode (Trendyol) or inventory_item_id (Shopify)" },
                quantity: { type: "number", description: "New stock quantity" },
              },
              required: ["barcode", "quantity"],
            },
            description: "List of stock updates",
          },
        },
        required: ["platform", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_update_price",
      description: "Update product prices on Trendyol marketplace.",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                barcode: { type: "string", description: "Product barcode" },
                salePrice: { type: "number", description: "New sale price" },
                listPrice: { type: "number", description: "New list price (must be >= sale price)" },
              },
              required: ["barcode", "salePrice", "listPrice"],
            },
            description: "Price update items",
          },
        },
        required: ["updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_update_tracking",
      description: "Update shipping/tracking information for an order. Notifies the customer automatically.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["trendyol", "shopify"], description: "Which marketplace" },
          order_id: { type: "string", description: "Order ID or package ID" },
          tracking_number: { type: "string", description: "Cargo tracking number" },
          cargo_company: { type: "string", description: "Shipping company name (e.g. Yurtiçi Kargo, Aras Kargo, MNG)" },
        },
        required: ["platform", "order_id", "tracking_number", "cargo_company"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_get_questions",
      description: "Fetch customer questions from Trendyol marketplace that need answers.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["WAITING_FOR_ANSWER", "ANSWERED", "ALL"], description: "Filter by answer status" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_answer_question",
      description: "Answer a customer question on Trendyol marketplace.",
      parameters: {
        type: "object",
        properties: {
          question_id: { type: "string", description: "The question ID from Trendyol" },
          answer: { type: "string", description: "Professional answer text" },
        },
        required: ["question_id", "answer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketplace_sync_summary",
      description: "Get a summary overview of all connected marketplaces — total products, recent orders count, revenue summary. Good for daily briefings.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

export const realEstateTools: OpenAI.ChatCompletionTool[] = [
  webSearchTool,
  ...whatsappTools,
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
  {
    type: "function",
    function: {
      name: "send_property_email",
      description: "Send a real estate related email — property listings, valuation reports, offer documents, market analysis, or viewing invitations. Use when the user asks to email property details or real estate communications.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body content (professional real estate tone)" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  ...gmailInboxTools,
];

const createTaskTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_task",
    description: "Create a new task/to-do item for the user. Use this ONLY when the user explicitly asks to create a task, save something as a task, or says phrases like 'bunu göreve al', 'bunu kaydet', 'şu tarihte yap', 'hatırlat', 'görev oluştur'. IMPORTANT: Before calling this tool, you MUST first show the user the task details (title, description, due date, priority) and ask for confirmation. Only call this tool AFTER the user confirms.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title - concise summary of what needs to be done" },
        description: { type: "string", description: "Detailed description of the task" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Task priority level (default: medium)" },
        dueDate: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
        project: { type: "string", description: "Project name to group the task under (optional)" },
      },
      required: ["title"],
    },
  },
};

const delegateTaskTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "delegate_task",
    description: "Delegate a task to another AI agent. Use this when a task is better handled by a different specialized agent. For example, a Sales agent can delegate invoice creation to the Bookkeeping agent, or a Customer Support agent can delegate scheduling a follow-up to the Scheduling agent. Always explain to the user that you are delegating the task.",
    parameters: {
      type: "object",
      properties: {
        targetAgentType: {
          type: "string",
          enum: ["sales-sdr", "customer-support", "social-media", "bookkeeping", "scheduling", "hr-recruiting", "data-analyst", "ecommerce-ops", "real-estate"],
          description: "The agent type to delegate the task to"
        },
        title: { type: "string", description: "Title of the task to delegate" },
        description: { type: "string", description: "Detailed description of what the target agent should do" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Task priority (default: medium)" },
        dueDate: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
        project: { type: "string", description: "Project name to group the task under (optional)" },
      },
      required: ["targetAgentType", "title", "description"],
    },
  },
};

const pdfEmailTools = [generatePdfTool, sendEmailWithAttachmentTool];
const emailOnlyTools = [sendEmailWithAttachmentTool];

export const agentToolRegistry: Record<string, OpenAI.ChatCompletionTool[]> = {
  "sales-sdr": [...salesSdrTools, createTaskTool, delegateTaskTool],
  "customer-support": [...customerSupportTools, ...pdfEmailTools, createTaskTool, delegateTaskTool],
  "scheduling": [...schedulingTools, ...emailOnlyTools, createTaskTool, delegateTaskTool],
  "data-analyst": [...dataAnalystTools, ...pdfEmailTools, createTaskTool, delegateTaskTool],
  "social-media": [...socialMediaTools, ...pdfEmailTools, createTaskTool, delegateTaskTool],
  "bookkeeping": [...bookkeepingTools, ...pdfEmailTools, createTaskTool, delegateTaskTool],
  "hr-recruiting": [...hrRecruitingTools, ...pdfEmailTools, createTaskTool, delegateTaskTool],
  "ecommerce-ops": [...ecommerceOpsTools, ...pdfEmailTools, createTaskTool, delegateTaskTool],
  "real-estate": [...realEstateTools, ...pdfEmailTools, createTaskTool, delegateTaskTool],
  "manager": [createTaskTool, delegateTaskTool],
};

export function getToolsForAgent(agentType: string): OpenAI.ChatCompletionTool[] | undefined {
  return agentToolRegistry[agentType];
}

function normalizeTurkish(text: string): string {
  return text
    .replace(/ö/g, "o").replace(/Ö/g, "o")
    .replace(/ü/g, "u").replace(/Ü/g, "u")
    .replace(/ş/g, "s").replace(/Ş/g, "s")
    .replace(/ç/g, "c").replace(/Ç/g, "c")
    .replace(/ğ/g, "g").replace(/Ğ/g, "g")
    .replace(/ı/g, "i").replace(/İ/g, "i");
}

const TOOL_KEYWORD_MAP: Record<string, string[]> = {
  web_search: ["ara", "bul", "araştır", "search", "find", "research", "look up", "potansiyel", "potential", "müşteri bul", "trend", "piyasa", "market", "analiz", "investigate", "keşfet", "discover", "explore", "nerede", "where", "kimler", "who"],
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
  pipeline_report: ["pipeline", "report", "stats", "analiz", "istatistik", "performans", "how many leads", "leads this", "conversion", "rate", "summary", "funnel", "kpi", "monthly", "weekly", "analytics", "overview", "numbers", "metrics"],
  create_proposal: ["proposal", "teklif", "create proposal", "draft proposal"],
  send_proposal: ["send proposal", "email proposal", "teklif gönder", "proposal"],
  research_company: ["research", "araştır", "company", "firma", "şirket", "analyze", "incele", "website", "classify", "sınıflandır", "buyer", "seller", "alıcı", "satıcı"],
  find_leads: ["find leads", "lead bul", "müşteri bul", "prospect", "potansiyel", "discover", "keşfet", "b2b", "buyer", "alıcı", "lead ara", "otomatik lead", "smart search"],
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
  send_whatsapp: ["whatsapp", "mesaj", "message", "telefon", "phone", "numara", "number", "wp", "whatsap"],
  send_whatsapp_template: ["whatsapp", "template", "şablon", "bildirim", "notification", "hatırlatma", "reminder"],
  check_whatsapp_status: ["whatsapp", "wp", "bağlantı", "connection", "status", "durum"],
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
  get_account_insights: ["insight", "istatistik", "takipçi", "followers", "gönderi sayısı", "post count", "analytics", "stats", "profil bilgileri", "hesap bilgileri", "kaç gönderi", "kaç takipçi", "metrics", "metrik"],
  get_special_days: ["özel gün", "tatil", "bayram", "holiday", "special day", "resmi tatil", "dini bayram", "ramazan", "kurban", "anneler günü", "babalar günü", "cumhuriyet", "zafer", "öğretmenler", "black friday", "yılbaşı"],
  create_monthly_program: ["aylık program", "monthly program", "30 gün", "aylık plan", "aylık strateji", "monthly strategy", "içerik programı", "content program"],
  analyze_competitor: ["rakip", "competitor", "rakip analiz", "competitor analysis", "karşılaştır", "compare", "benchmark"],
  get_best_posting_times: ["en iyi saat", "best time", "ne zaman paylaş", "when to post", "paylaşım saati", "posting time", "optimal saat", "ideal saat"],
  optimize_profile: ["bio", "profil optimiz", "profil iyileştir", "bio optimize", "improve profile", "profil düzenle", "biyografi"],
  get_trending_topics: ["trend", "gündem", "trending", "viral", "popüler", "popular", "trend hashtag", "güncel trend", "trending topic"],
  create_invoice: ["invoice", "fatura", "KDV", "tevkifat"],
  log_expense: ["expense", "gider", "harcama", "masraf"],
  log_income: ["income", "gelir", "satış", "tahsilat", "hasılat"],
  financial_summary: ["financial", "summary", "report", "mali", "özet", "rapor", "gelir", "gider"],
  get_exchange_rate: ["exchange", "kur", "döviz", "TCMB", "USD", "EUR", "GBP", "dolar", "euro"],
  add_receivable: ["receivable", "alacak", "tahsilat", "müşteri borcu"],
  add_payable: ["payable", "borç", "tedarikçi", "ödeme"],
  list_debts: ["debts", "borç", "alacak", "vade", "bakiye"],
  cash_flow_forecast: ["cash flow", "nakit akış", "projeksiyon", "tahmin", "forecast"],
  generate_balance_sheet: ["balance", "bilanço", "varlık", "kaynak"],
  generate_income_statement: ["income statement", "gelir tablosu", "kâr zarar"],
  calculate_payroll: ["payroll", "bordro", "maaş", "brüt", "net", "SGK"],
  calculate_withholding: ["withholding", "stopaj", "tevkifat", "kesinti"],
  calculate_kdv: ["KDV", "kdv", "katma değer", "vergi", "tevkifat", "dahil", "hariç"],
  calculate_bordro: ["bordro", "maaş", "brüt", "net", "SGK", "AGİ", "BES", "kesinti"],
  calculate_amortisman: ["amortisman", "sabit kıymet", "depreciation", "faydalı ömür", "azalan"],
  calculate_kur_degerleme: ["kur", "döviz", "değerleme", "kambiyo", "VUK 280"],
  calculate_stopaj: ["stopaj", "serbest meslek", "kira", "royalty", "tevkifat"],
  parse_efatura_xml: ["e-fatura", "efatura", "xml", "fatura parse", "fatura yükle", "fatura oku"],
  generate_kdv_listesi: ["indirilecek kdv", "kdv listesi", "kdv raporu", "fatura listesi", "191", "beyanname eki"],
  format_yevmiye: ["yevmiye", "muhasebe kaydı", "borç alacak", "journal entry", "hesap"],
  generate_mizan: ["mizan", "hesap planı", "trial balance", "borç alacak"],
  generate_bordro: ["bordro", "maaş bordro", "payroll report", "ücret bordro"],
  generate_gelir_tablosu: ["gelir tablosu", "income statement", "kâr zarar", "kar zarar", "brüt kâr"],
  generate_kdv_ozet: ["kdv", "beyanname", "vat", "katma değer", "KDV özet"],
  create_job_posting: ["job", "posting", "iş ilanı", "ilan", "pozisyon"],
  screen_resume: ["resume", "cv", "candidate", "aday", "screen", "değerlendir"],
  create_interview_kit: ["interview", "mülakat", "soru"],
  send_candidate_email: ["candidate", "aday", "email", "mail"],
  optimize_listing: ["listing", "product", "ürün", "optimize", "seo"],
  price_analysis: ["price", "fiyat", "pricing", "margin", "maliyet"],
  draft_review_response: ["review", "yorum", "response", "yanıt"],
  marketplace_list_connections: ["marketplace", "pazaryeri", "trendyol", "shopify", "bağlantı", "connection", "mağaza", "store"],
  marketplace_get_products: ["ürünler", "products", "stok", "stock", "envanter", "inventory", "ürün listesi"],
  marketplace_get_orders: ["siparişler", "orders", "sipariş", "order", "satış", "sales"],
  marketplace_get_order_detail: ["sipariş detay", "order detail"],
  marketplace_update_stock: ["stok güncelle", "stock update", "envanter güncelle"],
  marketplace_update_price: ["fiyat güncelle", "price update", "fiyatlandır"],
  marketplace_update_tracking: ["kargo takip", "tracking", "takip numarası", "cargo"],
  marketplace_get_questions: ["müşteri soruları", "questions", "sorular", "soru"],
  marketplace_answer_question: ["soru yanıtla", "answer question", "cevapla"],
  marketplace_sync_summary: ["özet", "summary", "dashboard", "genel durum", "rapor"],
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
  create_task: ["task", "görev", "göreve al", "kaydet", "hatırlat", "remind", "to-do", "todo", "yapılacak", "tarihte yap", "not al", "planla"],
  delegate_task: ["delegate", "devret", "başka ajana", "ata", "ilet", "transfer", "görev devret", "assign to", "handoff", "hand off", "yönlendir"],
  generate_pdf: ["pdf", "belge", "document", "fatura oluştur", "rapor oluştur", "teklif oluştur", "makbuz", "invoice", "report", "proposal", "receipt", "pdf oluştur", "pdf generate", "dosya oluştur"],
};

export async function getRelevantToolsForMessage(
  agentType: string,
  message: string
): Promise<OpenAI.ChatCompletionTool[] | undefined> {
  const allTools = agentToolRegistry[agentType];
  if (!allTools) return undefined;

  let skillTools: OpenAI.ChatCompletionTool[] = [];
  try {
    const { getSkillsForAgent, skillToOpenAITool } = await import("./n8n/skillEngine");
    const skills = await getSkillsForAgent(agentType);
    skillTools = skills.map(skillToOpenAITool);
  } catch {}

  const combined = [...allTools, ...skillTools];

  if (combined.length <= 5) return combined;

  const msgLower = normalizeTurkish(message.toLowerCase());

  const skillKeywordMap: Record<string, string[]> = {};
  try {
    const { getSkillsForAgent } = await import("./n8n/skillEngine");
    const agentSkills = await getSkillsForAgent(agentType);
    for (const s of agentSkills) {
      const kws = (s.keywords as string[]) || [];
      if (kws.length > 0) skillKeywordMap[`skill_${s.name}`] = kws;
    }
  } catch {}

  const ALWAYS_INCLUDE_TOOLS = ["generate_pdf", "send_email", "create_task", "delegate_task"];

  const relevant = combined.filter((tool) => {
    const toolName = (tool as OpenAI.ChatCompletionTool & { function: { name: string } }).function.name;
    if (ALWAYS_INCLUDE_TOOLS.includes(toolName)) return true;
    if (toolName.startsWith("skill_")) {
      const kws = skillKeywordMap[toolName];
      if (!kws || kws.length === 0) return true;
      return kws.some((kw) => msgLower.includes(normalizeTurkish(kw.toLowerCase())));
    }
    const keywords = TOOL_KEYWORD_MAP[toolName];
    if (!keywords) return true;
    return keywords.some((kw) => msgLower.includes(normalizeTurkish(kw)));
  });

  if (relevant.length === 0) return combined;

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

const agentDisplayNames: Record<string, string> = {
  "customer-support": "Customer Support Agent",
  "sales-sdr": "Sales Development Rep",
  "social-media": "Social Media Manager",
  "bookkeeping": "Bookkeeping Assistant",
  "scheduling": "Appointment & Scheduling Agent",
  "hr-recruiting": "HR & Recruiting Assistant",
  "data-analyst": "Data Analyst Agent",
  "ecommerce-ops": "E-Commerce Operations Agent",
  "real-estate": "Real Estate & Property Agent",
};

async function _executeToolCallInner(
  toolName: string,
  args: Record<string, unknown>,
  userId: number,
  agentType: string,
  displayName: string,
  userLang: SupportedLang
): Promise<{ result: string; actionType?: string; actionDescription?: string }> {
  try {
  switch (toolName) {
    case "web_search": {
      const query = args.query as string;
      const context = (args.context as string) || "";

      try {
        const searchResponse = await realWebSearch(query);
        const resultCount = searchResponse.results.length;

        let formattedResults = `🔍 **Web Search Results for: "${query}"**\n\n`;

        if (searchResponse.answer) {
          formattedResults += `**Summary:** ${searchResponse.answer}\n\n`;
        }

        if (resultCount > 0) {
          formattedResults += `**Found ${resultCount} results:**\n\n`;
          for (const result of searchResponse.results.slice(0, 8)) {
            formattedResults += `• **[${result.title}](${result.url})**\n`;
            if (result.snippet) {
              formattedResults += `  ${result.snippet}\n`;
            }
            formattedResults += `\n`;
          }
        } else {
          formattedResults += "No results found. Try a different or more specific search query.\n";
        }

        await storage.createAgentAction({
          userId, agentType, actionType: "web_search",
          description: `Web search: "${query}" — ${resultCount} results`,
          metadata: { query, context, resultCount },
        });

        return {
          result: formattedResults,
          actionType: "web_search",
          actionDescription: `🔍 Web search: "${query}" (${resultCount} results)`
        };
      } catch (err) {
        console.error("[web_search] Error:", (err as Error).message);
        return {
          result: `Web search failed: ${(err as Error).message}. Please try again with a different query.`,
          actionType: "web_search",
          actionDescription: `🔍 Web search failed: "${query}"`
        };
      }
    }

    case "check_gmail_status": {
      const { getUserGmailStatus } = await import("./gmailService");
      const gmailStatus = await getUserGmailStatus(userId);
      let statusMsg = "";
      if (gmailStatus.connected && gmailStatus.method === "oauth") {
        statusMsg = `✅ **Gmail Connected (Google OAuth)**\n\nYour Gmail account (${gmailStatus.email}) is fully configured. You can send emails, check your inbox, read emails, and reply to messages.`;
      } else if (gmailStatus.connected && gmailStatus.method === "app_password") {
        statusMsg = `✅ **Gmail Connected (App Password)**\n\nYour Gmail account (${gmailStatus.email}) is configured for **sending** emails. To also read your inbox and reply to emails, connect via **Google OAuth** in **Settings** → Gmail Account → **Connect with Google**.`;
      } else {
        statusMsg = `❌ **Gmail Not Connected**\n\nTo use email features, please go to **Settings** (click the ⚙️ icon) → Gmail section and click **Connect Gmail** to link your Google account.\n\nOnce connected, I can check your inbox, read emails, send emails, and reply to messages.`;
      }
      await storage.createAgentAction({
        userId, agentType, actionType: "gmail_status_check",
        description: `Gmail status check: connected: ${gmailStatus.connected ? "yes" : "no"}, method: ${gmailStatus.method || "none"}`,
        metadata: { connected: gmailStatus.connected, method: gmailStatus.method, email: gmailStatus.email },
      });
      return { result: statusMsg, actionType: "gmail_status_check", actionDescription: `📧 Gmail status: ${gmailStatus.connected ? `Connected (${gmailStatus.method})` : "Not connected"}` };
    }

    case "check_whatsapp_status": {
      const { getWhatsappStatus } = await import("./whatsappService");
      const waStatus = await getWhatsappStatus(userId);
      let waMsg = "";
      if (waStatus.connected) {
        waMsg = `✅ **WhatsApp Business Connected**\n\nPhone Number ID: ${waStatus.phoneNumberId}\n${waStatus.displayName ? `Display Name: ${waStatus.displayName}\n` : ""}You can send WhatsApp messages to customers.`;
      } else {
        waMsg = `❌ **WhatsApp Not Connected**\n\nTo send WhatsApp messages, go to **Settings** → WhatsApp Business section and connect your Meta WhatsApp Business API credentials.\n\nYou'll need:\n• Phone Number ID\n• Access Token\n• Verify Token\n\nThese are available in your Meta Business Manager → WhatsApp Developer Dashboard.`;
      }
      await storage.createAgentAction({
        userId, agentType, actionType: "whatsapp_status_check",
        description: `WhatsApp status: ${waStatus.connected ? "connected" : "not connected"}`,
        metadata: { connected: waStatus.connected, phoneNumberId: waStatus.phoneNumberId },
      });
      return { result: waMsg, actionType: "whatsapp_status_check", actionDescription: `📱 WhatsApp: ${waStatus.connected ? "Connected" : "Not connected"}` };
    }

    case "send_whatsapp": {
      const { sendTextMessage } = await import("./whatsappService");
      const { sanitizeOutput } = await import("./guardrails");
      const sanitizedMsg = sanitizeOutput(String(args.message), agentType);
      const waResult = await sendTextMessage(userId, String(args.to), sanitizedMsg, agentType);
      if (waResult.success) {
        await storage.createAgentAction({
          userId, agentType, actionType: "whatsapp_sent",
          description: `WhatsApp message sent to ${args.to}`,
          metadata: { to: args.to, messageId: waResult.whatsappMessageId },
        });
        try {
          const { triggerEmailSentNotification } = await import("./bossNotificationService");
          await triggerEmailSentNotification({
            userId, agentType, teamMemberName: displayName,
            recipientEmail: `WhatsApp: ${args.to}`,
            subject: "WhatsApp Message",
            bodySnippet: sanitizedMsg,
          });
        } catch (e) { console.error("[BossAI] whatsapp notification error:", e); }
      }
      return {
        result: waResult.message,
        actionType: waResult.success ? "whatsapp_sent" : "whatsapp_failed",
        actionDescription: waResult.success
          ? `📱 WhatsApp sent to ${args.to}`
          : `❌ WhatsApp failed to ${args.to}: ${waResult.message}`,
      };
    }

    case "send_whatsapp_template": {
      const { sendTemplateMessage } = await import("./whatsappService");
      const templateParams = Array.isArray(args.parameters) ? args.parameters : [];
      const waTemplateResult = await sendTemplateMessage(
        userId, String(args.to), String(args.template_name),
        String(args.language_code || "en"), templateParams, agentType,
      );
      if (waTemplateResult.success) {
        await storage.createAgentAction({
          userId, agentType, actionType: "whatsapp_template_sent",
          description: `WhatsApp template "${args.template_name}" sent to ${args.to}`,
          metadata: { to: args.to, template: args.template_name, messageId: waTemplateResult.whatsappMessageId },
        });
      }
      return {
        result: waTemplateResult.message,
        actionType: waTemplateResult.success ? "whatsapp_template_sent" : "whatsapp_template_failed",
        actionDescription: waTemplateResult.success
          ? `📱 WhatsApp template "${args.template_name}" sent to ${args.to}`
          : `❌ WhatsApp template failed: ${waTemplateResult.message}`,
      };
    }

    case "list_inbox": {
      const gmailReady = await isUserGmailReady(userId);
      if (!gmailReady) {
        await storage.createAgentAction({
          userId, agentType, actionType: "inbox_check_failed",
          description: "Attempted to check Gmail inbox — user Gmail not configured",
          metadata: { error: "gmail_not_configured" },
        });
        return {
          result: "Gmail is not connected. To use email features, please go to **Settings** (click the ⚙️ icon in the top navigation) and click **Connect Gmail** to link your Google account. Once connected, I'll be able to check your inbox, read emails, and send replies.",
          actionType: "inbox_check_failed",
          actionDescription: "❌ Gmail not connected — cannot check inbox",
        };
      }
      const maxResults = Math.min(Math.max(Number(args.max_results) || 10, 1), 20);
      const inboxResult = await listInbox(userId, maxResults);
      if (!inboxResult.success || !inboxResult.emails) {
        const errorMsg = inboxResult.message || "Unknown error";
        const guidanceMsg = `\n\n**How to fix:** Go to **Settings** → Gmail section and reconnect your Google account.`;
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
      const emailList = inboxResult.emails.map((e, i) =>
        `${i + 1}. **From:** ${e.from}\n   **Subject:** ${e.subject}\n   **Date:** ${e.date}\n   **Preview:** ${e.snippet}\n   **Email ID:** \`${e.id}\``
      ).join("\n\n");
      await storage.createAgentAction({
        userId, agentType, actionType: "inbox_checked",
        description: `Checked Gmail inbox — ${inboxResult.emails.length} emails found`,
        metadata: { count: inboxResult.emails.length, emailIds: inboxResult.emails.map(e => e.id) },
      });
      return {
        result: `📬 **Gmail Inbox** (${inboxResult.emails.length} emails):\n\n${emailList}\n\nTo read an email's full content, tell me the email number (e.g. "read email #3") or provide the Email ID.`,
        actionType: "inbox_checked",
        actionDescription: `📬 Checked inbox — ${inboxResult.emails.length} emails`,
      };
    }

    case "read_email": {
      const readGmailReady = await isUserGmailReady(userId);
      if (!readGmailReady) {
        await storage.createAgentAction({
          userId, agentType, actionType: "email_read_failed",
          description: "Attempted to read email — user Gmail not configured",
          metadata: { error: "gmail_not_configured", emailId: args.email_id },
        });
        return {
          result: "Gmail is not connected. To use email features, please go to **Settings** (click the ⚙️ icon in the top navigation) and click **Connect Gmail** to link your Google account.",
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
      const readResult = await readEmail(userId, emailId);
      if (!readResult.success || !readResult.email) {
        const readErrorMsg = readResult.message || "Unknown error";
        const readGuidance = `\n\n**How to fix:** Go to **Settings** → Gmail section and reconnect your Google account.`;
        await storage.createAgentAction({
          userId, agentType, actionType: "email_read_failed",
          description: `Failed to read email ${emailId}: ${readErrorMsg}`,
          metadata: { error: readErrorMsg, emailId },
        });
        return { result: `Could not read this email. ${readErrorMsg}${readGuidance}`, actionType: "email_read_failed", actionDescription: `❌ Email read failed` };
      }
      const e = readResult.email;
      await storage.createAgentAction({
        userId, agentType, actionType: "email_read",
        description: `Read email from ${e.from}: "${e.subject}"`,
        metadata: { emailId: e.id, threadId: e.threadId, from: e.from, subject: e.subject },
      });
      return {
        result: `📧 **Email Details**\n\n**From:** ${e.from}\n**To:** ${e.to}\n**Subject:** ${e.subject}\n**Date:** ${e.date}\n**Email ID:** \`${e.id}\`\n\n---\n\n${e.body}\n\n---\n\nTo reply to this email, ask me to "reply to this email" with your message.`,
        actionType: "email_read",
        actionDescription: `📧 Read email: "${e.subject}"`,
      };
    }

    case "reply_email": {
      const replyGmailReady = await isUserGmailReady(userId);
      if (!replyGmailReady) {
        await storage.createAgentAction({
          userId, agentType, actionType: "email_reply_failed",
          description: "Attempted to reply to email — user Gmail not configured",
          metadata: { error: "gmail_not_configured", emailId: args.email_id },
        });
        return {
          result: "Gmail is not connected. Please go to **Settings** and click **Connect Gmail** to link your Google account.",
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
      const replyResult = await replyToEmail(userId, replyEmailId, replyBody);
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
        const replyRecipient = replyResult.message.match(/to ([^\s]+)/)?.[1] || replyEmailId;
        const replySubject = replyResult.message.match(/"([^"]+)"/)?.[1] || "Email Reply";
        await triggerEmailReplyNotification({
          userId,
          agentType,
          teamMemberName: displayName,
          recipientEmail: replyRecipient,
          subject: replySubject,
          replySnippet: replyBody,
        });
      } catch (e) { console.error("[BossAI] reply notification error:", e); }
      return {
        result: `✅ ${replyResult.message}`,
        actionType: "email_replied",
        actionDescription: `↩️ ${replyResult.message}`,
      };
    }

    case "generate_pdf": {
      try {
        const user = await storage.getUserById(userId);
        const branding = (user?.branding as UserBranding) || undefined;
        const pdfResult = await handleGeneratePdf(
          {
            document_type: args.document_type as any,
            data: args.data as Record<string, any>,
            filename: args.filename as string | undefined,
          },
          branding
        );

        let actionId: number | null = null;
        if (pdfResult.success) {
          const action = await storage.createAgentAction({
            userId, agentType,
            actionType: "pdf_generated",
            description: `PDF oluşturuldu: ${pdfResult.filename}`,
            metadata: { filename: pdfResult.filename, document_type: args.document_type, pdfBase64: pdfResult.base64_pdf },
          });
          actionId = action?.id || null;
        }

        return {
          result: pdfResult.success
            ? `PDF başarıyla oluşturuldu: ${pdfResult.filename} (pdf_ref: ${actionId}). Email'e attachment olarak eklemek için send_email tool'unu kullan ve pdf_ref alanına ${actionId} değerini ver.`
            : `PDF oluşturulamadı: ${pdfResult.error}`,
          actionType: pdfResult.success ? "pdf_generated" : "pdf_failed",
          actionDescription: pdfResult.success
            ? `📄 PDF oluşturuldu: ${pdfResult.filename}`
            : `❌ PDF oluşturulamadı: ${pdfResult.error}`,
        };
      } catch (err: any) {
        return {
          result: `PDF oluşturma hatası: ${err.message}`,
          actionType: "pdf_failed",
          actionDescription: `❌ PDF oluşturma hatası`,
        };
      }
    }

    case "send_email": {
      let attachments = args.attachments as Array<{ filename: string; content_base64: string; content_type: string }> | undefined;
      const htmlBody = args.html_body as string | undefined;
      const pdfRef = args.pdf_ref as number | undefined;

      if (pdfRef && !attachments?.length) {
        try {
          const pdfAction = await storage.getAgentAction(pdfRef);
          if (pdfAction && pdfAction.actionType === "pdf_generated" && pdfAction.metadata) {
            const meta = pdfAction.metadata as Record<string, any>;
            if (meta.pdfBase64) {
              attachments = [{
                filename: meta.filename || "document.pdf",
                content_base64: meta.pdfBase64,
                content_type: "application/pdf",
              }];
            }
          }
        } catch (e) {
          console.error("[send_email] pdf_ref lookup error:", e);
        }
      }

      const emailResult = await sendEmail({
        userId,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        agentType,
        htmlBody,
        attachments,
      });
      if (emailResult.success) {
        try {
          const { triggerEmailSentNotification } = await import("./bossNotificationService");
          await triggerEmailSentNotification({
            userId,
            agentType,
            teamMemberName: displayName,
            recipientEmail: String(args.to),
            subject: String(args.subject),
            bodySnippet: String(args.body),
          });
        } catch (e) { console.error("[BossAI] send email notification error:", e); }
      }
      const attachmentInfo = attachments?.length ? ` (${attachments.length} ek dosya ile)` : "";
      return {
        result: emailResult.message,
        actionType: emailResult.success ? "email_sent" : "email_failed",
        actionDescription: emailResult.success
          ? `📧 Email sent to ${args.to}: "${args.subject}"${attachmentInfo}`
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
      const initialScore = computeLeadScore({ status: lead.status, updatedAt: lead.updatedAt });
      await storage.updateLeadScore(lead.id, userId, initialScore);
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
      const newScore = computeLeadScore({ status: updated.status, updatedAt: updated.updatedAt });
      if (newScore !== updated.score) {
        await storage.updateLeadScore(leadId, userId, newScore);
      }
      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "lead_updated",
        description: `Updated lead #${leadId}: ${updated.name}${args.status ? ` → ${args.status}` : ""} (Score: ${newScore})`,
        metadata: { leadId, updates, score: newScore },
      });
      return {
        result: `Lead #${leadId} (${updated.name}) updated successfully.${args.status ? ` Status: ${args.status}` : ""} Score: ${newScore}`,
        actionType: "lead_updated",
        actionDescription: `✏️ Updated lead: ${updated.name}${args.status ? ` → ${args.status}` : ""} (${newScore})`,
      };
    }

    case "list_leads": {
      const allLeads = await storage.getLeadsByUser(userId);
      for (const lead of allLeads) {
        const freshScore = computeLeadScore(lead);
        if (freshScore !== lead.score) {
          await storage.updateLeadScore(lead.id, userId, freshScore);
          lead.score = freshScore;
        }
      }
      const statusFilter = args.status_filter ? String(args.status_filter) : null;
      const scoreFilter = args.score_filter ? String(args.score_filter) : null;
      let filtered = allLeads;
      if (statusFilter) filtered = filtered.filter(l => l.status === statusFilter);
      if (scoreFilter) filtered = filtered.filter(l => l.score === scoreFilter);

      if (filtered.length === 0) {
        const filterDesc = [statusFilter && `status "${statusFilter}"`, scoreFilter && `score "${scoreFilter}"`].filter(Boolean).join(" and ");
        return { result: filterDesc ? `No leads found with ${filterDesc}.` : "No leads in your pipeline yet. Add some with the add_lead tool!" };
      }

      const scoreIcon = (s: string | null) => s === "hot" ? "🔥" : s === "warm" ? "🌤️" : s === "cold" ? "❄️" : "—";
      const leadList = filtered.map(l =>
        `- #${l.id} ${l.name} (${l.email})${l.company ? ` @ ${l.company}` : ""} | Status: ${l.status} | Score: ${scoreIcon(l.score)} ${l.score || "unscored"}${l.notes ? ` | Notes: ${l.notes}` : ""}`
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
      const template = getTemplate(templateId, userLang);
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
      const template = getTemplate(templateId, userLang);
      if (!template) {
        return { result: `Template "${templateId}" not found. Available: cold_outreach, follow_up, value_proposition, meeting_request, proposal` };
      }

      let lead = null;
      if (args.lead_id) {
        lead = await storage.getLeadById(Number(args.lead_id), userId);
      } else if (args.lead_email || args.lead_name) {
        const allLeads = await storage.getLeadsByUser(userId);
        if (args.lead_email) {
          lead = allLeads.find(l => l.email.toLowerCase() === String(args.lead_email).toLowerCase()) || null;
        }
        if (!lead && args.lead_name) {
          lead = allLeads.find(l => l.name.toLowerCase() === String(args.lead_name).toLowerCase()) || null;
          if (!lead) {
            lead = allLeads.find(l => l.name.toLowerCase().includes(String(args.lead_name).toLowerCase())) || null;
          }
        }
      }
      if (!lead) {
        return { result: `Lead not found. Provide a valid lead_id, lead_email, or lead_name.` };
      }
      if (!lead.email) {
        return { result: `Lead "${lead.name}" has no email address.` };
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
          metadata: { templateId, leadId: lead.id, leadName: lead.name, subject: filled.subject },
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

      const existingCampaigns = await storage.getActiveCampaigns(userId);
      const duplicateCampaign = existingCampaigns.find(c => c.leadId === leadId);
      if (duplicateCampaign) {
        return { result: `Lead #${leadId} (${lead.name}) already has an active drip campaign (#${duplicateCampaign.id}). Complete or cancel it before starting a new one.` };
      }

      const campaign = await storage.createEmailCampaign({
        userId,
        leadId,
        campaignType,
        steps: sequence.map(s => ({ ...s })),
        currentStep: 0,
        status: "active",
      });

      await storage.createAgentAction({
        userId,
        agentType,
        actionType: "drip_campaign_started",
        description: `"${campaignType}" drip campaign started for ${lead.name} (${lead.email}) — ${sequence.length} steps over ${sequence[sequence.length - 1].delayDays} days`,
        metadata: { campaignId: campaign.id, leadId, campaignType, totalSteps: sequence.length },
      });

      const stepList = sequence.map((s, i) => `  ${i + 1}. Day ${s.delayDays}: ${s.stepName} (${s.templateId})`).join("\n");

      return {
        result: `Drip campaign #${campaign.id} started for ${lead.name} (${lead.email})!\n\nType: ${campaignType}\nSteps:\n${stepList}\n\nAll emails will be sent automatically on schedule by the campaign runner.`,
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
      const templates = listTemplates(userLang);
      const templateList = templates.map(t => `- ${t.id}: ${t.name} — Subject: "${t.subject}"`).join("\n");
      return { result: `Available email templates:\n${templateList}\n\nUse use_template to send any of these to a specific lead.` };
    }

    case "score_leads": {
      const allLeads = await storage.getLeadsByUser(userId);
      if (allLeads.length === 0) {
        return { result: "No leads in your pipeline to score." };
      }

      let hot = 0, warm = 0, cold = 0;
      for (const lead of allLeads) {
        const scoreLabel = computeLeadScore(lead);
        if (scoreLabel === "hot") hot++;
        else if (scoreLabel === "warm") warm++;
        else cold++;

        await storage.updateLeadScore(lead.id, userId, scoreLabel);
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

      let totalDaysInPipeline = 0;
      for (const lead of allLeads) {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
        const created = new Date(lead.createdAt).getTime();
        if (created >= weekAgo) thisWeek++;
        if (created >= monthAgo) thisMonth++;
        totalDaysInPipeline += Math.floor((now - created) / (1000 * 60 * 60 * 24));
      }

      const avgDaysInPipeline = Math.round(totalDaysInPipeline / allLeads.length);
      const won = statusCounts["won"] || 0;
      const conversionRate = allLeads.length > 0 ? Math.round((won / allLeads.length) * 100) : 0;

      const statusReport = Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([s, c]) => `  ${s}: ${c}`)
        .join("\n");

      const scoreCounts: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
      for (const lead of allLeads) {
        const freshScore = computeLeadScore(lead);
        if (freshScore !== lead.score) {
          await storage.updateLeadScore(lead.id, userId, freshScore);
        }
        scoreCounts[freshScore] = (scoreCounts[freshScore] || 0) + 1;
      }

      return {
        result: `📊 PIPELINE REPORT\n\n` +
          `Total Leads: ${allLeads.length}\n` +
          `New This Week: ${thisWeek}\n` +
          `New This Month: ${thisMonth}\n` +
          `Avg. Time in Pipeline: ${avgDaysInPipeline} day${avgDaysInPipeline !== 1 ? "s" : ""}\n\n` +
          `BY STATUS:\n${statusReport}\n\n` +
          `CONVERSION: ${conversionRate}% (${won} won / ${allLeads.length} total)\n\n` +
          `LEAD SCORES: 🔥 ${scoreCounts.hot} Hot | 🌤️ ${scoreCounts.warm} Warm | ❄️ ${scoreCounts.cold} Cold`,
      };
    }

    case "create_proposal": {
      let leadName = "Prospective Client";
      let leadEmail = "";
      let companyName = "your organization";
      let leadId: number | null = null;

      if (args.lead_id) {
        leadId = Number(args.lead_id);
        const lead = await storage.getLeadById(leadId, userId);
        if (!lead) {
          return { result: `Lead #${leadId} not found or you don't have access to it.` };
        }
        leadName = lead.name;
        leadEmail = lead.email;
        companyName = lead.company || companyName;
      } else if (args.company_name) {
        companyName = String(args.company_name);
      }

      const industryCtx = args.industry ? String(args.industry) : "";
      const customNotes = args.custom_notes ? String(args.custom_notes) : "";

      const aiPrompt = `Generate a professional sales proposal for RentAI 24 (an AI staffing agency that rents pre-trained AI workers to businesses).

Target:
- Prepared for: ${leadName}
- Company: ${companyName}
- Date: ${new Date().toLocaleDateString()}
${industryCtx ? `- Industry: ${industryCtx}` : ""}
${customNotes ? `- Special requirements: ${customNotes}` : ""}

Structure the proposal with these sections using ─── headers:
1. EXECUTIVE SUMMARY — tailored to the company/industry
2. PROBLEM STATEMENT — specific pain points for this type of business
3. SOLUTION — how RentAI 24's AI workers solve these challenges
4. PRICING — Starter ($49/mo, 1 worker), Professional ($39/mo/worker, up to 5), Enterprise (custom)
5. TIMELINE — phased rollout plan
6. NEXT STEPS — clear call to action

Keep it professional, persuasive, and specific to their industry/company. About 400-500 words.`;

      try {
        const completion = await aiClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: aiPrompt }],
          max_tokens: 1200,
          temperature: 0.7,
        });
        const proposal = completion.choices[0]?.message?.content || "Proposal generation failed.";

        const metadata: ProposalMetadata = { leadId: leadId || 0, leadName, company: companyName, proposalContent: proposal };
        await storage.createAgentAction({
          userId, agentType,
          actionType: "proposal_created",
          description: `Sales proposal created for ${leadName} at ${companyName}`,
          metadata,
        });

        const emailOffer = leadEmail ? `\n\nWould you like me to email this proposal to ${leadName} at ${leadEmail}? Use send_proposal to send it.` : "";
        return {
          result: `Proposal created for ${leadName} at ${companyName}!\n\n${proposal}${emailOffer}`,
          actionType: "proposal_created",
          actionDescription: `📄 Proposal created for ${leadName} at ${companyName}`,
        };
      } catch (err) {
        return { result: `Failed to generate proposal: ${err instanceof Error ? err.message : "Unknown error"}` };
      }
    }

    case "send_proposal": {
      const leadId = Number(args.lead_id);
      const lead = await storage.getLeadById(leadId, userId);
      if (!lead) {
        return { result: `Lead #${leadId} not found or you don't have access to it.` };
      }
      if (!lead.email) {
        return { result: `Lead #${leadId} (${lead.name}) has no email address. Cannot send proposal.` };
      }

      const actions = await storage.getActionsByUser(userId);
      const proposalAction = actions.find((a) => {
        if (a.actionType !== "proposal_created") return false;
        const meta = a.metadata as Record<string, unknown> | null;
        return meta && meta.leadId === leadId;
      });
      const proposalMeta = proposalAction?.metadata as Record<string, unknown> | null;
      if (!proposalAction || !proposalMeta?.proposalContent) {
        return { result: `No proposal found for lead #${leadId} (${lead.name}). Create one first with create_proposal.` };
      }

      const proposalContent = String(proposalMeta.proposalContent);
      const companyName = lead.company || "your organization";
      const subject = `Sales Proposal for ${companyName} — RentAI 24`;

      const emailResult = await sendEmail({
        to: lead.email,
        subject,
        body: proposalContent,
        userId,
        agentType,
      });

      if (emailResult.success) {
        await storage.createAgentAction({
          userId, agentType,
          actionType: "proposal_sent",
          description: `Proposal emailed to ${lead.name} (${lead.email}) at ${companyName}`,
          metadata: { leadId, leadName: lead.name, company: companyName, email: lead.email },
        });

        return {
          result: `Proposal successfully emailed to ${lead.name} at ${lead.email}!`,
          actionType: "proposal_sent",
          actionDescription: `📧 Proposal sent to ${lead.name} at ${lead.email}`,
        };
      }

      return {
        result: `Failed to send proposal to ${lead.email}: ${emailResult.message}`,
      };
    }

    case "analyze_competitors": {
      const industry = String(args.industry);
      const companyContext = args.company_context ? String(args.company_context) : "";

      const aiPrompt = `Generate a competitive analysis for the ${industry} industry from the perspective of RentAI 24 (an AI staffing agency that rents pre-trained AI workers to businesses, starting at $39-49/month).

${companyContext ? `Prospect context: ${companyContext}` : ""}

Structure the analysis with these sections using ─── headers:
1. MARKET LANDSCAPE — current state, trends, key forces in this industry
2. COMPETITIVE POSITIONING — analyze Traditional Solutions, Freelance/Contractor Models, and AI-First Competitors with their strengths and weaknesses
3. OUR DIFFERENTIATORS — what makes RentAI 24 unique (specialized AI workers, month-to-month, integrations, 24/7, cost savings)
4. RECOMMENDATIONS — 5 specific sales strategy recommendations for this industry
5. KEY TALKING POINTS — 3-4 compelling one-liners for sales conversations

Be specific to the ${industry} industry. About 400-500 words.`;

      try {
        const completion = await aiClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: aiPrompt }],
          max_tokens: 1200,
          temperature: 0.7,
        });
        const analysis = completion.choices[0]?.message?.content || "Analysis generation failed.";

        await storage.createAgentAction({
          userId, agentType,
          actionType: "competitor_analysis",
          description: `Competitive analysis generated for ${industry}${companyContext ? ` (${companyContext})` : ""}`,
          metadata: { industry, companyContext, analysisContent: analysis },
        });

        return {
          result: analysis,
          actionType: "competitor_analysis",
          actionDescription: `🔍 Competitive analysis: ${industry}`,
        };
      } catch (err) {
        return { result: `Failed to generate competitive analysis: ${err instanceof Error ? err.message : "Unknown error"}` };
      }
    }

    case "research_company": {
      try {
        const companyName = String(args.company_name);
        const productContext = String(args.product_context);
        const websiteUrl = args.website_url ? String(args.website_url) : undefined;

        const analysis = await analyzeCompany(companyName, websiteUrl, productContext);

        const classLabels: Record<string, string> = {
          buyer: "🟢 Potansiyel Alıcı",
          seller: "🔴 Satıcı (Rakip)",
          manufacturer: "🟡 Üretici",
          service_provider: "🔵 Hizmet Sağlayıcı",
          unknown: "⚪ Belirlenemedi",
        };

        let resultText = `📊 **Company Research: ${analysis.companyName}**\n\n`;
        resultText += `**Classification:** ${classLabels[analysis.classification] || analysis.classification}\n`;
        resultText += `**Confidence:** ${Math.round(analysis.classificationConfidence * 100)}%\n`;
        resultText += `**Industry:** ${analysis.industry}\n`;
        if (analysis.website) resultText += `**Website:** ${analysis.website}\n`;
        resultText += `\n**Description:** ${analysis.description}\n`;
        resultText += `\n**Products/Services:** ${analysis.products.join(", ") || "N/A"}\n`;
        resultText += `\n**Analysis:** ${analysis.reasoning}\n`;

        if (analysis.contactInfo.email || analysis.contactInfo.phone || analysis.contactInfo.address) {
          resultText += `\n**Contact Info:**\n`;
          if (analysis.contactInfo.email) resultText += `  📧 ${analysis.contactInfo.email}\n`;
          if (analysis.contactInfo.phone) resultText += `  📞 ${analysis.contactInfo.phone}\n`;
          if (analysis.contactInfo.address) resultText += `  📍 ${analysis.contactInfo.address}\n`;
        }

        if (analysis.potentialBuyer) {
          resultText += `\n✅ **This company is a potential buyer for ${productContext}.** Consider adding to CRM and starting outreach.`;
        } else {
          resultText += `\n❌ **Not a likely buyer for ${productContext}.** ${analysis.classification === "seller" ? "This appears to be a competitor." : ""}`;
        }

        await storage.createAgentAction({
          userId, agentType, actionType: "research_company",
          description: `Researched: ${companyName} — ${analysis.classification} (${Math.round(analysis.classificationConfidence * 100)}% confidence)`,
          metadata: { companyName, classification: analysis.classification, potentialBuyer: analysis.potentialBuyer },
        });

        return {
          result: resultText,
          actionType: "research_company",
          actionDescription: `🔬 Company research: ${companyName} — ${classLabels[analysis.classification]}`
        };
      } catch (err) {
        console.error("[research_company] Error:", (err as Error).message);
        return { result: `Company research failed: ${(err as Error).message}` };
      }
    }

    case "find_leads": {
      try {
        const product = String(args.product);
        const industry = args.industry ? String(args.industry) : undefined;
        const location = args.location ? String(args.location) : undefined;
        const count = Math.min(Math.max(Number(args.count) || 5, 1), 10);

        const { leads, searchQueries } = await findLeads(product, industry, location, count);

        let resultText = `**Lead Search Results for: "${product}"**\n\n`;
        resultText += `**Search Strategy:** ${searchQueries.slice(0, 3).join(" | ")}\n`;
        resultText += `**Found:** ${leads.length} qualified potential buyers\n\n`;

        if (leads.length === 0) {
          resultText += "No qualifying leads found. Try:\n";
          resultText += "- A different product description\n";
          resultText += "- A specific industry or location\n";
          resultText += "- More general terms\n";
        }

        if (leads.length > 0) {
          resultText += "| # | Company | Industry | Classification | Confidence | Website | Contact | CRM |\n";
          resultText += "|---|---------|----------|----------------|------------|---------|---------|-----|\n";
        }

        const addedContacts: string[] = [];
        for (let i = 0; i < leads.length; i++) {
          const lead = leads[i];
          let crmStatus = "-";

          try {
            const contact = await storage.createRexContact({
              userId,
              companyName: lead.companyName,
              contactName: lead.companyName,
              email: lead.contactInfo.email || undefined,
              phone: lead.contactInfo.phone || undefined,
              website: lead.website || undefined,
              industry: lead.industry,
              source: "cold",
              segment: "smb",
              tags: [product, lead.classification, "auto-found"],
              notes: `Auto-found by Rex. ${lead.reasoning}. Products: ${lead.products.join(", ")}`,
              leadScore: Math.round(lead.classificationConfidence * 100),
            });
            addedContacts.push(contact.id);
            crmStatus = "Added";
          } catch (e) {
            console.warn(`[find_leads] Failed to add ${lead.companyName} to CRM:`, (e as Error).message);
            crmStatus = "Failed";
          }

          const contactInfo = [lead.contactInfo.email, lead.contactInfo.phone].filter(Boolean).join(", ") || "-";
          const websiteCol = lead.website || "-";
          const confidence = `${Math.round(lead.classificationConfidence * 100)}%`;
          resultText += `| ${i + 1} | ${lead.companyName} | ${lead.industry} | ${lead.classification} | ${confidence} | ${websiteCol} | ${contactInfo} | ${crmStatus} |\n`;
        }

        if (addedContacts.length > 0) {
          resultText += `\n**${addedContacts.length} leads automatically added to CRM.** Use \`search_contacts\` to view them.\n`;
        }

        await storage.createAgentAction({
          userId, agentType, actionType: "find_leads",
          description: `Lead search: "${product}" — found ${leads.length} qualified leads, added ${addedContacts.length} to CRM`,
          metadata: { product, industry, location, leadsFound: leads.length, addedToCrm: addedContacts.length, contactIds: addedContacts },
        });

        return {
          result: resultText,
          actionType: "find_leads",
          actionDescription: `🎯 Lead search: "${product}" — ${leads.length} leads found, ${addedContacts.length} added to CRM`
        };
      } catch (err) {
        console.error("[find_leads] Error:", (err as Error).message);
        return { result: `Lead search failed: ${(err as Error).message}` };
      }
    }

    case "search_contacts": {
      try {
        const contacts = await storage.searchRexContacts(userId, {
          query: args.query ? String(args.query) : undefined,
          segment: args.segment ? String(args.segment) : undefined,
          source: args.source ? String(args.source) : undefined,
          minScore: args.min_score ? Number(args.min_score) : undefined,
          limit: args.limit ? Number(args.limit) : 20,
        });
        if (contacts.length === 0) {
          return { result: "No contacts found matching your criteria." };
        }
        const summary = contacts.map((c, i) => 
          `${i + 1}. **${c.companyName}** — ${c.contactName}${c.position ? ` (${c.position})` : ""}\n   Email: ${c.email || "—"} | Phone: ${c.phone || "—"} | Score: ${c.leadScore} | Segment: ${c.segment}\n   ID: ${c.id}`
        ).join("\n");
        return {
          result: `Found ${contacts.length} contact(s):\n\n${summary}`,
          actionType: "crm_search",
          actionDescription: `🔍 CRM search: ${contacts.length} contact(s) found`,
        };
      } catch (err) {
        return { result: `Failed to search contacts: ${err instanceof Error ? err.message : "Unknown error"}` };
      }
    }

    case "create_contact": {
      try {
        const contact = await storage.createRexContact({
          userId,
          companyName: String(args.company_name),
          contactName: String(args.contact_name),
          email: args.email ? String(args.email) : undefined,
          phone: args.phone ? String(args.phone) : undefined,
          position: args.position ? String(args.position) : undefined,
          companySize: args.company_size ? String(args.company_size) : undefined,
          industry: args.industry ? String(args.industry) : undefined,
          website: args.website ? String(args.website) : undefined,
          isDecisionMaker: args.is_decision_maker ?? false,
          source: (args.source && LEAD_SOURCE_VALUES.includes(args.source as LeadSourceValue) ? args.source as LeadSourceValue : "cold"),
          segment: (args.segment && CUSTOMER_SEGMENT_VALUES.includes(args.segment as CustomerSegmentValue) ? args.segment as CustomerSegmentValue : "smb"),
          tags: args.tags || [],
          notes: args.notes ? String(args.notes) : undefined,
        });

        await storage.createAgentAction({
          userId, agentType,
          actionType: "crm_contact_created",
          description: `Contact created: ${contact.companyName} — ${contact.contactName}`,
          metadata: { contactId: contact.id, companyName: contact.companyName, contactName: contact.contactName },
        });

        return {
          result: `Contact created successfully!\n\nCompany: ${contact.companyName}\nContact: ${contact.contactName}\nEmail: ${contact.email || "—"}\nSegment: ${contact.segment}\nID: ${contact.id}\n\nYou can now create deals for this contact.`,
          actionType: "crm_contact_created",
          actionDescription: `👤 Contact: ${contact.companyName} — ${contact.contactName}`,
        };
      } catch (err) {
        return { result: `Failed to create contact: ${err instanceof Error ? err.message : "Unknown error"}` };
      }
    }

    case "create_deal": {
      try {
        const contact = await storage.getRexContact(String(args.contact_id), userId);
        if (!contact) return { result: "Contact not found. Please provide a valid contact ID." };

        const deal = await storage.createRexDeal({
          userId,
          contactId: String(args.contact_id),
          title: String(args.title),
          description: args.description ? String(args.description) : undefined,
          value: args.value ? String(args.value) : "0",
          currency: args.currency ? String(args.currency) : "TRY",
          monthlyRecurring: args.monthly_recurring ? String(args.monthly_recurring) : undefined,
          stage: (args.stage && DEAL_STAGE_VALUES.includes(args.stage as DealStageValue) ? args.stage as DealStageValue : "new_lead"),
          expectedClose: args.expected_close ? String(args.expected_close) : undefined,
          products: args.products || [],
        });

        await storage.createAgentAction({
          userId, agentType,
          actionType: "crm_deal_created",
          description: `Deal created: ${deal.title} (${deal.value} ${deal.currency})`,
          metadata: { dealId: deal.id, contactId: deal.contactId, title: deal.title, value: deal.value },
        });

        return {
          result: `Deal created successfully!\n\nTitle: ${deal.title}\nCompany: ${contact.companyName}\nValue: ${deal.value} ${deal.currency}\nStage: ${deal.stage}\nID: ${deal.id}`,
          actionType: "crm_deal_created",
          actionDescription: `💼 Deal: ${deal.title} (${deal.value} ${deal.currency})`,
        };
      } catch (err) {
        return { result: `Failed to create deal: ${err instanceof Error ? err.message : "Unknown error"}` };
      }
    }

    case "update_deal_stage": {
      try {
        const stageVal = String(args.stage) as DealStageValue;
        if (!DEAL_STAGE_VALUES.includes(stageVal)) return { result: `Invalid stage. Must be one of: ${DEAL_STAGE_VALUES.join(", ")}` };
        const deal = await storage.updateRexDealStage(String(args.deal_id), userId, stageVal, args.notes ? String(args.notes) : undefined);
        if (!deal) return { result: "Deal not found. Please provide a valid deal ID." };

        await storage.createAgentAction({
          userId, agentType,
          actionType: "crm_stage_change",
          description: `Deal stage updated: ${deal.title} → ${deal.stage}`,
          metadata: { dealId: deal.id, newStage: deal.stage, notes: args.notes },
        });

        return {
          result: `Deal stage updated!\n\nDeal: ${deal.title}\nNew Stage: ${deal.stage}\nProbability: ${deal.probability}%${args.notes ? `\nNotes: ${args.notes}` : ""}`,
          actionType: "crm_stage_change",
          actionDescription: `📊 Stage: ${deal.title} → ${deal.stage}`,
        };
      } catch (err) {
        return { result: `Failed to update deal stage: ${err instanceof Error ? err.message : "Unknown error"}` };
      }
    }

    case "get_pipeline_summary": {
      try {
        const pipeline = await storage.getRexPipelineSummary(userId);
        if (pipeline.length === 0) {
          return { result: "Your pipeline is empty. Create contacts and deals to get started." };
        }

        const stageEmojis: Record<string, string> = {
          new_lead: "🆕", contacted: "📞", qualified: "✅", proposal_sent: "📨",
          negotiation: "🤝", closed_won: "🏆", closed_lost: "❌",
        };

        const totalDeals = pipeline.reduce((s, p) => s + p.count, 0);
        const totalValue = pipeline.reduce((s, p) => s + p.totalValue, 0);
        const activeValue = pipeline.filter(p => !["closed_won", "closed_lost"].includes(p.stage)).reduce((s, p) => s + p.totalValue, 0);

        const lines = pipeline.map(p =>
          `${stageEmojis[p.stage] || "•"} **${p.stage.replace(/_/g, " ").toUpperCase()}**: ${p.count} deal(s) — ₺${p.totalValue.toLocaleString("tr-TR")}`
        ).join("\n");

        return {
          result: `Pipeline Summary\n${"─".repeat(30)}\n${lines}\n${"─".repeat(30)}\nTotal Deals: ${totalDeals}\nActive Pipeline Value: ₺${activeValue.toLocaleString("tr-TR")}\nTotal Value (incl. closed): ₺${totalValue.toLocaleString("tr-TR")}`,
          actionType: "crm_pipeline",
          actionDescription: `📊 Pipeline: ${totalDeals} deals, ₺${activeValue.toLocaleString("tr-TR")} active`,
        };
      } catch (err) {
        return { result: `Failed to get pipeline summary: ${err instanceof Error ? err.message : "Unknown error"}` };
      }
    }

    case "log_activity": {
      try {
        const contact = await storage.getRexContact(String(args.contact_id), userId);
        if (!contact) return { result: "Contact not found. Please provide a valid contact ID." };

        if (args.deal_id) {
          const deal = await storage.getRexDeal(String(args.deal_id), userId);
          if (!deal) return { result: "Deal not found or does not belong to you. Please provide a valid deal ID." };
        }

        const activity = await storage.createRexActivity({
          userId,
          contactId: String(args.contact_id),
          dealId: args.deal_id ? String(args.deal_id) : undefined,
          type: (ACTIVITY_TYPE_VALUES.includes(String(args.type) as ActivityTypeValue) ? String(args.type) as ActivityTypeValue : "note"),
          subject: String(args.subject),
          body: args.body ? String(args.body) : undefined,
          durationMinutes: args.duration_minutes ? Number(args.duration_minutes) : undefined,
          completedAt: new Date(),
          generatedBy: "rex",
        });

        await storage.createAgentAction({
          userId, agentType,
          actionType: "crm_activity_logged",
          description: `Activity logged: ${activity.type} — ${activity.subject} (${contact.companyName})`,
          metadata: { activityId: activity.id, contactId: contact.id, type: activity.type },
        });

        return {
          result: `Activity logged!\n\nType: ${activity.type}\nSubject: ${activity.subject}\nContact: ${contact.contactName} (${contact.companyName})\nID: ${activity.id}`,
          actionType: "crm_activity_logged",
          actionDescription: `📝 ${activity.type}: ${activity.subject}`,
        };
      } catch (err) {
        return { result: `Failed to log activity: ${err instanceof Error ? err.message : "Unknown error"}` };
      }
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
      try {
        const { triggerTaskCompleteNotification } = await import("./bossNotificationService");
        await triggerTaskCompleteNotification({
          userId,
          agentType,
          teamMemberName: displayName,
          taskDescription: `Close ticket #${closeId}: "${closed.subject}"`,
          result: resolution,
        });
      } catch (e) { console.error("[BossAI] ticket close notification error:", e); }

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
        try {
          const { triggerEmailSentNotification } = await import("./bossNotificationService");
          await triggerEmailSentNotification({
            userId,
            agentType,
            teamMemberName: displayName,
            recipientEmail: String(args.to),
            subject: String(args.subject),
            bodySnippet: String(args.body),
          });
        } catch (e) { console.error("[BossAI] customer email notification error:", e); }
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

    case "list_uploaded_files": {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const files = await db.select().from(uploadedFiles).where(eq(uploadedFiles.userId, userId));
      if (files.length === 0) {
        return { result: "Henüz yüklenmiş dosya yok. Chat'teki 📎 butonu ile Excel veya CSV dosyanızı yükleyebilirsiniz.", actionType: "list_files", actionDescription: "📁 Uploaded files listed" };
      }
      const list = files.map(f => `• [ID: ${f.id}] ${f.originalName} — ${f.rowCount || "?"} satır, ${(f.columnNames as string[] || []).length} kolon (${f.fileType})`).join("\n");
      return { result: `Yüklenen dosyalar:\n${list}`, actionType: "list_files", actionDescription: `📁 ${files.length} files listed` };
    }

    case "analyze_file": {
      try {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and: andOp } = await import("drizzle-orm");
      const fileId = Number(args.file_id);
      const [file] = await db.select().from(uploadedFiles).where(andOp(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId)));
      if (!file) return { result: "Dosya bulunamadı. Önce list_uploaded_files ile dosyalarınızı kontrol edin.", actionType: "analyze_file", actionDescription: "❌ File not found" };

      const { parseFile, analyzeData, formatTR } = await import("./services/dataAnalysisService");
      const rawData = parseFile(file.storedPath);
      const analysis = analyzeData(rawData);

      let result = `📊 DOSYA ANALİZİ: ${file.originalName}\n\n`;
      result += `📋 Genel: ${analysis.summary.rowCount} satır × ${analysis.summary.columnCount} kolon\n\n`;
      result += `📑 Kolonlar:\n`;
      for (const col of analysis.summary.columns) {
        result += `  • ${col.name} (${col.type}) — ${col.uniqueCount} benzersiz, ${col.nullCount} boş\n`;
      }

      result += `\n📈 İstatistikler:\n`;
      for (const [name, stats] of Object.entries(analysis.statistics)) {
        if (stats.sum !== undefined) {
          result += `  • ${name}: Min=${formatTR(stats.min!)} Max=${formatTR(stats.max!)} Ort=${formatTR(stats.mean!)} Top=${formatTR(stats.sum!)}\n`;
        } else if (stats.topValues) {
          result += `  • ${name}: ${stats.topValues.slice(0, 3).map(tv => `${tv.value}(${tv.count})`).join(", ")}\n`;
        }
      }

      if (analysis.insights.length > 0) {
        result += `\n💡 İçgörüler:\n${analysis.insights.map(i => `  • ${i}`).join("\n")}`;
      }

      const { suggestCharts } = await import("./services/chartService");
      const suggestions = suggestCharts(analysis);
      if (suggestions.length > 0) {
        result += `\n\n📊 Önerilen Grafikler:\n${suggestions.map(s => `  • ${s.type}: "${s.title}"`).join("\n")}`;
      }

      return { result, actionType: "analyze_file", actionDescription: `📊 Analyzed: ${file.originalName}` };
      } catch (err: any) {
        return { result: `Dosya analizi sırasında hata: ${err.message}`, actionType: "analyze_file", actionDescription: "❌ Analysis error" };
      }
    }

    case "query_file_data": {
      try {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and: andOp } = await import("drizzle-orm");
      const fileId = Number(args.file_id);
      const [file] = await db.select().from(uploadedFiles).where(andOp(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId)));
      if (!file) return { result: "Dosya bulunamadı.", actionType: "query_file", actionDescription: "❌ File not found" };

      const { parseFile, groupByData, filterData, formatTR } = await import("./services/dataAnalysisService");
      let rawData = parseFile(file.storedPath);

      if (args.filter_column && args.filter_operator && args.filter_value) {
        rawData = filterData(rawData, String(args.filter_column), String(args.filter_operator), args.filter_value);
      }

      if (args.group_by) {
        const aggCol = args.aggregate_column ? String(args.aggregate_column) : args.group_by as string;
        const aggFunc = (args.aggregate_function || "sum") as any;
        const grouped = groupByData(rawData, String(args.group_by), aggCol, aggFunc);
        const limit = args.limit ? Number(args.limit) : 20;
        const sorted = args.sort_order === "asc" ? grouped.reverse() : grouped;
        const limited = sorted.slice(0, limit);
        let result = `📊 ${args.group_by} bazında ${aggCol} (${aggFunc}):\n\n`;
        result += limited.map(g => `  ${g.label}: ${formatTR(g.value)}`).join("\n");
        result += `\n\nToplam: ${formatTR(grouped.reduce((s, g) => s + g.value, 0))} (${grouped.length} grup)`;
        return { result, actionType: "query_file", actionDescription: `📊 Queried: ${args.group_by} by ${aggCol}` };
      }

      const limit = args.limit ? Number(args.limit) : 20;
      const headers = rawData[0];
      const dataRows = rawData.slice(1, limit + 1);
      let result = `📋 Veri (${rawData.length - 1} satır${args.filter_column ? ", filtrelenmiş" : ""}):\n\n`;
      result += `| ${headers.join(" | ")} |\n`;
      result += `| ${headers.map(() => "---").join(" | ")} |\n`;
      for (const row of dataRows) {
        result += `| ${row.join(" | ")} |\n`;
      }
      if (rawData.length - 1 > limit) result += `\n...ve ${rawData.length - 1 - limit} satır daha`;
      return { result, actionType: "query_file", actionDescription: `📊 Queried ${file.originalName}` };
      } catch (err: any) {
        return { result: `Veri sorgusu sırasında hata: ${err.message}`, actionType: "query_file", actionDescription: "❌ Query error" };
      }
    }

    case "create_chart": {
      try {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and: andOp } = await import("drizzle-orm");
      const fileId = Number(args.file_id);
      const [file] = await db.select().from(uploadedFiles).where(andOp(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId)));
      if (!file) return { result: "Dosya bulunamadı.", actionType: "create_chart", actionDescription: "❌ File not found" };

      const { parseFile } = await import("./services/dataAnalysisService");
      const { createChartFromData, createTrendChart } = await import("./services/chartService");
      const rawData = parseFile(file.storedPath);

      let chartConfig;
      if (args.chart_type === "line" || args.chart_type === "area") {
        chartConfig = createTrendChart(rawData, String(args.x_column), String(args.y_column), args.title as string | undefined);
        if (args.chart_type === "area") chartConfig.type = "area";
      } else {
        chartConfig = createChartFromData(rawData, {
          type: String(args.chart_type),
          xColumn: String(args.x_column),
          yColumn: String(args.y_column),
          groupColumn: args.group_column as string | undefined,
          title: args.title as string | undefined,
          aggregate: args.aggregate as string | undefined,
        });
      }

      return {
        result: `[CHART]${JSON.stringify(chartConfig)}[/CHART]\n\n📊 "${chartConfig.title}" grafiği oluşturuldu.`,
        actionType: "create_chart",
        actionDescription: `📊 Chart: ${chartConfig.title}`,
      };
      } catch (err: any) {
        return { result: `Grafik oluşturma hatası: ${err.message}`, actionType: "create_chart", actionDescription: "❌ Chart error" };
      }
    }

    case "compare_columns": {
      try {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and: andOp } = await import("drizzle-orm");
      const fileId = Number(args.file_id);
      const [file] = await db.select().from(uploadedFiles).where(andOp(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId)));
      if (!file) return { result: "Dosya bulunamadı.", actionType: "compare_columns", actionDescription: "❌ File not found" };

      const { parseFile, correlate: correlateFn } = await import("./services/dataAnalysisService");
      const rawData = parseFile(file.storedPath);
      const result = correlateFn(rawData, String(args.column_1), String(args.column_2));

      return {
        result: `📊 Korelasyon Analizi: ${args.column_1} ↔ ${args.column_2}\n\nKorelasyon katsayısı: ${result.correlation}\nYorum: ${result.interpretation}`,
        actionType: "compare_columns",
        actionDescription: `📊 Correlation: ${args.column_1} vs ${args.column_2}`,
      };
      } catch (err: any) {
        return { result: `Korelasyon analizi hatası: ${err.message}`, actionType: "compare_columns", actionDescription: "❌ Correlation error" };
      }
    }

    case "detect_anomalies": {
      try {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and: andOp } = await import("drizzle-orm");
      const fileId = Number(args.file_id);
      const [file] = await db.select().from(uploadedFiles).where(andOp(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId)));
      if (!file) return { result: "Dosya bulunamadı.", actionType: "detect_anomalies", actionDescription: "❌ File not found" };

      const { parseFile, detectAnomalies: detectFn, formatTR } = await import("./services/dataAnalysisService");
      const rawData = parseFile(file.storedPath);
      const sensitivity = (args.sensitivity || "medium") as "low" | "medium" | "high";
      const result = detectFn(rawData, String(args.column), sensitivity);

      if (result.anomalies.length === 0) {
        return { result: `✅ "${args.column}" kolonunda anomali tespit edilmedi (ortalama: ${formatTR(result.mean)}, std: ${formatTR(result.stddev)}).`, actionType: "detect_anomalies", actionDescription: `✅ No anomalies in ${args.column}` };
      }

      let text = `⚠️ ${result.anomalies.length} anomali tespit edildi (${args.column}):\n\n`;
      text += `Ortalama: ${formatTR(result.mean)} | Std: ${formatTR(result.stddev)} | Eşik: ±${formatTR(result.threshold)}\n\n`;
      text += result.anomalies.map(a => `  • Satır ${a.row}: ${formatTR(a.value)} (sapma: ${formatTR(Math.abs(a.value - result.mean))})`).join("\n");

      return { result: text, actionType: "detect_anomalies", actionDescription: `⚠️ ${result.anomalies.length} anomalies in ${args.column}` };
      } catch (err: any) {
        return { result: `Anomali tespiti hatası: ${err.message}`, actionType: "detect_anomalies", actionDescription: "❌ Anomaly error" };
      }
    }

    case "trend_analysis": {
      try {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and: andOp } = await import("drizzle-orm");
      const fileId = Number(args.file_id);
      const [file] = await db.select().from(uploadedFiles).where(andOp(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId)));
      if (!file) return { result: "Dosya bulunamadı.", actionType: "trend_analysis", actionDescription: "❌ File not found" };

      const { parseFile, trendAnalysis: trendFn, formatTR } = await import("./services/dataAnalysisService");
      const rawData = parseFile(file.storedPath);
      const period = (args.period || "monthly") as any;
      const result = trendFn(rawData, String(args.date_column), String(args.value_column), period);

      let text = `📈 TREND ANALİZİ: ${args.value_column}\n\n`;
      text += `Trend: ${result.trend} (${result.change > 0 ? "+" : ""}${result.change}%)\n\n`;
      text += `Periyot Detayı:\n`;
      text += result.periods.map(p => `  ${p.period}: ${formatTR(p.value)}`).join("\n");

      const { createTrendChart } = await import("./services/chartService");
      const chartConfig = createTrendChart(rawData, String(args.date_column), String(args.value_column), `${args.value_column} Trend`, period);
      text += `\n\n[CHART]${JSON.stringify(chartConfig)}[/CHART]`;

      return { result: text, actionType: "trend_analysis", actionDescription: `📈 Trend: ${result.trend} (${result.change}%)` };
      } catch (err: any) {
        return { result: `Trend analizi hatası: ${err.message}`, actionType: "trend_analysis", actionDescription: "❌ Trend error" };
      }
    }

    case "generate_analysis_report": {
      try {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and: andOp } = await import("drizzle-orm");
      const fileId = Number(args.file_id);
      const [file] = await db.select().from(uploadedFiles).where(andOp(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId)));
      if (!file) return { result: "Dosya bulunamadı.", actionType: "generate_report", actionDescription: "❌ File not found" };

      const { parseFile, analyzeData, formatTR } = await import("./services/dataAnalysisService");
      const rawData = parseFile(file.storedPath);
      const analysis = analyzeData(rawData);
      const title = args.report_title ? String(args.report_title) : `${file.originalName} Analiz Raporu`;

      let reportContent = `# ${title}\n\n`;
      reportContent += `## Veri Özeti\n`;
      reportContent += `- Dosya: ${file.originalName}\n`;
      reportContent += `- Toplam Satır: ${analysis.summary.rowCount}\n`;
      reportContent += `- Kolon Sayısı: ${analysis.summary.columnCount}\n\n`;

      reportContent += `## Kolonlar\n`;
      for (const col of analysis.summary.columns) {
        reportContent += `- **${col.name}** (${col.type}): ${col.uniqueCount} benzersiz değer, ${col.nullCount} boş\n`;
      }

      reportContent += `\n## İstatistikler\n`;
      for (const [name, stats] of Object.entries(analysis.statistics)) {
        if (stats.sum !== undefined) {
          reportContent += `### ${name}\n- Min: ${formatTR(stats.min!)} | Max: ${formatTR(stats.max!)} | Ortalama: ${formatTR(stats.mean!)} | Toplam: ${formatTR(stats.sum!)}\n\n`;
        } else if (stats.topValues) {
          reportContent += `### ${name}\n- En sık: ${stats.topValues.map(tv => `${tv.value} (${tv.count})`).join(", ")}\n\n`;
        }
      }

      if (analysis.insights.length > 0) {
        reportContent += `## İçgörüler\n`;
        reportContent += analysis.insights.map(i => `- ${i}`).join("\n");
      }

      await storage.createAgentAction({
        userId, agentType,
        actionType: "analysis_report_generated",
        description: `📊 Analiz raporu oluşturuldu: ${title}`,
        metadata: { fileId, title, rowCount: analysis.summary.rowCount },
      });

      return {
        result: reportContent,
        actionType: "analysis_report_generated",
        actionDescription: `📊 Report: ${title}`,
      };
      } catch (err: any) {
        return { result: `Rapor oluşturma hatası: ${err.message}`, actionType: "generate_report", actionDescription: "❌ Report error" };
      }
    }

    case "export_filtered_data": {
      try {
      const { uploadedFiles } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and: andOp } = await import("drizzle-orm");
      const fileId = Number(args.file_id);
      const [file] = await db.select().from(uploadedFiles).where(andOp(eq(uploadedFiles.id, fileId), eq(uploadedFiles.userId, userId)));
      if (!file) return { result: "Dosya bulunamadı.", actionType: "export_data", actionDescription: "❌ File not found" };

      const { parseFile, filterData, groupByData } = await import("./services/dataAnalysisService");
      let rawData = parseFile(file.storedPath);

      if (args.filter_column && args.filter_operator && args.filter_value) {
        rawData = filterData(rawData, String(args.filter_column), String(args.filter_operator), args.filter_value);
      }

      const format = (args.format || "xlsx") as string;
      if (!["xlsx", "csv"].includes(format)) {
        return { result: "Desteklenmeyen format. Sadece xlsx veya csv kullanılabilir.", actionType: "export_data", actionDescription: "❌ Invalid format" };
      }
      const rawFilename = args.filename ? String(args.filename) : `export_${Date.now()}`;
      const sanitized = path.basename(rawFilename).replace(/[^a-zA-Z0-9_\-çğıöşüÇĞIÖŞÜ]/g, "_").slice(0, 100);
      const filename = sanitized || `export_${Date.now()}`;
      const uploadsDir = path.join(process.cwd(), "uploads", "data-analyst");
      const exportPath = path.join(uploadsDir, `${filename}.${format}`);
      const resolved = path.resolve(exportPath);
      if (!resolved.startsWith(path.resolve(uploadsDir))) {
        return { result: "Geçersiz dosya adı.", actionType: "export_data", actionDescription: "❌ Invalid filename" };
      }

      if (args.group_by) {
        const aggCol = args.aggregate_column ? String(args.aggregate_column) : "";
        const aggFunc = (args.aggregate_function || "sum") as any;
        const grouped = groupByData(rawData, String(args.group_by), aggCol, aggFunc);
        rawData = [
          [args.group_by, aggCol || "Count"],
          ...grouped.map(g => [g.label, g.value]),
        ];
      }

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet(rawData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(ws);
        fs.writeFileSync(exportPath, csv, "utf-8");
      } else {
        XLSX.writeFile(wb, exportPath);
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const [saved] = await db.insert(uploadedFiles).values({
        userId,
        originalName: `${filename}.${format}`,
        storedPath: exportPath,
        fileType: format,
        fileSize: fs.statSync(exportPath).size,
        rowCount: rawData.length - 1,
        columnNames: rawData[0],
        expiresAt,
      }).returning();

      return {
        result: `✅ Veri dışa aktarıldı: ${filename}.${format} (${rawData.length - 1} satır)\nDosya ID: ${saved.id} — /api/files/${saved.id}/download adresinden indirilebilir.`,
        actionType: "export_data",
        actionDescription: `📥 Exported: ${filename}.${format}`,
      };
      } catch (err: any) {
        return { result: `Veri dışa aktarma hatası: ${err.message}`, actionType: "export_data", actionDescription: "❌ Export error" };
      }
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
      const accountList = accounts.map(a => {
        const typeLabel = a.accountType === "business" ? "🔗 Business - API" : "👤 Personal - Manuel";
        return `- **${a.platform.charAt(0).toUpperCase() + a.platform.slice(1)}**: @${a.username} (${typeLabel})${a.profileUrl ? ` — ${a.profileUrl}` : ""} — ${a.status}`;
      }).join("\n");
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

    case "get_account_insights": {
      const platform = String(args.platform).toLowerCase();
      const includeRecentPosts = args.include_recent_posts === true;
      const accounts = await storage.getSocialAccounts(userId);
      const account = accounts.find(a => a.platform === platform && a.status === "connected");

      if (!account) {
        await storage.createAgentAction({
          userId, agentType, actionType: "insights_checked",
          description: `Tried to get ${platform} insights but no account connected`,
          metadata: { platform },
        });
        return {
          result: `❌ **${platform.charAt(0).toUpperCase() + platform.slice(1)}** hesabı bağlı değil.\n\nKullanıcı **Ayarlar > Sosyal Medya Hesapları** bölümünden bu platformu bağlayabilir.`,
          actionType: "insights_checked",
          actionDescription: `📊 ${platform} — hesap bağlı değil`,
        };
      }

      if (account.accountType !== "business") {
        await storage.createAgentAction({
          userId, agentType, actionType: "insights_checked",
          description: `${platform} account is Personal — no API access for insights`,
          metadata: { platform, accountType: account.accountType },
        });
        return {
          result: `📱 **${platform.charAt(0).toUpperCase() + platform.slice(1)}** hesabınız (@${account.username}) **Personal** olarak bağlı.\n\nPersonal hesaplarda API üzerinden istatistik çekme imkânı bulunmuyor. İstatistik ve analiz özelliklerini kullanabilmek için:\n\n1. **Ayarlar > Sosyal Medya Hesapları** bölümüne gidin\n2. Bu hesabı silin ve tekrar **Business/API** türünde ekleyin\n3. İlgili platform API anahtarlarını girin\n\n${platform === "instagram" ? "Instagram için **Meta Business Suite** üzerinden bir Business hesap oluşturmanız ve Access Token almanız gerekir." : ""}`,
          actionType: "insights_checked",
          actionDescription: `📊 ${platform} — Personal hesap, API erişimi yok`,
        };
      }

      let profileInfo = "";
      let recentPostsInfo = "";

      if (platform === "instagram") {
        const { fetchInstagramProfile, fetchInstagramRecentMedia } = await import("./socialPostingService");
        const profileResult = await fetchInstagramProfile(account);
        if (profileResult.success && profileResult.data) {
          const d = profileResult.data;
          profileInfo = `📊 **Instagram Hesap İstatistikleri** (@${d.username})\n\n` +
            `👤 **İsim:** ${d.name || "—"}\n` +
            `📝 **Bio:** ${d.biography || "—"}\n` +
            `👥 **Takipçi:** ${d.followersCount.toLocaleString("tr-TR")}\n` +
            `➡️ **Takip Edilen:** ${d.followsCount.toLocaleString("tr-TR")}\n` +
            `📸 **Toplam Gönderi:** ${d.mediaCount.toLocaleString("tr-TR")}\n` +
            `🌐 **Web Sitesi:** ${d.website || "—"}`;
        } else {
          profileInfo = `⚠️ Instagram profil bilgileri alınamadı: ${profileResult.error}`;
        }

        if (includeRecentPosts) {
          const mediaResult = await fetchInstagramRecentMedia(account, 6);
          if (mediaResult.success && mediaResult.posts && mediaResult.posts.length > 0) {
            recentPostsInfo = "\n\n📋 **Son Gönderiler:**\n" + mediaResult.posts.map((p, i) => {
              const date = p.timestamp ? new Date(p.timestamp).toLocaleDateString("tr-TR") : "?";
              return `${i + 1}. [${p.mediaType}] ${date} — ❤️ ${p.likeCount} 💬 ${p.commentCount}${p.caption ? ` — "${p.caption}"` : ""}`;
            }).join("\n");
          }
        }
      } else if (platform === "twitter") {
        const { fetchTwitterProfile } = await import("./socialPostingService");
        const profileResult = await fetchTwitterProfile(account);
        if (profileResult.success && profileResult.data) {
          const d = profileResult.data;
          profileInfo = `📊 **Twitter/X Hesap İstatistikleri** (@${d.username})\n\n` +
            `👤 **İsim:** ${d.name || "—"}\n` +
            `📝 **Bio:** ${d.description || "—"}\n` +
            `👥 **Takipçi:** ${d.followersCount.toLocaleString("tr-TR")}\n` +
            `➡️ **Takip Edilen:** ${d.followingCount.toLocaleString("tr-TR")}\n` +
            `🐦 **Toplam Tweet:** ${d.tweetCount.toLocaleString("tr-TR")}\n` +
            `📋 **Listelerde:** ${d.listedCount.toLocaleString("tr-TR")}`;
        } else {
          profileInfo = `⚠️ Twitter profil bilgileri alınamadı: ${profileResult.error}`;
        }
      } else {
        profileInfo = `📊 **${platform.charAt(0).toUpperCase() + platform.slice(1)}** hesabınız (@${account.username}) Business olarak bağlı.\n\nŞu anda bu platform için detaylı API istatistik çekme desteği Instagram ve Twitter için aktif. Diğer platformlar için yakında eklenecek.`;
      }

      await storage.createAgentAction({
        userId, agentType, actionType: "insights_fetched",
        description: `Fetched ${platform} account insights for @${account.username}`,
        metadata: { platform, username: account.username },
      });

      return {
        result: profileInfo + recentPostsInfo,
        actionType: "insights_fetched",
        actionDescription: `📊 ${platform} istatistikleri çekildi`,
      };
    }

    case "get_special_days": {
      const month = Math.min(Math.max(Number(args.month) || 1, 1), 12);
      const year = Number(args.year) || new Date().getFullYear();
      const country = String(args.country || "TR");

      const { getSpecialDays, formatSpecialDaysForAgent } = await import("./specialDaysCalendar");
      const days = getSpecialDays(month, year, country);
      const formatted = formatSpecialDaysForAgent(days);

      const monthNames: Record<number, string> = {
        1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
        7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık",
      };

      await storage.createAgentAction({
        userId, agentType, actionType: "special_days_checked",
        description: `📅 ${monthNames[month]} ${year} özel günleri listelendi (${days.length} gün)`,
        metadata: { month, year, country, count: days.length },
      });

      return {
        result: `📅 **${monthNames[month]} ${year} Özel Günler** (${country === "TR" ? "Türkiye" : country}) — ${days.length} gün\n\n${formatted}`,
        actionType: "special_days_checked",
        actionDescription: `📅 ${monthNames[month]} ${year} — ${days.length} özel gün`,
      };
    }

    case "create_monthly_program": {
      const month = Math.min(Math.max(Number(args.month) || 1, 1), 12);
      const year = Number(args.year) || new Date().getFullYear();
      const platforms = args.platforms ? String(args.platforms) : "instagram";
      const industry = args.industry ? String(args.industry) : "genel";
      const country = String(args.country || "TR");

      const { getSpecialDays, bestPostingTimes } = await import("./specialDaysCalendar");
      const specialDays = getSpecialDays(month, year, country);
      const countryTimes = bestPostingTimes[country] || bestPostingTimes["TR"];
      const primaryPlatform = platforms.split(",")[0].trim();
      const timesForPlatform = countryTimes[primaryPlatform] || countryTimes["instagram"];

      const monthNames: Record<number, string> = {
        1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 5: "Mayıs", 6: "Haziran",
        7: "Temmuz", 8: "Ağustos", 9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık",
      };

      const daysInMonth = new Date(year, month, 0).getDate();
      const contentTypes = ["📸 Görsel Post", "🎠 Carousel", "🎬 Reel/Video", "📖 Story", "📝 Metin Post", "🔴 Canlı Yayın"];
      const weekThemes = ["Tanıtım & Değer", "Eğitim & Bilgi", "Etkileşim & Topluluk", "Satış & Kampanya"];

      let program = `📅 **${monthNames[month]} ${year} — Aylık İçerik Programı**\n`;
      program += `🏷️ Sektör: ${industry} | 📱 Platformlar: ${platforms}\n`;
      program += `⏰ Önerilen Saatler: Hafta içi ${timesForPlatform.weekday[0] || "12:00-13:00"}, Hafta sonu ${timesForPlatform.weekend[0] || "10:00-12:00"}\n\n`;

      const specialDayMap = new Map<number, typeof specialDays[0]>();
      for (const sd of specialDays) {
        const dayNum = parseInt(sd.date.split("-")[2]);
        specialDayMap.set(dayNum, sd);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dayOfWeek = date.getDay();
        const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        const weekNum = Math.ceil(d / 7);
        const theme = weekThemes[(weekNum - 1) % weekThemes.length];
        const contentType = contentTypes[d % contentTypes.length];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const timeSlot = isWeekend
          ? (timesForPlatform.weekend[0] || "10:00-12:00")
          : (timesForPlatform.weekday[Math.min(d % 3, timesForPlatform.weekday.length - 1)] || "12:00-13:00");

        const sd = specialDayMap.get(d);
        const dateStr = `${String(d).padStart(2, "0")}.${String(month).padStart(2, "0")}`;

        if (sd) {
          program += `🌟 **${dateStr} ${dayNames[dayOfWeek]}** — ${sd.nameTR}\n`;
          program += `   ${contentType} | ⏰ ${timeSlot} | 🎯 ${sd.contentIdeas[0] || theme}\n\n`;
        } else {
          program += `📌 **${dateStr} ${dayNames[dayOfWeek]}** — Hafta ${weekNum}: ${theme}\n`;
          program += `   ${contentType} | ⏰ ${timeSlot}\n\n`;
        }
      }

      program += `---\n💡 **Notlar:**\n`;
      program += `- ${timesForPlatform.notes}\n`;
      program += `- Özel günlerde (🌟) mutlaka tematik içerik paylaşın\n`;
      program += `- Haftada en az 1 Reel/Video paylaşımı etkileşimi artırır\n`;
      program += `- Story'ler günde 3-5 adet paylaşılabilir`;

      await storage.createAgentAction({
        userId, agentType, actionType: "monthly_program_created",
        description: `📅 ${monthNames[month]} ${year} aylık program oluşturuldu (${industry}, ${platforms})`,
        metadata: { month, year, platforms, industry, country, daysInMonth, specialDaysCount: specialDays.length },
      });

      return {
        result: program,
        actionType: "monthly_program_created",
        actionDescription: `📅 ${monthNames[month]} ${year} aylık program (${daysInMonth} gün)`,
      };
    }

    case "analyze_competitor": {
      const handle = String(args.competitor_handle).replace("@", "");
      const platform = String(args.platform).toLowerCase();

      await storage.createAgentAction({
        userId, agentType, actionType: "competitor_analyzed",
        description: `🔍 Competitor analysis started: @${handle} on ${platform}`,
        metadata: { handle, platform },
      });

      return {
        result: `🔍 **Rakip Analizi Başlatıldı**\n\n` +
          `Rakip: **@${handle}** (${platform.charAt(0).toUpperCase() + platform.slice(1)})\n\n` +
          `Bu analizi yapmak için web araştırması yapacağım. Lütfen aşağıdaki bilgileri de paylaşın (varsa):\n\n` +
          `Şimdi @${handle} hakkında araştırma yaparak şu bilgileri toplamaya çalışacağım:\n` +
          `- İçerik stratejisi ve paylaşım sıklığı\n` +
          `- Kullandığı hashtag'ler\n` +
          `- Takipçi kitlesi ve etkileşim düzeyi\n` +
          `- Güçlü ve zayıf yönleri\n` +
          `- Sizin için farklılaşma önerileri\n\n` +
          `Araştırmayı tamamladıktan sonra detaylı raporu sunacağım. Web araştırması başlatıyorum...`,
        actionType: "competitor_analyzed",
        actionDescription: `🔍 Rakip analizi: @${handle} (${platform})`,
        requiresFollowUp: true,
      };
    }

    case "get_best_posting_times": {
      const platform = String(args.platform).toLowerCase();
      const country = String(args.country || "TR");

      const { bestPostingTimes } = await import("./specialDaysCalendar");
      const countryTimes = bestPostingTimes[country] || bestPostingTimes["TR"];
      const times = countryTimes[platform];

      if (!times) {
        return {
          result: `⚠️ **${platform}** platformu için paylaşım saati verisi henüz mevcut değil. Desteklenen platformlar: ${Object.keys(countryTimes).join(", ")}`,
          actionType: "posting_times_checked",
          actionDescription: `⏰ ${platform} — veri yok`,
        };
      }

      const countryName = country === "TR" ? "Türkiye" : country === "US" ? "ABD" : country;
      const weekdaySlots = times.weekday.map(t => `  🟢 ${t}`).join("\n");
      const weekendSlots = times.weekend.length > 0
        ? times.weekend.map(t => `  🔵 ${t}`).join("\n")
        : "  ⚪ Hafta sonu bu platform için önerilmiyor";

      await storage.createAgentAction({
        userId, agentType, actionType: "posting_times_checked",
        description: `⏰ Best posting times checked for ${platform} in ${countryName}`,
        metadata: { platform, country },
      });

      return {
        result: `⏰ **${platform.charAt(0).toUpperCase() + platform.slice(1)} — En İyi Paylaşım Saatleri** (${countryName})\n\n` +
          `📅 **Hafta İçi:**\n${weekdaySlots}\n\n` +
          `📅 **Hafta Sonu:**\n${weekendSlots}\n\n` +
          `💡 **Not:** ${times.notes}`,
        actionType: "posting_times_checked",
        actionDescription: `⏰ ${platform} paylaşım saatleri (${countryName})`,
      };
    }

    case "optimize_profile": {
      const platform = String(args.platform).toLowerCase();
      const industry = args.industry ? String(args.industry) : "";
      let currentBio = args.current_bio ? String(args.current_bio) : "";

      const accounts = await storage.getSocialAccounts(userId);
      const account = accounts.find(a => a.platform === platform && a.status === "connected");

      if (account && account.accountType === "business" && !currentBio) {
        if (platform === "instagram") {
          const { fetchInstagramProfile } = await import("./socialPostingService");
          const profileResult = await fetchInstagramProfile(account);
          if (profileResult.success && profileResult.data) {
            currentBio = profileResult.data.biography || "";
          }
        } else if (platform === "twitter") {
          const { fetchTwitterProfile } = await import("./socialPostingService");
          const profileResult = await fetchTwitterProfile(account);
          if (profileResult.success && profileResult.data) {
            currentBio = profileResult.data.description || "";
          }
        }
      }

      await storage.createAgentAction({
        userId, agentType, actionType: "profile_optimized",
        description: `✨ Profile optimization suggestions for ${platform}${currentBio ? " (bio fetched)" : ""}`,
        metadata: { platform, industry, hasBio: !!currentBio },
      });

      let result = `✨ **${platform.charAt(0).toUpperCase() + platform.slice(1)} Profil Optimizasyonu**\n\n`;

      if (currentBio) {
        result += `📝 **Mevcut Bio:**\n"${currentBio}"\n\n`;
      }

      result += `Profil optimizasyonu için şu alanlarda öneriler sunacağım:\n\n` +
        `1. 📝 **Bio/Biyografi** — SEO uyumlu, keşfet'e uygun anahtar kelimeler\n` +
        `2. 🎯 **CTA (Harekete Geçirici)** — Link, DM veya web sitesi yönlendirmesi\n` +
        `3. 😎 **Emoji Kullanımı** — Görsel çekicilik artırma\n` +
        `4. #️⃣ **Anahtar Kelimeler** — Platform algoritmasına uygun terimler\n` +
        `5. 🖼️ **Profil Görseli** — Marka tutarlılığı önerileri\n`;

      if (industry) {
        result += `\n🏷️ Sektörünüz: **${industry}** — Sektöre özel öneriler de dahil edilecek.`;
      }

      result += `\n\nŞimdi detaylı önerilerimi hazırlıyorum...`;

      return {
        result,
        actionType: "profile_optimized",
        actionDescription: `✨ ${platform} profil optimizasyonu`,
      };
    }

    case "get_trending_topics": {
      const platform = args.platform ? String(args.platform).toLowerCase() : "genel";
      const country = String(args.country || "TR");
      const countryName = country === "TR" ? "Türkiye" : country === "US" ? "ABD" : country;

      await storage.createAgentAction({
        userId, agentType, actionType: "trends_checked",
        description: `🔥 Trending topics checked for ${platform} in ${countryName}`,
        metadata: { platform, country },
      });

      return {
        result: `🔥 **${countryName} — Güncel Trendler** (${platform !== "genel" ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Tüm Platformlar"})\n\n` +
          `Güncel trendleri araştırmak için web araması yapacağım. Bu bilgiler gerçek zamanlı verilerden gelecek.\n\n` +
          `Araştıracaklarım:\n` +
          `- 📈 Popüler hashtag'ler\n` +
          `- 🗣️ Gündem konuları\n` +
          `- 🎵 Viral içerikler\n` +
          `- 💡 İçerik fırsatları\n\n` +
          `Web araştırması başlatıyorum...`,
        actionType: "trends_checked",
        actionDescription: `🔥 ${countryName} trendleri (${platform})`,
        requiresFollowUp: true,
      };
    }

    case "create_invoice": {
      const clientName = String(args.client_name);
      const clientEmail = args.client_email ? String(args.client_email) : null;
      const dueDays = Number(args.due_days) || 30;
      const notes = args.notes ? String(args.notes) : null;
      const defaultKdvRate = args.kdv_rate !== undefined ? Number(args.kdv_rate) : 20;
      const tevkifatRate = args.tevkifat_rate ? String(args.tevkifat_rate) : "none";
      const currency = args.currency ? String(args.currency).toUpperCase() : "TRY";

      const itemsRaw = String(args.items);
      const parsedItems = itemsRaw.split(";").filter(s => s.trim()).map(item => {
        const parts = item.trim().split("|");
        const price = Number(parts[2]?.trim());
        const quantity = Number(parts[1]?.trim());
        const itemKdv = parts[3] !== undefined ? Number(parts[3].trim()) : defaultKdvRate;
        return {
          description: parts[0]?.trim() || "Kalem",
          quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
          price: isNaN(price) ? 0 : price,
          kdvRate: isNaN(itemKdv) || itemKdv < 0 || itemKdv > 100 ? defaultKdvRate : itemKdv,
        };
      });

      if (parsedItems.length === 0 || parsedItems.every(i => i.price === 0)) {
        return {
          result: "⚠️ Geçerli fatura kalemi bulunamadı. Lütfen kalemleri 'Açıklama|Adet|Fiyat' formatında girin.",
          actionType: "invoice_error",
          actionDescription: "⚠️ Fatura hatası: geçersiz kalemler",
        };
      }

      let tcmbRate: number | null = null;
      if (currency !== "TRY") {
        try {
          const tcmbResp = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml");
          const tcmbXml = await tcmbResp.text();
          const rateMatch = new RegExp(`CurrencyCode="${currency}"[\\s\\S]*?<ForexSelling>([^<]*)<\\/ForexSelling>`).exec(tcmbXml);
          if (rateMatch) {
            tcmbRate = parseFloat(rateMatch[1].replace(",", "."));
          }
        } catch {
          console.error("[Invoice] TCMB rate fetch failed for", currency);
        }
        if (!tcmbRate) {
          return {
            result: `⚠️ ${currency} için TCMB döviz kuru alınamadı. Fatura oluşturulamadı.\n\nLütfen:\n1. Daha sonra tekrar deneyin\n2. Veya tutarı ₺ (TRY) cinsinden girin`,
            actionType: "invoice_error",
            actionDescription: `⚠️ Fatura hatası: ${currency} kuru alınamadı`,
          };
        }
      }

      const itemsWithKdv = parsedItems.map(item => {
        const lineSubtotal = item.quantity * item.price;
        const lineKdv = lineSubtotal * (item.kdvRate / 100);
        return { ...item, lineSubtotal, lineKdv };
      });

      const subtotal = itemsWithKdv.reduce((sum, item) => sum + item.lineSubtotal, 0);
      const kdvAmount = itemsWithKdv.reduce((sum, item) => sum + item.lineKdv, 0);
      let tevkifatAmount = 0;
      if (tevkifatRate !== "none") {
        const [num, den] = tevkifatRate.split("/").map(Number);
        tevkifatAmount = kdvAmount * (num / den);
      }
      const grandTotal = subtotal + kdvAmount - tevkifatAmount;
      const invoiceNumber = `FTR-${Date.now().toString(36).toUpperCase()}`;

      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const currencySymbol = currency === "TRY" ? "₺" : currency;

      const grandTotalTL = tcmbRate ? grandTotal * tcmbRate : grandTotal;
      const subtotalTL = tcmbRate ? subtotal * tcmbRate : subtotal;

      const itemLines = itemsWithKdv.map(item =>
        `  ${item.description} × ${item.quantity} = ${currencySymbol}${formatNum(item.lineSubtotal)} (KDV %${item.kdvRate}: ${currencySymbol}${formatNum(item.lineKdv)})`
      ).join("\n");

      const fxNote = tcmbRate
        ? `\n\n💱 Döviz Kuru (TCMB Satış): 1 ${currency} = ₺${tcmbRate.toLocaleString("tr-TR", { minimumFractionDigits: 4 })}\nTL Karşılığı: ₺${formatNum(grandTotalTL)} (VUK md. 280)`
        : "";

      const invoiceDate = new Date().toISOString().split("T")[0];
      const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().split("T")[0];

      let savedInvoiceId: number | null = null;
      try {
        const [savedInvoice] = await db.insert(invoices).values({
          userId,
          invoiceNo: invoiceNumber,
          invoiceType: tevkifatRate !== "none" ? "tevkifat" : "satis",
          invoiceDate,
          dueDate,
          buyerName: clientName,
          subtotal: subtotal.toFixed(2),
          kdvRate: defaultKdvRate,
          kdvAmount: kdvAmount.toFixed(2),
          tevkifatRate: tevkifatRate !== "none" ? tevkifatRate : null,
          tevkifatAmount: tevkifatAmount.toFixed(2),
          total: grandTotal.toFixed(2),
          currency,
          notes,
          status: "sent",
        }).returning();

        savedInvoiceId = savedInvoice.id;

        await db.insert(invoiceItems).values(
          itemsWithKdv.map((item, i) => ({
            invoiceId: savedInvoice.id,
            description: item.description,
            quantity: item.quantity.toFixed(2),
            unit: "Adet",
            unitPrice: item.price.toFixed(2),
            kdvRate: item.kdvRate,
            amount: item.lineSubtotal.toFixed(2),
            sortOrder: i,
          }))
        );
      } catch (dbErr: any) {
        console.error("[Invoice] DB save error:", dbErr.message);
      }

      await storage.createAgentAction({
        userId, agentType,
        actionType: "invoice_created",
        description: `🧾 Fatura ${invoiceNumber} — ${clientName} — ${currencySymbol}${formatNum(grandTotal)}${tcmbRate ? ` (₺${formatNum(grandTotalTL)})` : ""} (KDV${tevkifatRate !== "none" ? `, Tevkifat ${tevkifatRate}` : ""})`,
        metadata: { invoiceNumber, invoiceId: savedInvoiceId, clientName, clientEmail, subtotal, subtotalTL, kdvAmount, tevkifatRate, tevkifatAmount, grandTotal, grandTotalTL, items: itemsWithKdv, dueDays, notes, currency, tcmbRate, amount: grandTotalTL },
      });

      if (clientEmail) {
        await sendEmail({
          userId,
          to: clientEmail,
          subject: `Fatura ${invoiceNumber}`,
          body: `Sayın ${clientName},\n\nFaturanız aşağıdadır:\n\nFatura No: ${invoiceNumber}\nKalemler:\n${itemLines}\n\nAra Toplam: ${currencySymbol}${formatNum(subtotal)}\nKDV: ${currencySymbol}${formatNum(kdvAmount)}${tevkifatRate !== "none" ? `\nTevkifat (${tevkifatRate}): -${currencySymbol}${formatNum(tevkifatAmount)}` : ""}\nGenel Toplam: ${currencySymbol}${formatNum(grandTotal)}\nVade: ${dueDays} gün${fxNote}\n\n${notes ? `Notlar: ${notes}\n\n` : ""}Teşekkür ederiz.`,
          agentType,
        });
      }

      const downloadLinks = savedInvoiceId
        ? `\n\n📥 [PDF İndir](/api/invoices/${savedInvoiceId}/pdf) | [Excel İndir](/api/invoices/${savedInvoiceId}/excel)`
        : "";

      return {
        result: `Fatura ${invoiceNumber} oluşturuldu!\n\nMüşteri: ${clientName}${clientEmail ? `\nE-posta: ${clientEmail} (fatura gönderildi)` : ""}\n\nKalemler:\n${itemLines}\n\nAra Toplam: ${currencySymbol}${formatNum(subtotal)}\nKDV: ${currencySymbol}${formatNum(kdvAmount)}${tevkifatRate !== "none" ? `\nTevkifat (${tevkifatRate}): -${currencySymbol}${formatNum(tevkifatAmount)}` : ""}\nGenel Toplam: ${currencySymbol}${formatNum(grandTotal)}\nVade: ${dueDays} gün${fxNote}${notes ? `\nNotlar: ${notes}` : ""}${downloadLinks}`,
        actionType: "invoice_created",
        actionDescription: `🧾 Fatura ${invoiceNumber}: ${currencySymbol}${formatNum(grandTotal)}${tcmbRate ? ` (₺${formatNum(grandTotalTL)})` : ""} — ${clientName}`,
      };
    }

    case "log_expense": {
      const description = String(args.description);
      const amount = Number(args.amount);
      const category = String(args.category);
      const date = args.date ? String(args.date) : new Date().toISOString().split("T")[0];
      const vendor = args.vendor ? String(args.vendor) : null;
      const kdvAmount = args.kdv_amount ? Number(args.kdv_amount) : null;

      const expenseId = `GDR-${Date.now().toString(36).toUpperCase()}`;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const categoryNames: Record<string, string> = {
        ofis: "Ofis", yazilim: "Yazılım", seyahat: "Seyahat", pazarlama: "Pazarlama",
        maas: "Maaş/Bordro", faturalar: "Faturalar", ekipman: "Ekipman",
        profesyonel_hizmet: "Profesyonel Hizmet", vergi: "Vergi/Harç",
        kira: "Kira", sigorta: "Sigorta", diger: "Diğer",
      };
      const categoryLabel = categoryNames[category] || category;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "expense_logged",
        description: `💸 Gider: ₺${formatNum(amount)} — ${description} [${categoryLabel}]`,
        metadata: { expenseId, description, amount, category, categoryLabel, date, vendor, kdvAmount },
      });

      return {
        result: `Gider ${expenseId} kaydedildi!\n\nAçıklama: ${description}\nTutar: ₺${formatNum(amount)}${kdvAmount ? `\nKDV: ₺${formatNum(kdvAmount)}` : ""}\nKategori: ${categoryLabel}\nTarih: ${date}${vendor ? `\nTedarikçi: ${vendor}` : ""}`,
        actionType: "expense_logged",
        actionDescription: `💸 Gider: ₺${formatNum(amount)} — ${description}`,
      };
    }

    case "log_income": {
      const description = String(args.description);
      const amount = Number(args.amount);
      const category = String(args.category);
      const date = args.date ? String(args.date) : new Date().toISOString().split("T")[0];
      const clientName = args.client_name ? String(args.client_name) : null;
      const kdvAmount = args.kdv_amount ? Number(args.kdv_amount) : null;

      const incomeId = `GLR-${Date.now().toString(36).toUpperCase()}`;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const categoryNames: Record<string, string> = {
        satis: "Satış", hizmet: "Hizmet", kira: "Kira Geliri",
        faiz: "Faiz Geliri", komisyon: "Komisyon", diger: "Diğer Gelir",
      };
      const categoryLabel = categoryNames[category] || category;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "income_logged",
        description: `💰 Gelir: ₺${formatNum(amount)} — ${description} [${categoryLabel}]`,
        metadata: { incomeId, description, amount, category, categoryLabel, date, clientName, kdvAmount },
      });

      return {
        result: `Gelir ${incomeId} kaydedildi!\n\nAçıklama: ${description}\nTutar: ₺${formatNum(amount)}${kdvAmount ? `\nKDV: ₺${formatNum(kdvAmount)}` : ""}\nKategori: ${categoryLabel}\nTarih: ${date}${clientName ? `\nMüşteri: ${clientName}` : ""}`,
        actionType: "income_logged",
        actionDescription: `💰 Gelir: ₺${formatNum(amount)} — ${description}`,
      };
    }

    case "financial_summary": {
      const period = args.period ? String(args.period) : "month";
      const periodDays: Record<string, number> = { week: 7, month: 30, quarter: 90, year: 365 };
      const days = periodDays[period] || 30;
      const periodNames: Record<string, string> = { week: "Haftalık", month: "Aylık", quarter: "Çeyreklik", year: "Yıllık" };
      const periodLabel = periodNames[period] || period;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const allActions = await storage.getActionsByUser(userId);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const periodActions = allActions.filter(a => new Date(a.createdAt).getTime() >= cutoff);

      const invoices = periodActions.filter(a => a.actionType === "invoice_created");
      const expenses = periodActions.filter(a => a.actionType === "expense_logged");
      const incomes = periodActions.filter(a => a.actionType === "income_logged");

      const totalInvoiced = invoices.reduce((sum, a) => {
        const meta = a.metadata as Record<string, unknown>;
        return sum + (Number(meta?.grandTotalTL) || Number(meta?.grandTotal) || Number(meta?.subtotal) || 0);
      }, 0);

      const totalIncome = incomes.reduce((sum, a) => {
        const meta = a.metadata as Record<string, unknown>;
        return sum + (Number(meta?.amount) || 0);
      }, 0);

      const totalExpenses = expenses.reduce((sum, a) => {
        const meta = a.metadata as Record<string, unknown>;
        return sum + (Number(meta?.amount) || 0);
      }, 0);

      const totalRevenue = totalInvoiced + totalIncome;

      const expenseCategoryCounts: Record<string, number> = {};
      for (const e of expenses) {
        const meta = e.metadata as Record<string, unknown>;
        const cat = String(meta?.categoryLabel || meta?.category || "Diğer");
        expenseCategoryCounts[cat] = (expenseCategoryCounts[cat] || 0) + (Number(meta?.amount) || 0);
      }

      const incomeCategoryCounts: Record<string, number> = {};
      for (const inc of incomes) {
        const meta = inc.metadata as Record<string, unknown>;
        const cat = String(meta?.categoryLabel || meta?.category || "Diğer");
        incomeCategoryCounts[cat] = (incomeCategoryCounts[cat] || 0) + (Number(meta?.amount) || 0);
      }

      const expenseReport = Object.entries(expenseCategoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `  ${k}: ₺${formatNum(v)}`)
        .join("\n");

      const incomeReport = Object.entries(incomeCategoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `  ${k}: ₺${formatNum(v)}`)
        .join("\n");

      await storage.createAgentAction({
        userId, agentType,
        actionType: "financial_summary",
        description: `📊 ${periodLabel} mali özet oluşturuldu`,
        metadata: { period, totalInvoiced, totalIncome, totalExpenses, totalRevenue, invoiceCount: invoices.length, expenseCount: expenses.length, incomeCount: incomes.length },
      });

      return {
        result: `📊 MALİ ÖZET (${periodLabel})\n\n💰 Gelirler:\n  Faturalar: ₺${formatNum(totalInvoiced)} (${invoices.length} adet)\n  Diğer Gelirler: ₺${formatNum(totalIncome)} (${incomes.length} adet)\n  Toplam Gelir: ₺${formatNum(totalRevenue)}\n\n💸 Giderler: ₺${formatNum(totalExpenses)} (${expenses.length} adet)\n\n📈 Net Kâr/Zarar: ₺${formatNum(totalRevenue - totalExpenses)}\n\n${incomeReport ? `Gelir Kategorileri:\n${incomeReport}\n\n` : ""}${expenseReport ? `Gider Kategorileri:\n${expenseReport}` : "Bu dönemde gider kaydı yok."}`,
        actionType: "financial_summary",
        actionDescription: `📊 ${periodLabel} mali özet`,
      };
    }

    case "get_exchange_rate": {
      const currency = args.currency ? String(args.currency).toUpperCase() : null;
      const amount = args.amount ? Number(args.amount) : null;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
      const formatTL = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      try {
        const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml");
        const xmlText = await response.text();

        const rates: Record<string, { buying: number; selling: number; name: string }> = {};
        const currencyRegex = /<Currency[^>]*CurrencyCode="([^"]+)"[^>]*>[\s\S]*?<Isim>([^<]*)<\/Isim>[\s\S]*?<ForexBuying>([^<]*)<\/ForexBuying>[\s\S]*?<ForexSelling>([^<]*)<\/ForexSelling>[\s\S]*?<\/Currency>/g;
        let match;
        while ((match = currencyRegex.exec(xmlText)) !== null) {
          const code = match[1];
          const name = match[2];
          const buying = parseFloat(match[3].replace(",", "."));
          const selling = parseFloat(match[4].replace(",", "."));
          if (!isNaN(buying) && !isNaN(selling)) {
            rates[code] = { buying, selling, name };
          }
        }

        if (Object.keys(rates).length === 0) {
          return {
            result: "TCMB kur verisine şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.",
            actionType: "exchange_rate_checked",
            actionDescription: "💱 TCMB kur sorgusu — hata",
          };
        }

        if (currency && rates[currency]) {
          const r = rates[currency];
          let resultText = `💱 TCMB Döviz Kuru — ${currency}\n\n${r.name}\nAlış: ₺${formatNum(r.buying)}\nSatış: ₺${formatNum(r.selling)}`;
          if (amount) {
            resultText += `\n\n${amount} ${currency} = ₺${formatTL(amount * r.buying)} (alış kuru ile)`;
            resultText += `\n${amount} ${currency} = ₺${formatTL(amount * r.selling)} (satış kuru ile)`;
          }
          return {
            result: resultText,
            actionType: "exchange_rate_checked",
            actionDescription: `💱 TCMB ${currency} kuru: ₺${formatNum(r.buying)}`,
          };
        } else if (currency) {
          return {
            result: `${currency} kuru TCMB listesinde bulunamadı. Geçerli döviz kodlarını kontrol edin.`,
            actionType: "exchange_rate_checked",
            actionDescription: `💱 ${currency} kuru bulunamadı`,
          };
        }

        const mainCurrencies = ["USD", "EUR", "GBP", "CHF", "JPY", "SAR", "AUD", "CAD"];
        const rateLines = mainCurrencies
          .filter(c => rates[c])
          .map(c => `  ${c} (${rates[c].name}): Alış ₺${formatNum(rates[c].buying)} / Satış ₺${formatNum(rates[c].selling)}`)
          .join("\n");

        return {
          result: `💱 TCMB Günlük Döviz Kurları\n\n${rateLines}`,
          actionType: "exchange_rate_checked",
          actionDescription: "💱 TCMB günlük kurlar sorgulandı",
        };
      } catch {
        return {
          result: "TCMB kur servisine bağlanılamadı. İnternet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.",
          actionType: "exchange_rate_checked",
          actionDescription: "💱 TCMB kur sorgusu — bağlantı hatası",
        };
      }
    }

    case "add_receivable": {
      const entityName = String(args.entity_name);
      const amount = Number(args.amount);
      const dueDate = String(args.due_date);
      const description = args.description ? String(args.description) : "";
      const invoiceNo = args.invoice_no ? String(args.invoice_no) : null;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const recId = `ALC-${Date.now().toString(36).toUpperCase()}`;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "receivable_added",
        description: `📥 Alacak: ₺${formatNum(amount)} — ${entityName} (Vade: ${dueDate})`,
        metadata: { recId, entityName, amount, dueDate, description, invoiceNo, status: "open" },
      });

      return {
        result: `Alacak ${recId} kaydedildi!\n\nBorçlu: ${entityName}\nTutar: ₺${formatNum(amount)}\nVade: ${dueDate}${description ? `\nAçıklama: ${description}` : ""}${invoiceNo ? `\nFatura No: ${invoiceNo}` : ""}`,
        actionType: "receivable_added",
        actionDescription: `📥 Alacak: ₺${formatNum(amount)} — ${entityName}`,
      };
    }

    case "add_payable": {
      const entityName = String(args.entity_name);
      const amount = Number(args.amount);
      const dueDate = String(args.due_date);
      const description = args.description ? String(args.description) : "";
      const invoiceNo = args.invoice_no ? String(args.invoice_no) : null;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const payId = `BRC-${Date.now().toString(36).toUpperCase()}`;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "payable_added",
        description: `📤 Borç: ₺${formatNum(amount)} — ${entityName} (Vade: ${dueDate})`,
        metadata: { payId, entityName, amount, dueDate, description, invoiceNo, status: "open" },
      });

      return {
        result: `Borç ${payId} kaydedildi!\n\nAlacaklı: ${entityName}\nTutar: ₺${formatNum(amount)}\nVade: ${dueDate}${description ? `\nAçıklama: ${description}` : ""}${invoiceNo ? `\nFatura No: ${invoiceNo}` : ""}`,
        actionType: "payable_added",
        actionDescription: `📤 Borç: ₺${formatNum(amount)} — ${entityName}`,
      };
    }

    case "list_debts": {
      const filterType = args.type ? String(args.type) : "all";
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const allActions = await storage.getActionsByUser(userId);
      const today = new Date().toISOString().split("T")[0];

      const receivables = allActions.filter(a => a.actionType === "receivable_added");
      const payables = allActions.filter(a => a.actionType === "payable_added");

      const formatDebt = (a: typeof allActions[0], type: string) => {
        const meta = a.metadata as Record<string, unknown>;
        const dueDate = String(meta?.dueDate || "");
        const isOverdue = dueDate < today;
        return `  ${isOverdue ? "⚠️" : "✅"} ${meta?.entityName} — ₺${formatNum(Number(meta?.amount))} — Vade: ${dueDate}${isOverdue ? " (GECİKMİŞ)" : ""}${meta?.description ? ` — ${meta.description}` : ""}`;
      };

      let resultParts: string[] = [];
      let totalReceivable = 0;
      let totalPayable = 0;
      let overdueReceivable = 0;
      let overduePayable = 0;

      const getMeta = (a: typeof allActions[0]) => (a.metadata || {}) as Record<string, unknown>;

      if (filterType === "all" || filterType === "receivable" || filterType === "overdue") {
        const filtered = filterType === "overdue"
          ? receivables.filter(a => String(getMeta(a).dueDate || "") < today)
          : receivables;
        totalReceivable = receivables.reduce((s, a) => s + Number(getMeta(a).amount || 0), 0);
        overdueReceivable = receivables.filter(a => String(getMeta(a).dueDate || "") < today).reduce((s, a) => s + Number(getMeta(a).amount || 0), 0);
        if (filtered.length > 0) {
          resultParts.push(`📥 ALACAKLAR (Toplam: ₺${formatNum(totalReceivable)}${overdueReceivable > 0 ? ` — ⚠️ Gecikmiş: ₺${formatNum(overdueReceivable)}` : ""})\n${filtered.map(a => formatDebt(a, "receivable")).join("\n")}`);
        } else {
          resultParts.push("📥 ALACAKLAR: Kayıt yok");
        }
      }

      if (filterType === "all" || filterType === "payable" || filterType === "overdue") {
        const filtered = filterType === "overdue"
          ? payables.filter(a => String(getMeta(a).dueDate || "") < today)
          : payables;
        totalPayable = payables.reduce((s, a) => s + Number(getMeta(a).amount || 0), 0);
        overduePayable = payables.filter(a => String(getMeta(a).dueDate || "") < today).reduce((s, a) => s + Number(getMeta(a).amount || 0), 0);
        if (filtered.length > 0) {
          resultParts.push(`📤 BORÇLAR (Toplam: ₺${formatNum(totalPayable)}${overduePayable > 0 ? ` — ⚠️ Gecikmiş: ₺${formatNum(overduePayable)}` : ""})\n${filtered.map(a => formatDebt(a, "payable")).join("\n")}`);
        } else {
          resultParts.push("📤 BORÇLAR: Kayıt yok");
        }
      }

      if (filterType === "all") {
        resultParts.push(`\n📊 Net Durum: ₺${formatNum(totalReceivable - totalPayable)} (Alacak - Borç)`);
      }

      return {
        result: resultParts.join("\n\n"),
        actionType: "debts_listed",
        actionDescription: "📋 Borç-alacak listesi görüntülendi",
      };
    }

    case "cash_flow_forecast": {
      const forecastDays = args.days ? Number(args.days) : 30;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const allActions = await storage.getActionsByUser(userId);
      const now = Date.now();
      const past30 = now - 30 * 24 * 60 * 60 * 1000;
      const futureDate = new Date(now + forecastDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      const recentIncomes = allActions.filter(a => (a.actionType === "income_logged" || a.actionType === "invoice_created") && new Date(a.createdAt).getTime() >= past30);
      const recentExpenses = allActions.filter(a => a.actionType === "expense_logged" && new Date(a.createdAt).getTime() >= past30);

      const monthlyIncome = recentIncomes.reduce((s, a) => {
        const meta = a.metadata as Record<string, unknown>;
        return s + (Number(meta?.grandTotalTL) || Number(meta?.amount) || Number(meta?.grandTotal) || Number(meta?.subtotal) || 0);
      }, 0);

      const monthlyExpense = recentExpenses.reduce((s, a) => {
        const meta = a.metadata as Record<string, unknown>;
        return s + (Number(meta?.amount) || 0);
      }, 0);

      const getM = (a: typeof allActions[0]) => (a.metadata || {}) as Record<string, unknown>;

      const upcomingReceivables = allActions
        .filter(a => a.actionType === "receivable_added")
        .filter(a => {
          const due = String(getM(a).dueDate || "");
          return due >= today && due <= futureDate;
        });

      const upcomingPayables = allActions
        .filter(a => a.actionType === "payable_added")
        .filter(a => {
          const due = String(getM(a).dueDate || "");
          return due >= today && due <= futureDate;
        });

      const expectedReceivable = upcomingReceivables.reduce((s, a) => s + Number(getM(a).amount || 0), 0);
      const expectedPayable = upcomingPayables.reduce((s, a) => s + Number(getM(a).amount || 0), 0);

      const projectedIncome = (monthlyIncome / 30) * forecastDays + expectedReceivable;
      const projectedExpense = (monthlyExpense / 30) * forecastDays + expectedPayable;
      const projectedNet = projectedIncome - projectedExpense;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "cash_flow_forecast",
        description: `📈 ${forecastDays} günlük nakit akış tahmini`,
        metadata: { forecastDays, monthlyIncome, monthlyExpense, expectedReceivable, expectedPayable, projectedIncome, projectedExpense, projectedNet },
      });

      return {
        result: `📈 NAKİT AKIŞ TAHMİNİ (${forecastDays} Gün)\n\n📊 Son 30 Gün Trendi:\n  Aylık Gelir: ₺${formatNum(monthlyIncome)}\n  Aylık Gider: ₺${formatNum(monthlyExpense)}\n\n🔮 ${forecastDays} Günlük Projeksiyon:\n  Beklenen Gelir (trend): ₺${formatNum(projectedIncome - expectedReceivable)}\n  Vadesi Gelen Alacaklar: ₺${formatNum(expectedReceivable)} (${upcomingReceivables.length} adet)\n  Beklenen Gider (trend): ₺${formatNum(projectedExpense - expectedPayable)}\n  Vadesi Gelen Borçlar: ₺${formatNum(expectedPayable)} (${upcomingPayables.length} adet)\n\n💰 Toplam Tahmini Gelir: ₺${formatNum(projectedIncome)}\n💸 Toplam Tahmini Gider: ₺${formatNum(projectedExpense)}\n📈 Tahmini Net: ₺${formatNum(projectedNet)}${projectedNet < 0 ? "\n\n⚠️ DİKKAT: Negatif nakit akışı bekleniyor! Tahsilat hızlandırma veya gider erteleme değerlendirilmeli." : ""}`,
        actionType: "cash_flow_forecast",
        actionDescription: `📈 ${forecastDays} gün nakit akış tahmini: ₺${formatNum(projectedNet)}`,
      };
    }

    case "generate_balance_sheet": {
      const parseEntries = (raw: string | undefined) => {
        if (!raw) return [];
        return raw.split(";").filter(s => s.trim()).map(e => {
          const p = e.trim().split("|");
          return { hesapKodu: p[0]?.trim() || "", hesapAdi: p[1]?.trim() || "", tutar: parseFloat(p[2]?.trim() || "0") };
        });
      };

      const bilanco = {
        donenVarliklar: parseEntries(args.entries_aktif_donen ? String(args.entries_aktif_donen) : undefined),
        duranVarliklar: parseEntries(args.entries_aktif_duran ? String(args.entries_aktif_duran) : undefined),
        kisaVadeliYukulumlukler: parseEntries(args.entries_kisa_vadeli ? String(args.entries_kisa_vadeli) : undefined),
        uzunVadeliYukulumlukler: parseEntries(args.entries_uzun_vadeli ? String(args.entries_uzun_vadeli) : undefined),
        ozkaynaklar: parseEntries(args.entries_ozkaynak ? String(args.entries_ozkaynak) : undefined),
      };

      const period = args.period ? String(args.period) : "";
      const companyName = args.company_name ? String(args.company_name) : "";
      const reportId = `BLN-${Date.now().toString(36).toUpperCase()}`;

      const { buffer, totals } = await generateBilanco({ bilanco, period, companyName });
      const b64 = buffer.toString("base64");
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      await storage.createAgentAction({
        userId, agentType,
        actionType: "report_generated",
        description: `Bilanco olusturuldu — Aktif: ${formatNum(totals.toplamAktif)} TL`,
        metadata: { reportId, reportType: "bilanco", period, companyName, toplamAktif: totals.toplamAktif, toplamPasif: totals.toplamPasif, ozkaynakToplam: totals.ozkaynakToplam, excelBase64: b64 },
      });

      return {
        result: `Bilanco raporu olusturuldu! (${reportId})\n\n${companyName ? `Firma: ${companyName}\n` : ""}${period ? `Donem: ${period}\n` : ""}Toplam Aktif: ${formatNum(totals.toplamAktif)} TL\nToplam Pasif: ${formatNum(totals.toplamPasif)} TL\nOzkaynaklar: ${formatNum(totals.ozkaynakToplam)} TL\n\nExcel dosyasi hazir — indirmek icin asagidaki linki kullanin:\n[Bilanco Excel Indir](/api/reports/${reportId}/download)`,
        actionType: "balance_sheet_generated",
        actionDescription: `Bilanco: Aktif ${formatNum(totals.toplamAktif)} TL`,
      };
    }

    case "generate_income_statement": {
      const period = args.period ? String(args.period) : "month";
      const periodDays: Record<string, number> = { month: 30, quarter: 90, year: 365 };
      const days = periodDays[period] || 30;
      const periodNames: Record<string, string> = { month: "Aylık", quarter: "Çeyreklik", year: "Yıllık" };
      const periodLabel = periodNames[period] || period;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const allActions = await storage.getActionsByUser(userId);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const periodActions = allActions.filter(a => new Date(a.createdAt).getTime() >= cutoff);

      const invoiceRevenue = periodActions
        .filter(a => a.actionType === "invoice_created")
        .reduce((s, a) => {
          const meta = a.metadata as Record<string, unknown>;
          return s + (Number(meta?.subtotalTL) || Number(meta?.subtotal) || 0);
        }, 0);

      const otherIncome = periodActions
        .filter(a => a.actionType === "income_logged")
        .reduce((s, a) => {
          const meta = a.metadata as Record<string, unknown>;
          return s + Number(meta?.amount || 0);
        }, 0);

      const totalRevenue = invoiceRevenue + otherIncome;

      const expensesByCategory: Record<string, number> = {};
      const expenses = periodActions.filter(a => a.actionType === "expense_logged");
      for (const e of expenses) {
        const meta = e.metadata as Record<string, unknown>;
        const cat = String(meta?.categoryLabel || meta?.category || "Diğer");
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(meta?.amount || 0);
      }

      const totalExpenses = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);
      const operatingProfit = totalRevenue - totalExpenses;

      const reportId = `GLR-${Date.now().toString(36).toUpperCase()}`;
      const faaliyetGiderleri = Object.entries(expensesByCategory).map(([ad, tutar]) => ({ ad, tutar }));

      const buf = await generateGelirTablosu({
        financials: {
          satislar: invoiceRevenue,
          satisIndirimleri: 0,
          satislarinMaliyeti: 0,
          faaliyet_giderleri: faaliyetGiderleri,
          diger_gelirler: otherIncome,
        },
        period: periodLabel,
        companyName: "",
      });
      const b64 = buf.toString("base64");

      await storage.createAgentAction({
        userId, agentType,
        actionType: "report_generated",
        description: `${periodLabel} gelir tablosu olusturuldu`,
        metadata: { reportId, reportType: "gelir_tablosu", period, totalRevenue, totalExpenses, operatingProfit, excelBase64: b64 },
      });

      return {
        result: `Gelir Tablosu olusturuldu! (${reportId})\n\nDonem: ${periodLabel}\nNet Satislar: ${formatNum(totalRevenue)} TL\nToplam Giderler: ${formatNum(totalExpenses)} TL\nFaaliyet Kari: ${formatNum(operatingProfit)} TL${operatingProfit < 0 ? "\n\nDonem zararla kapanmistir." : ""}\n\nExcel dosyasi hazir:\n[Gelir Tablosu Excel Indir](/api/reports/${reportId}/download)`,
        actionType: "income_statement_generated",
        actionDescription: `${periodLabel} gelir tablosu: Kar ${formatNum(operatingProfit)} TL`,
      };
    }

    case "calculate_payroll": {
      const grossSalary = Number(args.gross_salary);
      const cumulativeTaxBase = args.cumulative_tax_base ? Number(args.cumulative_tax_base) : 0;
      const disabilityDegree = args.disability_degree ? Number(args.disability_degree) : 0;
      const isMinimumWage = args.is_minimum_wage === true;
      const year = args.year ? Number(args.year) : 2026;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const SGK_WORKER_RATE = 0.14;
      const SGK_UNEMPLOYMENT_WORKER = 0.01;
      const SGK_EMPLOYER_RATE = 0.2175;
      const SGK_UNEMPLOYMENT_EMPLOYER = 0.02;
      const STAMP_TAX_RATE = 0.00759;

      const yearParams: Record<number, { minWage: number; ceiling: number; brackets: { limit: number; rate: number }[] }> = {
        2025: {
          minWage: 22104.67,
          ceiling: 198942,
          brackets: [
            { limit: 158000, rate: 0.15 },
            { limit: 330000, rate: 0.20 },
            { limit: 1250000, rate: 0.27 },
            { limit: 4700000, rate: 0.35 },
            { limit: Infinity, rate: 0.40 },
          ],
        },
        2026: {
          minWage: 33030,
          ceiling: 297270,
          brackets: [
            { limit: 190000, rate: 0.15 },
            { limit: 400000, rate: 0.20 },
            { limit: 1500000, rate: 0.27 },
            { limit: 5300000, rate: 0.35 },
            { limit: Infinity, rate: 0.40 },
          ],
        },
      };

      const params = yearParams[year] || yearParams[2026];
      const MIN_WAGE = params.minWage;
      const SGK_CEILING = params.ceiling;
      const taxBrackets = params.brackets;

      const sgkBase = Math.min(grossSalary, SGK_CEILING);
      const sgkWorker = sgkBase * SGK_WORKER_RATE;
      const unemploymentWorker = sgkBase * SGK_UNEMPLOYMENT_WORKER;
      const totalWorkerDeduction = sgkWorker + unemploymentWorker;

      const sgkEmployer = sgkBase * SGK_EMPLOYER_RATE;
      const unemploymentEmployer = sgkBase * SGK_UNEMPLOYMENT_EMPLOYER;
      const totalEmployerCost = grossSalary + sgkEmployer + unemploymentEmployer;

      let taxableIncome = grossSalary - totalWorkerDeduction;

      const disabilityExemptions: Record<number, number> = { 1: 6900, 2: 4000, 3: 1700 };
      if (disabilityDegree > 0 && disabilityExemptions[disabilityDegree]) {
        taxableIncome = Math.max(0, taxableIncome - disabilityExemptions[disabilityDegree]);
      }

      const calcTax = (base: number, cumulative: number): number => {
        let tax = 0;
        let remaining = base;
        let processed = cumulative;
        for (const bracket of taxBrackets) {
          if (processed >= bracket.limit) continue;
          const availableInBracket = bracket.limit - processed;
          const taxableInBracket = Math.min(remaining, availableInBracket);
          if (taxableInBracket <= 0) continue;
          tax += taxableInBracket * bracket.rate;
          remaining -= taxableInBracket;
          processed += taxableInBracket;
          if (remaining <= 0) break;
        }
        return tax;
      };

      let incomeTax = calcTax(taxableIncome, cumulativeTaxBase);

      let stampTax = grossSalary * STAMP_TAX_RATE;

      let minWageExemptionTax = 0;
      let minWageExemptionStamp = 0;
      if (!isMinimumWage) {
        const minWageTaxable = MIN_WAGE - (MIN_WAGE * (SGK_WORKER_RATE + SGK_UNEMPLOYMENT_WORKER));
        minWageExemptionTax = calcTax(minWageTaxable, 0);
        minWageExemptionStamp = MIN_WAGE * STAMP_TAX_RATE;
        incomeTax = Math.max(0, incomeTax - minWageExemptionTax);
        stampTax = Math.max(0, stampTax - minWageExemptionStamp);
      }

      if (isMinimumWage) {
        incomeTax = 0;
        stampTax = 0;
      }

      const totalDeductions = totalWorkerDeduction + incomeTax + stampTax;
      const netSalary = grossSalary - totalDeductions;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "payroll_calculated",
        description: `💰 Bordro hesaplama (${year}): Brüt ₺${formatNum(grossSalary)} → Net ₺${formatNum(netSalary)}`,
        metadata: { year, grossSalary, netSalary, sgkWorker, unemploymentWorker, incomeTax, stampTax, sgkEmployer, unemploymentEmployer, totalEmployerCost, cumulativeTaxBase, newCumulativeTaxBase: cumulativeTaxBase + taxableIncome },
      });

      return {
        result: `💰 BORDRO HESAPLAMA (${year})\n══════════════════════════════════\n\nBrüt Maaş: ₺${formatNum(grossSalary)}\nAsgari Ücret (${year}): ₺${formatNum(MIN_WAGE)}\nSGK Tavan: ₺${formatNum(SGK_CEILING)}\n\n── İŞÇİ KESİNTİLERİ ──\n  SGK İşçi Payı (%14): ₺${formatNum(sgkWorker)}\n  İşsizlik Sigortası (%1): ₺${formatNum(unemploymentWorker)}\n  Gelir Vergisi Matrahı: ₺${formatNum(taxableIncome)}\n  Gelir Vergisi: ₺${formatNum(incomeTax)}${!isMinimumWage && minWageExemptionTax > 0 ? ` (AGİ istisna: ₺${formatNum(minWageExemptionTax)} düşüldü)` : ""}${isMinimumWage ? " (Asgari ücret istisnası)" : ""}\n  Damga Vergisi (‰7,59): ₺${formatNum(stampTax)}${isMinimumWage ? " (Asgari ücret istisnası)" : ""}\n  TOPLAM KESİNTİ: ₺${formatNum(totalDeductions)}\n\n══════════════════════════════════\n  NET MAAŞ: ₺${formatNum(netSalary)}\n══════════════════════════════════\n\n── İŞVEREN MALİYETİ ──\n  SGK İşveren Payı (%21,75): ₺${formatNum(sgkEmployer)}\n  İşsizlik İşveren (%2): ₺${formatNum(unemploymentEmployer)}\n  TOPLAM İŞVEREN MALİYETİ: ₺${formatNum(totalEmployerCost)}\n\nKümülatif Matrah (bu ay dahil): ₺${formatNum(cumulativeTaxBase + taxableIncome)}`,
        actionType: "payroll_calculated",
        actionDescription: `💰 Bordro (${year}): Brüt ₺${formatNum(grossSalary)} → Net ₺${formatNum(netSalary)}`,
      };
    }

    case "calculate_withholding": {
      const amount = Number(args.amount);
      const withholdingType = String(args.type);
      const isGross = args.is_gross !== false;
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const rates: Record<string, { rate: number; label: string; law: string }> = {
        serbest_meslek: { rate: 0.20, label: "Serbest Meslek Stopajı", law: "GVK md. 94/2" },
        kira_gercek: { rate: 0.20, label: "Kira Stopajı (Gerçek Kişi)", law: "GVK md. 94/5-a" },
        kira_tuzel: { rate: 0, label: "Kira Stopajı (Tüzel Kişi)", law: "Stopaj yok" },
        telif: { rate: 0.17, label: "Telif Hakkı Stopajı", law: "GVK md. 94/2-a" },
        insaat_hakedis: { rate: 0.05, label: "Yıllara Yaygın İnşaat Hakediş Stopajı", law: "GVK md. 94/3" },
        temettu: { rate: 0.10, label: "Temettü (Kâr Payı) Stopajı", law: "GVK md. 94/6" },
        faiz: { rate: 0.15, label: "Mevduat Faizi Stopajı", law: "GVK geçici md. 67" },
      };

      const config = rates[withholdingType];
      if (!config) {
        return {
          result: `Geçersiz stopaj türü: ${withholdingType}. Geçerli türler: ${Object.keys(rates).join(", ")}`,
          actionType: "withholding_calculated",
          actionDescription: "❌ Geçersiz stopaj türü",
        };
      }

      let grossAmount: number;
      let withholdingAmount: number;
      let netAmount: number;

      if (isGross) {
        grossAmount = amount;
        withholdingAmount = grossAmount * config.rate;
        netAmount = grossAmount - withholdingAmount;
      } else {
        netAmount = amount;
        grossAmount = config.rate < 1 ? netAmount / (1 - config.rate) : netAmount;
        withholdingAmount = grossAmount - netAmount;
      }

      return {
        result: `📋 STOPAJ HESAPLAMA\n══════════════════════════════════\n\nTür: ${config.label}\nYasal Dayanak: ${config.law}\nOran: %${(config.rate * 100).toFixed(0)}\n\nBrüt Tutar: ₺${formatNum(grossAmount)}\nStopaj (${isGross ? "kesilen" : "hesaplanan"}): ₺${formatNum(withholdingAmount)}\nNet Tutar: ₺${formatNum(netAmount)}\n\n══════════════════════════════════\nMuhasebe Kaydı:\n  Borç: 770 GYG / 740 Hizmet Üretim — ₺${formatNum(grossAmount)}\n  Alacak: 360 Ödenecek Vergi — ₺${formatNum(withholdingAmount)}\n  Alacak: 320 Satıcılar / 102 Banka — ₺${formatNum(netAmount)}`,
        actionType: "withholding_calculated",
        actionDescription: `📋 Stopaj: ${config.label} — ₺${formatNum(withholdingAmount)}`,
      };
    }

    case "calculate_kdv": {
      const result = hesaplaKDV(args.tutar, args.kdvOrani, args.dahilMi, args.tevkifatOrani);
      await storage.createAgentAction({
        userId, agentType,
        actionType: "kdv_calculated",
        description: `🧮 KDV hesaplama: ${formatTL(result.netTutar)} + KDV %${result.kdvOrani} = ${formatTL(result.toplamTutar)}`,
        metadata: result,
      });
      return {
        result: JSON.stringify(result),
        actionType: "kdv_calculated",
        actionDescription: `🧮 KDV: ${formatTL(result.toplamTutar)}`,
      };
    }

    case "calculate_bordro": {
      const result = hesaplaBordro({
        brutUcret: args.brutUcret,
        cocukSayisi: args.cocukSayisi,
        medeniDurum: args.medeniDurum,
        besOrani: args.besOrani,
        kumulatifGvMatrahi: args.kumulatifGvMatrahi
      });
      await storage.createAgentAction({
        userId, agentType,
        actionType: "bordro_calculated",
        description: `🧮 Bordro: Brüt ${formatTL(result.brutUcret)} → Net ${formatTL(result.netUcret)}`,
        metadata: result,
      });
      return {
        result: JSON.stringify(result),
        actionType: "bordro_calculated",
        actionDescription: `🧮 Bordro: Net ${formatTL(result.netUcret)}`,
      };
    }

    case "calculate_amortisman": {
      const result = hesaplaAmortisman(args.maliyet, args.faydaliOmur, args.yontem);
      await storage.createAgentAction({
        userId, agentType,
        actionType: "amortisman_calculated",
        description: `🧮 Amortisman (${result.yontem}): ${formatTL(args.maliyet)} — ${result.faydaliOmur} yıl — yıllık ${formatTL(result.yillikAmortisman)}`,
        metadata: result,
      });
      return {
        result: JSON.stringify(result),
        actionType: "amortisman_calculated",
        actionDescription: `🧮 Amortisman: ${formatTL(result.yillikAmortisman)}/yıl`,
      };
    }

    case "calculate_kur_degerleme": {
      const result = hesaplaKurDegerlemesi(
        args.dovizTutar, args.dovizCinsi, args.kayitKuru, args.degerlemeKuru, args.hesapTuru
      );
      await storage.createAgentAction({
        userId, agentType,
        actionType: "kur_degerleme_calculated",
        description: `🧮 Kur değerleme: ${result.dovizTutar} ${result.dovizCinsi} — ${result.kurFarkiTuru === 'kambiyo_kari' ? 'Kambiyo Kârı' : 'Kambiyo Zararı'} ${formatTL(result.kurFarki)}`,
        metadata: result,
      });
      return {
        result: JSON.stringify(result),
        actionType: "kur_degerleme_calculated",
        actionDescription: `🧮 Kur: ${formatTL(result.kurFarki)} ${result.kurFarkiTuru === 'kambiyo_kari' ? 'kâr' : 'zarar'}`,
      };
    }

    case "calculate_stopaj": {
      const result = hesaplaStopaj(args.brutTutar, args.gelirTuru, args.kdvOrani, args.kdvTevkifatOrani);
      await storage.createAgentAction({
        userId, agentType,
        actionType: "stopaj_calculated",
        description: `🧮 Stopaj: ${formatTL(result.brutTutar)} brüt — %${result.stopajOrani} stopaj = ${formatTL(result.stopajTutari)}`,
        metadata: result,
      });
      return {
        result: JSON.stringify(result),
        actionType: "stopaj_calculated",
        actionDescription: `🧮 Stopaj: ${formatTL(result.brutTutar)} brüt — %${result.stopajOrani} stopaj = ${formatTL(result.stopajTutari)}`,
      };
    }
    case "parse_efatura_xml": {
      const { parseEFatura } = await import("./efatura-kdv-parser");
      const result = parseEFatura(args.xml_content);
      if (result.success && result.invoice) {
        const inv = result.invoice;
        const fDate = inv.faturaTarihi.split(".").reverse().join("-");
        const eDon = args.donem || "";
        await db.execute(sql`INSERT INTO indirilecek_kdv_faturalar (user_id, donem, sira_no, fatura_tarihi, belge_no, satici_unvani, satici_vkn, belge_turu, matrah, kdv_orani, kdv_tutari, hesap_kodu, para_birimi, profil_id) VALUES (${userId}, ${eDon}, ${0}, ${fDate}, ${inv.belgeNo}, ${inv.saticiUnvani}, ${inv.saticiVKN}, ${inv.belgeTuru}, ${inv.matrah}, ${inv.kdvOrani}, ${inv.kdvTutari}, ${inv.hesapKodu}, ${inv.paraBirimi}, ${inv.profilId}) ON CONFLICT (user_id, belge_no) DO NOTHING`);
      }
      await storage.createAgentAction({ userId, agentType, actionType: "efatura_parsed", description: `📄 e-Fatura parse: ${result.success ? result.invoice?.belgeNo : "HATA"}`, metadata: result });
      return { result: JSON.stringify(result), actionType: "efatura_parsed", actionDescription: `📄 e-Fatura: ${result.success ? result.invoice?.belgeNo : "Parse hatası"}` };
    }
    case "generate_kdv_listesi": {
      const rows = await db.execute(sql`SELECT * FROM indirilecek_kdv_faturalar WHERE user_id = ${userId} AND donem = ${args.donem} ORDER BY fatura_tarihi`);
      const ozet = await db.execute(sql`SELECT * FROM v_indirilecek_kdv_ozet WHERE user_id = ${userId} AND donem = ${args.donem}`);
      const rapor = { donem: args.donem, faturalar: rows.rows, ozetler: ozet.rows, toplamFatura: rows.rows.length };
      await storage.createAgentAction({ userId, agentType, actionType: "kdv_listesi_generated", description: `📋 İndirilecek KDV Listesi: ${args.donem} — ${rows.rows.length} fatura`, metadata: rapor });
      return { result: JSON.stringify(rapor), actionType: "kdv_listesi_generated", actionDescription: `📋 KDV Listesi: ${args.donem} (${rows.rows.length} fatura)` };
    }

    case "format_yevmiye": {
      const kayit = formatYevmiyeKaydi(args.tarih, args.aciklama, args.satirlar);
      const md = yevmiyeToMarkdown(kayit);
      await storage.createAgentAction({
        userId, agentType,
        actionType: "yevmiye_formatted",
        description: `📋 Yevmiye kaydı: ${args.aciklama} — ${kayit.satirlar.length} satır — ${kayit.dengeli ? 'Dengeli' : 'DENGESİZ!'}`,
        metadata: kayit,
      });
      return {
        result: md,
        actionType: "yevmiye_formatted",
        actionDescription: `📋 Yevmiye: ${args.aciklama}`,
      };
    }

    case "generate_mizan": {
      const entriesRaw = String(args.entries);
      const period = args.period ? String(args.period) : "";
      const companyName = args.company_name ? String(args.company_name) : "";

      const entries = entriesRaw.split(";").filter(s => s.trim()).map(e => {
        const p = e.trim().split("|");
        return {
          hesapKodu: p[0]?.trim() || "",
          hesapAdi: p[1]?.trim() || "",
          borcToplami: parseFloat(p[2]?.trim() || "0"),
          alacakToplami: parseFloat(p[3]?.trim() || "0"),
        };
      });

      const reportId = `MZN-${Date.now().toString(36).toUpperCase()}`;
      const buf = await generateMizan({ entries, period, companyName });
      const b64 = buf.toString("base64");

      await storage.createAgentAction({
        userId, agentType,
        actionType: "report_generated",
        description: `📊 Mizan raporu oluşturuldu — ${entries.length} hesap${period ? ` (${period})` : ""}`,
        metadata: { reportId, reportType: "mizan", entries: entries.length, period, companyName, excelBase64: b64 },
      });

      return {
        result: `📊 Mizan raporu oluşturuldu! (${reportId})\n\n${companyName ? `Firma: ${companyName}\n` : ""}${period ? `Dönem: ${period}\n` : ""}Hesap sayısı: ${entries.length}\n\n📥 Excel dosyası hazır — indirmek için aşağıdaki linki kullanın:\n[Excel İndir](/api/reports/${reportId}/download)`,
        actionType: "report_generated",
        actionDescription: `📊 Mizan raporu: ${entries.length} hesap`,
      };
    }

    case "generate_bordro": {
      const empRaw = String(args.employees);
      const period = args.period ? String(args.period) : "";
      const companyName = args.company_name ? String(args.company_name) : "";

      const employees = empRaw.split(";").filter(s => s.trim()).map(e => {
        const p = e.trim().split("|");
        return {
          ad: p[0]?.trim() || "",
          tc: p[1]?.trim() || undefined,
          brutUcret: parseFloat(p[2]?.trim() || "0"),
        };
      });

      const reportId = `BRD-${Date.now().toString(36).toUpperCase()}`;
      const buf = await generateBordro({ employees, period, companyName });
      const b64 = buf.toString("base64");

      const totalBrut = employees.reduce((s, e) => s + e.brutUcret, 0);
      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      await storage.createAgentAction({
        userId, agentType,
        actionType: "report_generated",
        description: `📊 Bordro raporu oluşturuldu — ${employees.length} çalışan${period ? ` (${period})` : ""}`,
        metadata: { reportId, reportType: "bordro", employees: employees.length, totalBrut, period, companyName, excelBase64: b64 },
      });

      return {
        result: `📊 Bordro raporu oluşturuldu! (${reportId})\n\n${companyName ? `Firma: ${companyName}\n` : ""}${period ? `Dönem: ${period}\n` : ""}Çalışan sayısı: ${employees.length}\nToplam brüt: ₺${formatNum(totalBrut)}\n\n📥 Excel dosyası hazır — indirmek için aşağıdaki linki kullanın:\n[Excel İndir](/api/reports/${reportId}/download)`,
        actionType: "report_generated",
        actionDescription: `📊 Bordro: ${employees.length} çalışan — ₺${formatNum(totalBrut)}`,
      };
    }

    case "generate_gelir_tablosu": {
      const satislar = Number(args.satislar);
      const satisIndirimleri = args.satis_indirimleri ? Number(args.satis_indirimleri) : undefined;
      const satislarinMaliyeti = Number(args.satislarin_maliyeti);
      const period = args.period ? String(args.period) : "";
      const companyName = args.company_name ? String(args.company_name) : "";
      const digerGelirler = args.diger_gelirler ? Number(args.diger_gelirler) : undefined;
      const digerGiderler = args.diger_giderler ? Number(args.diger_giderler) : undefined;
      const finansmanGiderleri = args.finansman_giderleri ? Number(args.finansman_giderleri) : undefined;

      const faaliyetRaw = String(args.faaliyet_giderleri);
      const faaliyetGiderleri = faaliyetRaw.split(";").filter(s => s.trim()).map(g => {
        const p = g.trim().split("|");
        return { ad: p[0]?.trim() || "", tutar: parseFloat(p[1]?.trim() || "0") };
      });

      const reportId = `GLT-${Date.now().toString(36).toUpperCase()}`;
      const buf = await generateGelirTablosu({
        financials: { satislar, satisIndirimleri, satislarinMaliyeti, faaliyet_giderleri: faaliyetGiderleri, diger_gelirler: digerGelirler, diger_giderler: digerGiderler, finansman_giderleri: finansmanGiderleri },
        period, companyName,
      });
      const b64 = buf.toString("base64");

      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      await storage.createAgentAction({
        userId, agentType,
        actionType: "report_generated",
        description: `📊 Gelir tablosu oluşturuldu${period ? ` (${period})` : ""}`,
        metadata: { reportId, reportType: "gelir_tablosu", satislar, satislarinMaliyeti, period, companyName, excelBase64: b64 },
      });

      return {
        result: `📊 Gelir tablosu oluşturuldu! (${reportId})\n\n${companyName ? `Firma: ${companyName}\n` : ""}${period ? `Dönem: ${period}\n` : ""}Brüt Satışlar: ₺${formatNum(satislar)}\nSMM: ₺${formatNum(satislarinMaliyeti)}\n\n📥 Excel dosyası hazır — indirmek için aşağıdaki linki kullanın:\n[Excel İndir](/api/reports/${reportId}/download)`,
        actionType: "report_generated",
        actionDescription: `📊 Gelir tablosu: Satışlar ₺${formatNum(satislar)}`,
      };
    }

    case "generate_kdv_ozet": {
      const hesaplananKdv = Number(args.hesaplanan_kdv);
      const indirilecekKdv = Number(args.indirilecek_kdv);
      const tevkifatKdv = args.tevkifat_kdv ? Number(args.tevkifat_kdv) : undefined;
      const ihracatIstisnasi = args.ihracat_istisnasi ? Number(args.ihracat_istisnasi) : undefined;
      const period = args.period ? String(args.period) : "";
      const companyName = args.company_name ? String(args.company_name) : "";

      const reportId = `KDV-${Date.now().toString(36).toUpperCase()}`;
      const buf = await generateKdvOzet({
        kdv: { hesaplananKdv, indirilecekKdv, tevkifatKdv, ihracatIstisnasi },
        period, companyName,
      });
      const b64 = buf.toString("base64");

      const formatNum = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const odenecek = hesaplananKdv - indirilecekKdv - (tevkifatKdv || 0) - (ihracatIstisnasi || 0);

      await storage.createAgentAction({
        userId, agentType,
        actionType: "report_generated",
        description: `📊 KDV özet raporu oluşturuldu${period ? ` (${period})` : ""}`,
        metadata: { reportId, reportType: "kdv_ozet", hesaplananKdv, indirilecekKdv, odenecek, period, companyName, excelBase64: b64 },
      });

      return {
        result: `📊 KDV özet raporu oluşturuldu! (${reportId})\n\n${companyName ? `Firma: ${companyName}\n` : ""}${period ? `Dönem: ${period}\n` : ""}Hesaplanan KDV: ₺${formatNum(hesaplananKdv)}\nİndirilecek KDV: ₺${formatNum(indirilecekKdv)}\n${odenecek > 0 ? `Ödenecek KDV: ₺${formatNum(odenecek)}` : `Devreden KDV: ₺${formatNum(Math.abs(odenecek))}`}\n\n📥 Excel dosyası hazır — indirmek için aşağıdaki linki kullanın:\n[Excel İndir](/api/reports/${reportId}/download)`,
        actionType: "report_generated",
        actionDescription: `📊 KDV Özet: ${odenecek > 0 ? `Ödenecek ₺${formatNum(odenecek)}` : `Devreden ₺${formatNum(Math.abs(odenecek))}`}`,
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
      const requiredSkills = requirements
        ? requirements.split(/,|;/).map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : [];

      const savedPosting = await storage.createJobPosting({
        userId,
        postingId,
        title,
        department: dept,
        type,
        description,
        requirements,
        requiredSkills,
        salaryRange,
        status: "open",
      });

      await storage.createAgentAction({
        userId, agentType,
        actionType: "job_posting_created",
        description: `📋 Job posting created: ${title} (${dept}, ${type})`,
        metadata: { postingId, title, department: dept, type, description, requirements, salaryRange, dbId: savedPosting.id },
      });

      return {
        result: `Job posting **${postingId}** created and saved!\n\n📋 **${title}**\nDepartment: ${dept}\nType: ${type}${salaryRange ? `\nSalary: ${salaryRange}` : ""}\n\nDescription: ${description}\n${requirements ? `\nRequirements: ${requirements}` : ""}\n\nCandidates can now be uploaded and scored against this posting using the posting ID: **${postingId}**`,
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

    case "upload_cv": {
      const cvText = String(args.cv_text);
      const jobPostingIdStr = args.job_posting_id ? String(args.job_posting_id) : null;
      const overrideName = args.override_name ? String(args.override_name) : null;

      const parsed = parseCVText(cvText);
      const candidateName = overrideName || parsed.name;

      const candidate = await storage.createCandidate({
        userId,
        name: candidateName,
        email: parsed.email,
        phone: parsed.phone,
        linkedinUrl: parsed.linkedinUrl,
        skills: parsed.skills,
        cvText,
      });

      let scoreInfo = "";
      if (jobPostingIdStr) {
        const posting = await storage.getJobPostingByPostingId(jobPostingIdStr, userId);
        if (posting) {
          const score = calculateMatchScore(parsed.skills, posting.requiredSkills);
          const application = await storage.createApplication({
            userId,
            candidateId: candidate.id,
            jobPostingId: posting.id,
            status: "new",
            score,
          });
          scoreInfo = `\n\n📊 **Match Score against ${posting.title}:** ${score}/100\nApplication ID: #${application.id}`;
        }
      }

      await storage.createAgentAction({
        userId, agentType,
        actionType: "cv_uploaded",
        description: `📄 CV uploaded: ${candidateName}`,
        metadata: { candidateId: candidate.id, name: candidateName, email: parsed.email, skillCount: parsed.skills.length },
      });

      return {
        result: `✅ Candidate profile created!\n\n**Name:** ${candidateName}\n**Email:** ${parsed.email || "Not found"}\n**Phone:** ${parsed.phone || "Not found"}\n**LinkedIn:** ${parsed.linkedinUrl || "Not found"}\n**Skills detected (${parsed.skills.length}):** ${parsed.skills.join(", ") || "None detected"}\n**Candidate ID:** #${candidate.id}${scoreInfo}`,
        actionType: "cv_uploaded",
        actionDescription: `📄 CV: ${candidateName}`,
      };
    }

    case "list_candidates": {
      const jobPostingIdFilter = args.job_posting_id ? String(args.job_posting_id) : null;
      const sortByScore = args.sort_by_score === true;
      const topN = args.top_n ? Number(args.top_n) : null;

      interface CandidateListItem {
        id: number;
        name: string;
        email: string | null;
        skills: string[];
        score?: number | null;
        status?: string;
      }
      let candidateList: CandidateListItem[] = [];

      if (jobPostingIdFilter) {
        const posting = await storage.getJobPostingByPostingId(jobPostingIdFilter, userId);
        if (!posting) {
          return { result: `Job posting ${jobPostingIdFilter} not found.`, actionType: "list_candidates", actionDescription: "📋 List candidates" };
        }
        const appsWithCandidates = await storage.getCandidatesWithScoresForJob(posting.id, userId);
        candidateList = appsWithCandidates.map(a => ({
          id: a.candidate.id,
          name: a.candidate.name,
          email: a.candidate.email,
          skills: a.candidate.skills,
          score: a.score,
          status: a.status,
        }));
        if (sortByScore) candidateList.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else {
        const allCandidates = await storage.getCandidates(userId);
        candidateList = allCandidates.map(c => ({ id: c.id, name: c.name, email: c.email, skills: c.skills }));
      }

      if (topN) candidateList = candidateList.slice(0, topN);

      const formatted = candidateList.map((c, i) =>
        `${i + 1}. **${c.name}** (ID: #${c.id})${c.email ? ` — ${c.email}` : ""}${c.score !== undefined ? ` — Score: ${c.score}/100` : ""}${c.status ? ` — Status: ${c.status}` : ""}\n   Skills: ${Array.isArray(c.skills) ? c.skills.slice(0, 5).join(", ") : "N/A"}`
      ).join("\n");

      return {
        result: candidateList.length > 0
          ? `Found ${candidateList.length} candidate(s):\n\n${formatted}`
          : "No candidates found.",
        actionType: "list_candidates",
        actionDescription: `📋 Listed ${candidateList.length} candidates`,
      };
    }

    case "get_candidate_detail": {
      const candidateId = Number(args.candidate_id);
      const candidate = await storage.getCandidateById(candidateId, userId);
      if (!candidate) {
        return { result: `Candidate #${candidateId} not found.`, actionType: "get_candidate_detail", actionDescription: "👤 Candidate detail" };
      }

      const allApps = await storage.getApplications(userId);
      const candidateApps = allApps.filter(a => a.candidateId === candidateId);

      const appsFormatted = candidateApps.length > 0
        ? candidateApps.map(a => `  - Application #${a.id} | Status: ${a.status} | Score: ${a.score ?? "N/A"}/100`).join("\n")
        : "  No applications.";

      return {
        result: `**${candidate.name}** (ID: #${candidate.id})\n\n📧 Email: ${candidate.email || "N/A"}\n📞 Phone: ${candidate.phone || "N/A"}\n🔗 LinkedIn: ${candidate.linkedinUrl || "N/A"}\n\n**Skills (${candidate.skills.length}):** ${candidate.skills.join(", ") || "None"}\n\n**Applications:**\n${appsFormatted}\n\n**Notes:** ${candidate.notes || "None"}`,
        actionType: "get_candidate_detail",
        actionDescription: `👤 Candidate: ${candidate.name}`,
      };
    }

    case "score_candidate": {
      const candidateId = Number(args.candidate_id);
      const jobPostingIdStr = String(args.job_posting_id);

      const candidate = await storage.getCandidateById(candidateId, userId);
      if (!candidate) {
        return { result: `Candidate #${candidateId} not found.`, actionType: "score_candidate", actionDescription: "📊 Score candidate" };
      }

      const posting = await storage.getJobPostingByPostingId(jobPostingIdStr, userId);
      if (!posting) {
        return { result: `Job posting ${jobPostingIdStr} not found.`, actionType: "score_candidate", actionDescription: "📊 Score candidate" };
      }

      const score = calculateMatchScore(candidate.skills, posting.requiredSkills);

      const existingApps = await storage.getApplications(userId, { jobPostingId: posting.id });
      const existing = existingApps.find(a => a.candidateId === candidateId);

      let appId: number;
      if (existing) {
        await storage.updateApplicationScore(existing.id, userId, score);
        appId = existing.id;
      } else {
        const newApp = await storage.createApplication({ userId, candidateId, jobPostingId: posting.id, status: "new", score });
        appId = newApp.id;
      }

      const matchedSkills = candidate.skills.filter(s =>
        posting.requiredSkills.some(r => r.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(r.toLowerCase()))
      );

      return {
        result: `📊 **Score: ${score}/100**\n\nCandidate: ${candidate.name}\nJob: ${posting.title} (${jobPostingIdStr})\n\n✅ Matched skills (${matchedSkills.length}): ${matchedSkills.join(", ") || "None"}\n📋 Application #${appId} updated`,
        actionType: "candidate_scored",
        actionDescription: `📊 ${candidate.name} scored ${score}/100 for ${posting.title}`,
      };
    }

    case "bulk_score_candidates": {
      const jobPostingIdStr = String(args.job_posting_id);
      const posting = await storage.getJobPostingByPostingId(jobPostingIdStr, userId);
      if (!posting) {
        return { result: `Job posting ${jobPostingIdStr} not found.`, actionType: "bulk_score_candidates", actionDescription: "📊 Bulk score" };
      }

      const appsWithCandidates = await storage.getCandidatesWithScoresForJob(posting.id, userId);
      if (appsWithCandidates.length === 0) {
        return { result: `No candidates found for ${jobPostingIdStr}.`, actionType: "bulk_score_candidates", actionDescription: "📊 Bulk score" };
      }

      const scored: { name: string; score: number; appId: number }[] = [];
      for (const app of appsWithCandidates) {
        const score = calculateMatchScore(app.candidate.skills, posting.requiredSkills);
        await storage.updateApplicationScore(app.id, userId, score);
        scored.push({ name: app.candidate.name, score, appId: app.id });
      }

      scored.sort((a, b) => b.score - a.score);
      const ranking = scored.map((s, i) => `${i + 1}. **${s.name}** — ${s.score}/100`).join("\n");

      return {
        result: `📊 **Bulk Scoring Complete for ${posting.title}** (${jobPostingIdStr})\n\nScored ${scored.length} applicant(s) already linked to this posting:\n\n${ranking}\n\n_Note: Only candidates who applied to this specific posting are ranked. To add more candidates, use upload_cv with job_posting_id=${jobPostingIdStr}._`,
        actionType: "bulk_scored",
        actionDescription: `📊 Bulk scored ${scored.length} candidates for ${posting.title}`,
      };
    }

    case "update_application_status": {
      const candidateId = Number(args.candidate_id);
      const status = String(args.status);
      const notes = args.notes ? String(args.notes) : undefined;
      const jobPostingIdStr = args.job_posting_id ? String(args.job_posting_id) : null;

      const candidate = await storage.getCandidateById(candidateId, userId);
      if (!candidate) {
        return { result: `Candidate #${candidateId} not found.`, actionType: "update_application_status", actionDescription: "📋 Update status" };
      }

      let appId: number | null = null;
      if (jobPostingIdStr) {
        const posting = await storage.getJobPostingByPostingId(jobPostingIdStr, userId);
        if (posting) {
          const apps = await storage.getApplications(userId, { jobPostingId: posting.id });
          const app = apps.find(a => a.candidateId === candidateId);
          if (app) {
            await storage.updateApplicationStatus(app.id, userId, status, notes);
            appId = app.id;
          }
        }
      } else {
        const allApps = await storage.getApplications(userId);
        const app = allApps.find(a => a.candidateId === candidateId);
        if (app) {
          await storage.updateApplicationStatus(app.id, userId, status, notes);
          appId = app.id;
        }
      }

      const statusEmoji: Record<string, string> = {
        new: "🆕", screening: "🔍", interview_scheduled: "📅", interviewed: "🎯",
        offer: "📄", hired: "✅", rejected: "❌",
      };

      return {
        result: appId
          ? `${statusEmoji[status] || "📋"} Application status updated!\n\nCandidate: **${candidate.name}**\nNew Status: **${status}**${notes ? `\nNotes: ${notes}` : ""}${appId ? `\nApplication #${appId}` : ""}`
          : `Candidate ${candidate.name} found but no matching application. Status not updated.`,
        actionType: "application_status_updated",
        actionDescription: `${statusEmoji[status] || "📋"} ${candidate.name} → ${status}`,
      };
    }

    case "schedule_interview": {
      const candidateId = Number(args.candidate_id);
      const interviewDateStr = String(args.interview_date);
      const notes = args.notes ? String(args.notes) : undefined;
      const jobPostingIdStr = args.job_posting_id ? String(args.job_posting_id) : null;

      const candidate = await storage.getCandidateById(candidateId, userId);
      if (!candidate) {
        return { result: `Candidate #${candidateId} not found.`, actionType: "schedule_interview", actionDescription: "📅 Schedule interview" };
      }

      const interviewDate = new Date(interviewDateStr);
      const isValidDate = !isNaN(interviewDate.getTime());

      let appId: number | null = null;
      if (jobPostingIdStr) {
        const posting = await storage.getJobPostingByPostingId(jobPostingIdStr, userId);
        if (posting) {
          const apps = await storage.getApplications(userId, { jobPostingId: posting.id });
          const app = apps.find(a => a.candidateId === candidateId);
          if (app) {
            await storage.updateApplicationStatus(app.id, userId, "interview_scheduled", notes, isValidDate ? interviewDate : undefined);
            appId = app.id;
          }
        }
      } else {
        const allApps = await storage.getApplications(userId);
        const app = allApps.find(a => a.candidateId === candidateId);
        if (app) {
          await storage.updateApplicationStatus(app.id, userId, "interview_scheduled", notes, isValidDate ? interviewDate : undefined);
          appId = app.id;
        }
      }

      if (!appId) {
        return {
          result: `❌ Could not schedule interview: No application found for **${candidate.name}**${jobPostingIdStr ? ` for job ${jobPostingIdStr}` : ""}. Please ensure the candidate has an application first (use upload_cv with a job_posting_id).`,
          actionType: "interview_schedule_failed",
          actionDescription: `❌ Interview not scheduled: no application for ${candidate.name}`,
        };
      }

      return {
        result: `📅 **Interview Scheduled!**\n\nCandidate: **${candidate.name}**\nDate: **${interviewDateStr}**${notes ? `\nNotes: ${notes}` : ""}\nApplication #${appId} updated to 'interview_scheduled'`,
        actionType: "interview_scheduled",
        actionDescription: `📅 Interview: ${candidate.name} on ${interviewDateStr}`,
      };
    }

    case "list_job_postings": {
      const statusFilter = args.status ? String(args.status) : undefined;
      const postings = await storage.getJobPostings(userId, statusFilter);

      if (postings.length === 0) {
        return { result: "No job postings found. Use 'create_job_posting' to create one.", actionType: "list_job_postings", actionDescription: "📋 List job postings" };
      }

      const formatted = postings.map((p, i) =>
        `${i + 1}. **${p.title}** (${p.postingId})\n   Dept: ${p.department} | Type: ${p.type} | Status: ${p.status}${p.salaryRange ? ` | Salary: ${p.salaryRange}` : ""}\n   Skills required: ${p.requiredSkills.slice(0, 5).join(", ") || "Not specified"}`
      ).join("\n\n");

      return {
        result: `Found ${postings.length} job posting(s):\n\n${formatted}`,
        actionType: "list_job_postings",
        actionDescription: `📋 Listed ${postings.length} job postings`,
      };
    }

    case "hiring_pipeline_summary": {
      const jobPostingIdStr = args.job_posting_id ? String(args.job_posting_id) : null;

      let summary: { status: string; count: number }[] = [];
      let title = "All Positions";

      if (jobPostingIdStr) {
        const posting = await storage.getJobPostingByPostingId(jobPostingIdStr, userId);
        if (posting) {
          const apps = await storage.getApplications(userId, { jobPostingId: posting.id });
          const grouped: Record<string, number> = {};
          for (const app of apps) {
            grouped[app.status] = (grouped[app.status] || 0) + 1;
          }
          summary = Object.entries(grouped).map(([status, count]) => ({ status, count }));
          title = posting.title;
        }
      } else {
        summary = await storage.getPipelineSummary(userId);
      }

      const total = summary.reduce((sum, s) => sum + s.count, 0);
      const stageEmoji: Record<string, string> = {
        new: "🆕", screening: "🔍", interview_scheduled: "📅", interviewed: "🎯",
        offer: "📄", hired: "✅", rejected: "❌",
      };

      const formatted = summary.map(s =>
        `${stageEmoji[s.status] || "•"} **${s.status.replace(/_/g, " ").toUpperCase()}**: ${s.count} candidate${s.count !== 1 ? "s" : ""}`
      ).join("\n");

      return {
        result: `📊 **Hiring Pipeline: ${title}**\n\nTotal: ${total} application(s)\n\n${formatted || "No applications yet."}`,
        actionType: "pipeline_summary",
        actionDescription: `📊 Pipeline: ${total} applications`,
      };
    }

    case "generate_offer_letter": {
      const candidateId = Number(args.candidate_id);
      const jobTitle = String(args.job_title);
      const salary = String(args.salary);
      const startDate = args.start_date ? String(args.start_date) : "To be discussed";
      const benefits = args.additional_benefits ? String(args.additional_benefits) : "";

      const candidate = await storage.getCandidateById(candidateId, userId);
      const candidateName = candidate?.name || `Candidate #${candidateId}`;

      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const letter = `**OFFER LETTER**\n\nDate: ${today}\n\nDear ${candidateName},\n\nWe are delighted to offer you the position of **${jobTitle}** at our company.\n\n**Compensation:** ${salary}\n**Start Date:** ${startDate}${benefits ? `\n**Additional Benefits:** ${benefits}` : ""}\n\nThis offer is contingent upon successful completion of any required background checks and reference verifications. Please review the terms and confirm your acceptance within 5 business days.\n\nWe look forward to welcoming you to our team!\n\nSincerely,\n[HR Manager]\n[Company Name]`;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "offer_letter_generated",
        description: `📄 Offer letter: ${candidateName} for ${jobTitle}`,
        metadata: { candidateId, candidateName, jobTitle, salary },
      });

      return {
        result: letter,
        actionType: "offer_letter_generated",
        actionDescription: `📄 Offer: ${candidateName} → ${jobTitle}`,
      };
    }

    case "generate_rejection_email": {
      const candidateId = Number(args.candidate_id);
      const jobTitle = String(args.job_title);
      const reason = args.reason ? String(args.reason) : "";

      const candidate = await storage.getCandidateById(candidateId, userId);
      const candidateName = candidate?.name || `Candidate #${candidateId}`;
      const candidateEmail = candidate?.email || "their email";

      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const email = `**REJECTION EMAIL**\n\nTo: ${candidateEmail}\nSubject: Your Application for ${jobTitle}\n\nDate: ${today}\n\nDear ${candidateName},\n\nThank you for taking the time to apply for the **${jobTitle}** position and for your interest in joining our team.\n\nAfter careful consideration of your application${reason ? ` — noting that ${reason} —` : ","} we have decided to move forward with other candidates whose qualifications more closely match our current needs.\n\nThis was a difficult decision, as we were impressed by your background. We encourage you to apply for future openings that align with your experience.\n\nWe wish you all the best in your job search.\n\nWarm regards,\n[HR Team]\n[Company Name]`;

      await storage.createAgentAction({
        userId, agentType,
        actionType: "rejection_email_generated",
        description: `📧 Rejection email: ${candidateName} for ${jobTitle}`,
        metadata: { candidateId, candidateName, jobTitle },
      });

      return {
        result: email,
        actionType: "rejection_email_generated",
        actionDescription: `📧 Rejection: ${candidateName} for ${jobTitle}`,
      };
    }

    case "send_invoice_email":
    case "send_report_email":
    case "send_campaign_email":
    case "send_order_email":
    case "send_property_email": {
      const emailResult = await sendEmail({
        userId,
        to: String(args.to),
        subject: String(args.subject),
        body: String(args.body),
        agentType,
      });

      const toolLabel: Record<string, string> = {
        send_invoice_email: "Financial email",
        send_report_email: "Report email",
        send_campaign_email: "Campaign email",
        send_order_email: "Order email",
        send_property_email: "Property email",
      };
      const label = toolLabel[toolName] || "Email";

      if (emailResult.success) {
        await storage.createAgentAction({
          userId, agentType,
          actionType: "email_sent",
          description: `📧 ${label} sent to ${args.to}: "${args.subject}"`,
          metadata: { to: args.to, subject: args.subject, toolName },
        });
        try {
          const { triggerEmailSentNotification } = await import("./bossNotificationService");
          await triggerEmailSentNotification({
            userId, agentType, teamMemberName: displayName,
            recipientEmail: String(args.to),
            subject: String(args.subject),
            bodySnippet: String(args.body),
          });
        } catch (e) { console.error("[BossAI] email notification error:", e); }
      }

      return {
        result: emailResult.success
          ? `${label} sent to ${args.to}: "${args.subject}"`
          : `Failed to send email: ${emailResult.message}`,
        actionType: emailResult.success ? "email_sent" : "email_failed",
        actionDescription: emailResult.success
          ? `📧 ${label} sent to ${args.to}`
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

    case "marketplace_list_connections": {
      const { getConnections } = await import("./services/marketplace/marketplaceCoordinator");
      const connections = await getConnections(userId);
      if (connections.length === 0) {
        return { result: "Henüz bağlı pazaryeri platformu yok. Ayarlar sayfasından Trendyol veya Shopify bağlantısı ekleyebilirsiniz.", actionType: "marketplace_list", actionDescription: "🏪 Marketplace connections listed" };
      }
      const list = connections.map(c => `• ${c.platform.toUpperCase()} — ${c.storeName || "Store"} (${c.isActive ? "✅ Active" : "❌ Inactive"})`).join("\n");
      return { result: `Bağlı pazaryerleri:\n${list}`, actionType: "marketplace_list", actionDescription: "🏪 Marketplace connections listed" };
    }

    case "marketplace_get_products": {
      const { getMarketplaceService, getAllProducts } = await import("./services/marketplace/marketplaceCoordinator");
      const platform = String(args.platform);
      let products: any[] = [];
      if (platform === "all") {
        products = await getAllProducts(userId);
      } else {
        const svc = await getMarketplaceService(userId, platform as any);
        if (!svc) return { result: `${platform} bağlantısı bulunamadı. Önce Ayarlar sayfasından bağlantı kurmalısınız.`, actionType: "marketplace_products", actionDescription: `🏪 ${platform} products — not connected` };
        if (platform === "trendyol") {
          const result = await (svc as any).getProducts(0, 50);
          products = (result?.content || []).map((p: any) => ({ ...p, _platform: "trendyol" }));
        } else {
          const result = await (svc as any).getProducts(50, args.search);
          products = (result?.products || []).map((p: any) => ({ ...p, _platform: "shopify" }));
        }
      }
      const summary = products.slice(0, 20).map((p: any) => {
        if (p._platform === "trendyol") return `[Trendyol] ${p.title || p.productName} — ₺${p.salePrice || "?"} — Stok: ${p.quantity ?? "?"}`;
        return `[Shopify] ${p.title} — ${p.variants?.[0]?.price || "?"} — Stok: ${p.variants?.[0]?.inventory_quantity ?? "?"}`;
      }).join("\n");
      return { result: `${products.length} ürün bulundu:\n${summary}${products.length > 20 ? `\n...ve ${products.length - 20} ürün daha` : ""}`, actionType: "marketplace_products", actionDescription: `🏪 ${platform} products fetched (${products.length})` };
    }

    case "marketplace_get_orders": {
      const { getMarketplaceService, getAllOrders } = await import("./services/marketplace/marketplaceCoordinator");
      const platform = String(args.platform);
      const days = args.days ? Number(args.days) : 7;
      let orders: any[] = [];
      if (platform === "all") {
        orders = await getAllOrders(userId, days);
      } else {
        const svc = await getMarketplaceService(userId, platform as any);
        if (!svc) return { result: `${platform} bağlantısı bulunamadı.`, actionType: "marketplace_orders", actionDescription: `🏪 ${platform} orders — not connected` };
        if (platform === "trendyol") {
          const startDate = Date.now() - days * 86400000;
          const result = await (svc as any).getOrders({ startDate, endDate: Date.now(), status: args.status });
          orders = (result?.content || []).map((o: any) => ({ ...o, _platform: "trendyol" }));
        } else {
          const result = await (svc as any).getOrders({ status: args.status });
          orders = (result?.orders || []).map((o: any) => ({ ...o, _platform: "shopify" }));
        }
      }
      const summary = orders.slice(0, 15).map((o: any) => {
        if (o._platform === "trendyol") return `[Trendyol] #${o.orderNumber} — ${o.status} — ₺${o.totalPrice || "?"}`;
        return `[Shopify] #${o.order_number || o.name} — ${o.financial_status} — ${o.total_price} ${o.currency}`;
      }).join("\n");
      return { result: `Son ${days} gün: ${orders.length} sipariş\n${summary}${orders.length > 15 ? `\n...ve ${orders.length - 15} sipariş daha` : ""}`, actionType: "marketplace_orders", actionDescription: `📦 ${platform} orders fetched (${orders.length})` };
    }

    case "marketplace_get_order_detail": {
      const { getMarketplaceService } = await import("./services/marketplace/marketplaceCoordinator");
      const platform = String(args.platform);
      const orderId = String(args.order_id);
      const svc = await getMarketplaceService(userId, platform as any);
      if (!svc) return { result: `${platform} bağlantısı bulunamadı.`, actionType: "marketplace_order_detail", actionDescription: `📦 Order detail — not connected` };
      let detail;
      if (platform === "trendyol") {
        detail = await (svc as any).getOrderDetail(orderId);
      } else {
        detail = await (svc as any).getOrderDetail(orderId);
      }
      return { result: `Sipariş detayı (${platform}):\n${JSON.stringify(detail, null, 2).substring(0, 2000)}`, actionType: "marketplace_order_detail", actionDescription: `📦 Order #${orderId} detail fetched` };
    }

    case "marketplace_update_stock": {
      const { getMarketplaceService } = await import("./services/marketplace/marketplaceCoordinator");
      const platform = String(args.platform);
      const updates = args.updates as any[];
      const svc = await getMarketplaceService(userId, platform as any);
      if (!svc) return { result: `${platform} bağlantısı bulunamadı.`, actionType: "marketplace_stock", actionDescription: `📦 Stock update — not connected` };
      let result;
      if (platform === "trendyol") {
        const items = updates.map(u => ({ barcode: u.barcode, quantity: u.quantity }));
        result = await (svc as any).updateStockAndPrice(items);
      } else {
        const locations = await (svc as any).getLocations();
        const locationId = locations?.locations?.[0]?.id;
        for (const u of updates) {
          await (svc as any).updateInventory(u.barcode, String(locationId), u.quantity);
        }
        result = { success: true };
      }
      await storage.createAgentAction({ userId, agentType, actionType: "stock_updated", description: `📦 ${updates.length} ürün stok güncellendi (${platform})`, metadata: { platform, updates } });
      return { result: `✅ ${updates.length} ürün stok güncellendi (${platform})`, actionType: "stock_updated", actionDescription: `📦 Stock updated: ${updates.length} items (${platform})` };
    }

    case "marketplace_update_price": {
      const { getMarketplaceService } = await import("./services/marketplace/marketplaceCoordinator");
      const updates = args.updates as any[];
      const svc = await getMarketplaceService(userId, "trendyol");
      if (!svc) return { result: "Trendyol bağlantısı bulunamadı.", actionType: "marketplace_price", actionDescription: "💲 Price update — not connected" };
      const items = updates.map(u => ({ barcode: u.barcode, salePrice: u.salePrice, listPrice: u.listPrice }));
      await (svc as any).updateStockAndPrice(items);
      await storage.createAgentAction({ userId, agentType, actionType: "price_updated", description: `💲 ${updates.length} ürün fiyat güncellendi (Trendyol)`, metadata: { updates } });
      return { result: `✅ ${updates.length} ürün fiyatı güncellendi (Trendyol)`, actionType: "price_updated", actionDescription: `💲 Price updated: ${updates.length} items` };
    }

    case "marketplace_update_tracking": {
      const { getMarketplaceService } = await import("./services/marketplace/marketplaceCoordinator");
      const platform = String(args.platform);
      const svc = await getMarketplaceService(userId, platform as any);
      if (!svc) return { result: `${platform} bağlantısı bulunamadı.`, actionType: "marketplace_tracking", actionDescription: "🚚 Tracking — not connected" };
      if (platform === "trendyol") {
        await (svc as any).updateTrackingNumber(String(args.order_id), String(args.tracking_number), String(args.cargo_company));
      } else {
        await (svc as any).fulfillOrder(String(args.order_id), String(args.tracking_number), String(args.cargo_company));
      }
      await storage.createAgentAction({ userId, agentType, actionType: "tracking_updated", description: `🚚 Kargo takip güncellendi: ${args.tracking_number} (${platform})`, metadata: { platform, orderId: args.order_id, trackingNumber: args.tracking_number, cargoCompany: args.cargo_company } });
      return { result: `✅ Kargo takip güncellendi: ${args.tracking_number} (${args.cargo_company})`, actionType: "tracking_updated", actionDescription: `🚚 Tracking updated: ${args.tracking_number}` };
    }

    case "marketplace_get_questions": {
      const { getMarketplaceService } = await import("./services/marketplace/marketplaceCoordinator");
      const svc = await getMarketplaceService(userId, "trendyol");
      if (!svc) return { result: "Trendyol bağlantısı bulunamadı.", actionType: "marketplace_questions", actionDescription: "❓ Questions — not connected" };
      const status = args.status || "WAITING_FOR_ANSWER";
      const result = await (svc as any).getCustomerQuestions(status === "ALL" ? undefined : status);
      const questions = Array.isArray(result) ? result : (result?.content || []);
      const summary = questions.slice(0, 10).map((q: any, i: number) => `${i + 1}. [ID: ${q.id}] "${q.text?.substring(0, 100)}" — ${q.status}`).join("\n");
      return { result: `${questions.length} müşteri sorusu:\n${summary}`, actionType: "marketplace_questions", actionDescription: `❓ ${questions.length} questions fetched` };
    }

    case "marketplace_answer_question": {
      const { getMarketplaceService } = await import("./services/marketplace/marketplaceCoordinator");
      const svc = await getMarketplaceService(userId, "trendyol");
      if (!svc) return { result: "Trendyol bağlantısı bulunamadı.", actionType: "marketplace_answer", actionDescription: "❓ Answer — not connected" };
      await (svc as any).answerQuestion(String(args.question_id), String(args.answer));
      await storage.createAgentAction({ userId, agentType, actionType: "question_answered", description: `💬 Trendyol müşteri sorusu yanıtlandı: ${args.question_id}`, metadata: { questionId: args.question_id, answer: args.answer } });
      return { result: `✅ Soru yanıtlandı (ID: ${args.question_id})`, actionType: "question_answered", actionDescription: `💬 Question answered: ${args.question_id}` };
    }

    case "marketplace_sync_summary": {
      const { getAllProducts, getAllOrders, getConnections } = await import("./services/marketplace/marketplaceCoordinator");
      const connections = await getConnections(userId);
      if (connections.length === 0) {
        return { result: "Henüz bağlı pazaryeri platformu yok.", actionType: "marketplace_summary", actionDescription: "🏪 Marketplace summary — no connections" };
      }
      const products = await getAllProducts(userId);
      const orders = await getAllOrders(userId, 7);
      const totalRevenue = orders.reduce((sum: number, o: any) => {
        const price = o._platform === "trendyol" ? Number(o.totalPrice || 0) : Number(o.total_price || 0);
        return sum + price;
      }, 0);
      const platforms = connections.map(c => c.platform).join(", ");
      return {
        result: `📊 PAZARYERI ÖZETİ\n\nBağlı platformlar: ${platforms}\nToplam ürün: ${products.length}\nSon 7 gün sipariş: ${orders.length}\nToplam ciro: ₺${totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        actionType: "marketplace_summary",
        actionDescription: `📊 Marketplace summary: ${products.length} products, ${orders.length} orders`,
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

    case "create_task": {
      const title = args.title as string;
      const description = (args.description as string) || "";
      const priority = (args.priority as string) || "medium";
      const dueDate = args.dueDate ? new Date(args.dueDate as string) : null;
      const project = (args.project as string) || "";

      try {
        const task = await storage.createAgentTask({
          userId,
          agentType,
          title,
          description: description || null,
          priority,
          dueDate,
          project: project || null,
          status: "todo",
        });
        const dueDateStr = dueDate ? dueDate.toLocaleDateString("tr-TR") : "Belirtilmedi";
        return {
          result: `✅ Görev başarıyla oluşturuldu!\n\n📋 **Başlık:** ${title}\n📝 **Açıklama:** ${description || "—"}\n📅 **Tarih:** ${dueDateStr}\n🔴 **Öncelik:** ${priority}\n🆔 **Görev ID:** ${task.id}`,
          actionType: "create_task",
          actionDescription: `Created task: "${title}" (priority: ${priority})`,
        };
      } catch (err: any) {
        return { result: `❌ Görev oluşturulamadı: ${err.message || "Bilinmeyen hata"}` };
      }
    }

    case "delegate_task": {
      const targetAgentType = args.targetAgentType as string;
      const title = args.title as string;
      const description = (args.description as string) || "";
      const priority = (args.priority as string) || "medium";
      const dueDate = args.dueDate ? new Date(args.dueDate as string) : null;
      const project = (args.project as string) || "";

      const targetAgentDisplayNames: Record<string, string> = {
        "sales-sdr": "Rex (Sales SDR)",
        "customer-support": "Ava (Customer Support)",
        "social-media": "Maya (Social Media)",
        "bookkeeping": "Finn (Bookkeeping)",
        "scheduling": "Cal (Scheduling)",
        "hr-recruiting": "Harper (HR & Recruiting)",
        "data-analyst": "DataBot (Data Analyst)",
        "ecommerce-ops": "ShopBot (E-Commerce Ops)",
        "real-estate": "Reno (Real Estate)",
      };

      try {
        const activeRentals = await storage.getRentalsByUser(userId);
        const isTargetActive = activeRentals.some(r => r.agentType === targetAgentType && r.status === "active");
        const targetName = targetAgentDisplayNames[targetAgentType] || targetAgentType;
        const sourceName = targetAgentDisplayNames[agentType] || agentType;
        if (!isTargetActive) {
          return {
            result: `⚠️ **Görev Devredilemedi**\n\n**${targetName}** henüz aktif değil veya işe alınmamış. Görevleri yalnızca aktif ajanlara devredebilirsiniz.\n\nLütfen Workers sayfasından **${targetName}** ajanını işe alın ve tekrar deneyin.`,
          };
        }
        const task = await storage.createAgentTask({
          userId,
          agentType: targetAgentType,
          title,
          description: description || null,
          priority,
          dueDate,
          project: project || null,
          status: "todo",
          sourceAgentType: agentType,
          targetAgentType,
          delegationStatus: "pending",
          delegationResult: null,
        });
        const dueDateStr = dueDate ? dueDate.toLocaleDateString("tr-TR") : "Belirtilmedi";
        return {
          result: `🔀 **Görev Devredildi!**\n\n📋 **Başlık:** ${title}\n📝 **Açıklama:** ${description || "—"}\n📅 **Tarih:** ${dueDateStr}\n🔴 **Öncelik:** ${priority}\n👤 **Kaynak:** ${sourceName}\n🎯 **Hedef Ajan:** ${targetName}\n🆔 **Görev ID:** ${task.id}\n\nGörev ${targetName} ajanına başarıyla devredildi ve görev panelinde takip edilebilir.`,
          actionType: "delegate_task",
          actionDescription: `Delegated task "${title}" from ${agentType} to ${targetAgentType}`,
        };
      } catch (err: any) {
        return { result: `❌ Görev devredilemedi: ${err.message || "Bilinmeyen hata"}` };
      }
    }

    default: {
      if (toolName.startsWith("skill_")) {
        try {
          const { executeSkillByName } = await import("./n8n/skillEngine");
          const skillName = toolName.replace("skill_", "");
          const result = await executeSkillByName(skillName, args as Record<string, any>, agentType);
          if (result.success) {
            await storage.createAgentAction({
              userId, agentType, actionType: "skill_execution",
              description: `Skill executed: ${skillName}`,
              metadata: { skillName, params: args, output: result.output, durationMs: result.durationMs },
            });
            return {
              result: typeof result.output === "string" ? result.output : JSON.stringify(result.output, null, 2),
              actionType: "skill_execution",
              actionDescription: `⚡ Skill: ${skillName} (${result.durationMs}ms)`,
            };
          }
          return { result: `Skill error: ${result.error}` };
        } catch (err: any) {
          return { result: `Skill execution failed: ${err.message}` };
        }
      }
      return { result: `Unknown tool: ${toolName}` };
    }
  }
  } catch (marketplaceErr: any) {
    if (toolName.startsWith("marketplace_")) {
      console.error(`[Marketplace Tool Error] ${toolName}:`, marketplaceErr.message);
      return {
        result: `Pazaryeri işlemi başarısız: ${marketplaceErr.message}. Lütfen bağlantı ayarlarınızı kontrol edin.`,
        actionType: "marketplace_error",
        actionDescription: `❌ ${toolName} failed: ${marketplaceErr.message?.substring(0, 100)}`,
      };
    }
    throw marketplaceErr;
  }
}

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: number,
  agentType: string
): Promise<{ result: string; actionType?: string; actionDescription?: string }> {
  const displayName = agentDisplayNames[agentType] || agentType;
  let userLang: SupportedLang = "en";
  try {
    const u = await storage.getUserById(userId);
    if (u?.language === "tr") userLang = "tr";
  } catch {}

  const toolResult = await _executeToolCallInner(toolName, args, userId, agentType, displayName, userLang);

  if (toolResult.actionType && !toolResult.actionType.includes("failed") && !toolResult.actionType.includes("error")) {
    triggerAutomations({
      userId,
      toolName,
      agentType,
      actionType: toolResult.actionType,
      toolResult: { ...args, _actionType: toolResult.actionType, _description: toolResult.actionDescription },
    }).catch((err) => console.error("[Automation] trigger error:", err.message));
  }

  return toolResult;
}
