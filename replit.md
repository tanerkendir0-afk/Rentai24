# RentAI 24

## Overview
RentAI 24 is designed as the world's first AI staffing agency website, enabling businesses to rent and manage pre-trained AI agents for various roles like customer support, sales, and bookkeeping. The platform aims to provide flexible, on-demand AI talent, reducing traditional hiring overhead and leveraging the growing demand for AI in business operations.

## User Preferences
I prefer a conversational and iterative approach. Please ask clarifying questions and propose solutions incrementally. I value detailed explanations of your thought process and any changes you plan to make. Before implementing any major features or architectural changes, please describe your approach and wait for my approval. I prefer clear, concise language in all communications.

## System Architecture
The RentAI 24 platform uses a modern web stack. The frontend employs React, TypeScript, and Tailwind CSS, bundled with Vite, featuring a dark mode UI with navy and blue-to-violet gradient accents. The backend is built with Express.js, using PostgreSQL (Neon serverless) and Drizzle ORM. OpenAI GPT-4o is integrated for core AI functionalities via Replit AI Integrations.

**Key Features:**

*   **AI Worker Catalog:** Showcases 9 distinct AI agents with specific personas.
*   **User Authentication & Authorization:** Session-based authentication with `express-session`, `connect-pg-simple`, `bcrypt`, and Passport.js (email/password, Google OAuth). Supports `user`, `agent_manager`, and `admin` roles.
*   **Customer Dashboard:** Manages rented AI workers, usage, and billing.
*   **Admin Panel:** Provides tools for managing RAG documents, fine-tuning, exporting training data, downloading agent rules, and system monitoring. Includes a **Boss AI** assistant with specialized tools for querying platform stats and providing development guidance.
*   **AI Tooling System:** A generalized registry allowing AI agents to perform actions like sending emails or generating images.
*   **RAG & Fine-tuning:** Supports document uploading for RAG (chunking, embedding, pgvector storage) and OpenAI fine-tuning.
*   **Training Data Export & Agent Rules PDF:** Generates OpenAI fine-tuning compatible JSONL files and comprehensive PDF documents of agent rules.
*   **Image Credits & Uploads:** Allows users to purchase image credits for DALL-E 3 and supports in-chat image uploads.
*   **Agent Collaboration (Brainstorming):** Enables selected agents to brainstorm on topics, with Boss AI synthesizing perspectives into action plans, tracking token costs, and saving sessions.
*   **Spend Analysis Dashboard:** Offers comprehensive cost analytics for OpenAI API usage, broken down by agent, model, and operation type.
*   **Token Cost Tracker:** Tracks OpenAI API token usage and costs per request.
*   **Token Optimization System:** Implements smart model routing, conversation history summarization, compressed system prompts, RAG threshold adjustments, and conditional tool filtering to optimize token usage.
*   **Server-Side Chat Persistence:** Stores chat conversations in PostgreSQL, making them persistent across user sessions and devices.
*   **Team Members System:** Allows users to manage team members, whose context is injected into agent system prompts.
*   **Per-User Gmail (Google OAuth):** Users connect their Google accounts via OAuth 2.0 (using `googleapis`). Refresh/access tokens are AES-256-CBC encrypted and stored per-user. Gmail API is used for send, read, and reply operations. Falls back to Resend platform email if Gmail is not connected.
*   **Social Media Accounts & Auto-Publishing:** Users can connect various social media accounts, allowing Maya AI to auto-publish or prepare posts for manual sharing based on account type.
*   **Shipping/Cargo Providers:** Users can connect shipping provider APIs (e.g., Aras Kargo, UPS), which ShopBot AI can access.
*   **WhatsApp Business Integration:** Users connect their Meta WhatsApp Business Cloud API in Settings (Phone Number ID, Access Token, Verify Token). All 9 agents can send WhatsApp messages via `send_whatsapp` and `send_whatsapp_template` tools. Webhook endpoint (`/api/whatsapp/webhook`) receives inbound messages and delivery status updates. Messages are stored in `whatsapp_messages` table. Boss AI notifications are triggered for incoming WhatsApp messages.
*   **Help & Support System:** Users can report issues and requests, view ticket history, and admins can manage tickets via a dedicated panel.
*   **Boss AI Notification System:** Notifies Boss AI of agent actions and sends email notifications to users with configured Gmail.
*   **PWA Support:** Provides an installable, app-like experience.
*   **AI Guardrails System:** Implements multi-layer security with input guardrails (prompt injection detection, blocked topics, rate limiting) and output guardrails (sensitive data sanitization, response length limits), logging all blocks.
*   **Distillation Protection:** Detects systematic AI model data extraction attempts — blocks users/IPs querying 5+ different agents or sending 8+ similar queries within 10 minutes. Adds invisible zero-width character watermarks to AI responses for traceability. Events logged to `security_events` table (`server/distillationProtection.ts`).
*   **Server Hardening & Admin Obfuscation:** `X-Powered-By` disabled, `Server` header removed, security headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin) on all responses. Admin panel moved from `/admin` to a dynamic path controlled by `ADMIN_PATH` / `VITE_ADMIN_PATH` environment variables. Admin API routes under `/api/{ADMIN_PATH}/...`. `robots.txt` blocks sensitive paths. Admin pages have `X-Robots-Tag: noindex` header and client-side noindex meta tag. Error responses sanitized (no stack traces or framework info).
*   **Admin Security Report:** New "Security" tab in admin panel showing security event statistics by type (distillation attempts, guardrail blocks, rate limits, suspicious patterns), top suspicious IPs, time-based event charts, and detailed event logs with configurable time periods (24h/7d/30d).
*   **Agent Behavior Improvements:** Includes efficiency rules, tool call deduplication, and better error handling for Gmail.
*   **Agent Performance Dashboard:** Displays per-agent statistics like sessions, messages, error rates, and health status.
*   **Conversation Review System:** Allows admins to browse, filter, and rate conversations, influencing training data quality.
*   **Training Data Quality Scoring:** Scores conversation quality for training data exports, filtering out low-quality examples.
*   **Brand Identity Protection:** Agents attribute capabilities to "proprietary RentAI 24 AI technology."
*   **System Secrecy Protocol:** All agents refuse to reveal platform internals (tech stack, models, database, privacy, architecture) without password `31knd34`. Each question requires separate password verification.
*   **Agent Web Search:** All 9 agents have a `web_search` tool for internet research within their domain (Rex finds leads, Maya researches trends, Reno analyzes property markets, etc.). Uses GPT-4o-mini to generate comprehensive, actionable research results.
*   **Proactive Agent Behavior:** Agents never say "I can't" — they use web_search and their tools proactively. Style is informative/explanatory rather than persuasive. Agents present data and suggest next steps.
*   **Manager Reports & Improvements:** Manager agent responds directly to report/status/improvement queries with structured team analysis, usage stats, and actionable recommendations instead of routing to other agents.
*   **Manager Agent (Smart Router):** An intelligent routing layer (`agentType: "manager"`) that classifies user messages and routes them to the appropriate hired agent. Uses keyword matching + GPT-4o-mini classification. Only routes to agents the user has active rentals for. If a message matches an unhired agent, suggests hiring it with a link to the Workers page. Available in the chat sidebar for logged-in users with at least one hired agent.
*   **Auth-aware Workers Page:** Logged-in users see hired agents first with "Active" badge, usage stats, progress bars, and "Chat" buttons. Unhired agents appear below a divider with standard pricing and "Hire Now". Page header adapts to "Your AI Team" when agents are hired.
*   **Animated Platform Guide:** Interactive, animated walkthrough with 4 auto-advancing steps (Browse & Hire, Chat, Tasks, Dashboard). Each step has a live animated demo panel. Embedded on the homepage for guests (eye-catching showcase), and available as a full `/guide` page for logged-in users.
*   **Human Escalation System (İnsan Devir):** Detects frustrated or sensitive customer interactions via keyword matching and agent tagging. Triggers escalation with orange warning cards in chat UI. Admin receives email notification and can join the live chat from the Escalations tab (under Security & Support in admin panel). Admin messages appear as gold bubbles with Shield icon. Chat polls every 3 seconds for admin messages. When admin resolves, customer sees a green confirmation card. Three default rules seeded: Sinirli Müşteri (angry customer), Tekrar Hatası (repeated failure), Hassas Konu (sensitive topic). Tables: `escalation_rules`, `escalations`, `escalation_messages`.
*   **Navbar Sign Out:** Sign Out button available in the main navbar (desktop + mobile) for logged-in users. Guide link also added to navbar.
*   **Agent Email Capability (All 9 Agents):** Every agent can send emails via dedicated tools: `send_candidate_email` (Harper), `send_invoice_email` (Finn), `send_report_email` (DataBot), `send_campaign_email` (Maya), `send_order_email` (ShopBot), `send_property_email` (Reno). Ava/Rex/Cal already had email via existing tools. Boss AI notifications triggered on email send. Uses Resend or user's Gmail.
*   **Finn Turkish Accounting Upgrade:** Finn (Bookkeeping) agent upgraded to professional Turkish accounting (Türk Muhasebe Sistemi). Features: KDV invoicing with tevkifat (partial withholding), TCMB exchange rates, income/expense tracking in ₺, borç-alacak (receivable/payable) management, cash flow forecasting, bilanço (balance sheet) and gelir tablosu (income statement) generation, bordro (payroll) with 2026 SGK/vergi dilimleri, stopaj (withholding tax) calculations, Gmail inbox tools. Local keyword-based muhasebe retriever (`server/muhasebeRetriever.ts`) provides RAG context from 52 Turkish accounting reference chunks (`server/turk-muhasebe-chunks.json`). Skill file at `.agents/skills/turkish-accounting/SKILL.md`. Tools defined in `server/agentTools.ts`, system prompt in `server/routes.ts`.
*   **Admin Agent Custom Instructions (Özel Talimatlar):** Admin panel "AI Training" category has an "Özel Talimatlar" tab where admins can set per-agent and global custom instructions. Instructions are injected into agent system prompts at runtime. Tables: `agent_instructions` (per-agent, unique on agentType), `global_agent_instructions`.
*   **CRM Document Manager:** Settings page has a "CRM Dokuman Yonetimi" section for uploading/managing customer documents (PDF, TXT, CSV, Excel, Word up to 5MB). Files stored as text content in `crm_documents` table with user ownership. Ownership-checked CRUD endpoints.
*   **Agent Document Handling:** All 9 agents can read and analyze documents uploaded by users in chat. Document content is extracted server-side (`documentParser.ts`) and injected into the user message as `[User attached a document:]` blocks. Agents are instructed via `DOCUMENT_CAPABILITY` shared prompt constant to analyze, summarize, and correct uploaded documents. DataBot has enhanced `FILE ANALYSIS` instructions for CSV/Excel/PDF data analysis (metrics, trends, correlations, statistics). Agents present corrections as markdown tables or code blocks.

*   **Multi-AI Provider Support (Anthropic/Claude):** Alternative AI provider selectable per-agent from admin panel. Anthropic Claude (Sonnet 4, Haiku) supported alongside OpenAI GPT-4o. Provider stored in `system_settings` table (`default_ai_provider`, `ai_provider_{agentSlug}`). `token_usage` table has `ai_provider` column for tracking. Fine-tuned models always use OpenAI. Embeddings remain OpenAI `text-embedding-3-small`. Brainstorming/Boss AI also support Anthropic provider selection. `@anthropic-ai/sdk` package used with conditional initialization via `ANTHROPIC_API_KEY` env var.
*   **A/B Test Panel:** Admin panel "AI Training" category has an "A/B Test" tab. Sends same prompt to both OpenAI (GPT-4o) and Anthropic (Claude Sonnet 4) simultaneously. Displays side-by-side comparison of responses, latency, token usage, and cost. Optional agent context selection. Endpoint: `POST /api/${ADMIN_PATH}/ab-test`.
*   **Provider Spend Comparison:** Spend Analysis panel includes "Provider Karsilastirmasi" section showing OpenAI vs Anthropic cost, request, token, and per-agent breakdowns. Data sourced from `ai_provider` column in `token_usage` table.

## External Dependencies
*   **OpenAI:** GPT-4o, `text-embedding-3-small` (via Replit AI Integrations)
*   **Anthropic:** Claude Sonnet 4, Claude 3 Haiku (`@anthropic-ai/sdk`, requires `ANTHROPIC_API_KEY`)
*   **PostgreSQL (Neon serverless):** Primary database
*   **Stripe:** Payment processing and billing
*   **Drizzle ORM:** ORM for PostgreSQL
*   **Framer Motion:** Frontend animations
*   **React Hook Form & Zod:** Form management and validation
*   **TanStack Query:** Data fetching and caching
*   **Lucide React & React Icons/si:** Icon libraries
*   **Multer:** `multipart/form-data` handling (file uploads)
*   **Google Fonts (Inter):** Typography
*   **Gmail (OAuth) & Resend:** Email routing and sending
*   **Google Calendar:** Scheduling appointments