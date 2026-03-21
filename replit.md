# RentAI 24

## Overview
RentAI 24 is the world's first AI staffing agency website, offering businesses on-demand, pre-trained AI agents for diverse roles such as customer support, sales, and bookkeeping. The platform aims to streamline business operations by providing flexible AI talent, reducing traditional hiring complexities, and addressing the growing demand for AI in the business sector. Key features include an AI worker catalog, user authentication, customer and admin dashboards, and an advanced AI tooling system. The project prioritizes token optimization, robust security, and agent collaboration.

## User Preferences
I prefer a conversational and iterative approach. Please ask clarifying questions and propose solutions incrementally. I value detailed explanations of your thought process and any changes you plan to make. Before implementing any major features or architectural changes, please describe your approach and wait for my approval. I prefer clear, concise language in all communications.

## System Architecture
The RentAI 24 platform utilizes a modern web stack: React, TypeScript, and Tailwind CSS (with Vite) for the frontend, styled with a dark mode featuring navy and blue-to-violet gradients. The backend is implemented with Express.js, PostgreSQL (Neon serverless), and Drizzle ORM. OpenAI GPT-4o is integrated for core AI functionalities.

**Core Architectural Decisions and Features:**

*   **User Management:** Session-based authentication with `user`, `agent_manager`, and `admin` roles, including Google OAuth.
*   **AI Worker Management:** A catalog of 9 distinct AI agents with specific personas, accessible via customer and admin interfaces.
*   **AI Tooling System:** A generalized registry allowing AI agents to perform various actions like sending emails or generating images.
*   **RAG & Fine-tuning:** Supports document uploading, chunking, embedding (pgvector), and OpenAI fine-tuning capabilities.
*   **Token Optimization:** Achieved through smart model routing, conversation history summarization, compressed system prompts, RAG threshold adjustments, and conditional tool filtering.
*   **Persistent Chat & Team Features:** Server-side chat persistence and team management to inject context into agent prompts.
*   **Communication Integrations:** Per-user Gmail integration, social media auto-publishing, and WhatsApp Business integration.
*   **Security & Monitoring:** Multi-layer AI guardrails, distillation protection, server hardening, obfuscated admin panel, and an admin security report. Includes global error handlers, graceful shutdown, per-agent circuit breakers, rate limiting, request timeouts, agent heartbeat monitoring, and a health check endpoint.
*   **Agent Behavior Enhancements:** Proactive agents with `web_search` tool, efficiency rules, and improved error handling.
*   **Manager Agent (Smart Router):** Classifies user messages and routes them to appropriate agents.
*   **Human Escalation System:** Detects frustrated users, triggers escalations, and allows admin intervention in live chats.
*   **Agent Document Handling:** All agents can read, analyze, and correct user-uploaded documents.
*   **Multi-AI Provider Support:** Four provider modes: **OpenAI** (GPT-4o/4o-mini), **Anthropic** (Claude Sonnet 4), **NVIDIA Nemotron** (Llama 3.1 70B/Ultra 253B/340B via NVIDIA Cloud API), and **Auto (Akıllı Yönlendirme)** for dynamic routing based on message complexity. Includes a multi-provider fallback chain (e.g., OpenAI → Anthropic → NVIDIA or NVIDIA → Anthropic → OpenAI). NVIDIA API key configurable in admin panel. Nemotron model costs tracked in token usage.
*   **Finn Turkish Accounting Upgrade:** Specialized bookkeeping agent with Turkish accounting features, including KDV invoicing, TCMB exchange rates, financial management, and Excel report generation (Mizan, Bilanço, Bordro, Gelir Tablosu, KDV Özet). Uses PDFKit for PDF generation and supports KaTeX math rendering.
*   **Finn Calculation Tools:** Dedicated deterministic calculation service for Finn, including tools for KDV, payroll, amortization, FX revaluation, withholding, and journal entry formatting.
*   **White-Label PDF Generation & Email Attachments:** Agents can generate branded PDF documents (invoice, report, proposal) and send them as email attachments. Customer branding is customizable.
*   **Trendyol + Shopify Marketplace Integration:** ShopBot agent manages marketplace operations across Trendyol and Shopify, featuring encrypted credential storage and 11 agent tools for product, order, stock, and pricing management.
*   **Data Analyst File Analysis & Charting:** DataBot agent supports Excel/CSV file upload, inline chart rendering (Recharts), and 9 new tools for file analysis, querying, charting, anomaly detection, and reporting.
*   **Per-User Token Spending Limits:** Admin panel allows setting individual token spending limits ($USD) per user.
*   **CRM Document Manager:** For managing customer documents.
*   **KVKK/GDPR Compliance:** Full data privacy infrastructure including consent tracking, data export, and account deletion.
*   **User Behavior Analytics:** Internal analytics system tracking page views and user events with an admin dashboard for usage metrics.
*   **User Profile Enrichment & Onboarding:** Post-registration onboarding and profile enrichment, with demographic distributions visible in the admin panel.
*   **User Feedback System:** Multi-channel feedback collection (NPS surveys, chat-end ratings, general feedback form) with an admin dashboard for analysis.
*   **Rex CRM Infrastructure:** Full CRM system for the Sales SDR agent (Rex), including tables for contacts, deals, activities, sequences, and stage history, with application-level tenant isolation.
*   **Rex Real Web Search & Smart Lead Finding:** Rex uses OpenAI's Responses API for real web search and includes tools to `research_company` and `find_leads` for B2B lead discovery and classification.
*   **Admin Agent Custom Instructions:** Allows admins to set global and per-agent custom instructions for runtime injection.
*   **Quick Reply Buttons:** Agent messages can include clickable button options using `[BUTTONS]...[/BUTTONS]` format for interactive user choices.
*   **Invoice Creation Flow:** Finn and Rex follow a step-by-step button-guided flow for invoice creation, incorporating invoice type, currency, Incoterm, and product details.
*   **Mobile Chat Input:** Chat input uses a multi-line textarea for improved mobile UX.
*   **Brand Identity and Secrecy:** Agents attribute capabilities to "proprietary RentAI 24 AI technology" and maintain platform confidentiality.
*   **Internationalization (i18n):** Full bilingual support (English/Turkish) using react-i18next on frontend and a centralized message dictionary on backend.
*   **Workflow Automation Engine:** A native, lightweight workflow automation system (n8n-inspired) allows users to chain agent actions into multi-step automated workflows. It supports trigger, action, condition, delay, and loop node types with template variable resolution and 16 action types (including `run_skill`), per-node retry logic, and error branching. It includes an integration catalog with 28 pre-configured services across various categories, enhanced multi-condition logic, pre-built workflow templates, and a bridge between agent tool calls and automation triggers. A scheduler service supports user-friendly schedule configurations. The frontend features a visual SVG-based node editor and an execution timeline.
*   **Boost Mode (Parallel Task System):** A paid add-on allowing users to run multiple parallel conversations with the same agent simultaneously. Four tiers: Boost 3 ($150/mo, 3 parallel tasks), Boost 7 ($300/mo, 7 parallel), Muhasebe Boost ($200/mo, bookkeeping-specific 3 parallel), Pro Boost ($1,750/mo, unlimited). Backend includes `boost_subscriptions` table, `BOOST_CONFIG` constant, test-checkout flow, Stripe webhook handling for boost events, parallel conversation limit enforcement in `/api/chat`, and boost status tracking on conversations (`isBoostTask`, `boostStatus` columns). API endpoints: `GET /api/boost/status`, `GET /api/boost/tasks`, `POST /api/boost/checkout/test`, `POST /api/boost/checkout`.
*   **OpenClaw-Inspired Skill System:** An extensible skill system (`server/n8n/skillEngine.ts`) with 18 built-in skills across 8 categories (text_analysis, ai_powered, calculation, data_processing, utility, communication, integration, file_ops). Skills are stored in `agent_skills` table and assigned to agents via `agent_skill_assignments`. Supports 4 skill types: `builtin` (hardcoded), `http` (external API calls with SSRF protection), `prompt` (AI-powered via OpenAI), and `expression` (JavaScript eval). Skills are dynamically injected as OpenAI function tools via `getSkillsForAgent()` and `skillToOpenAITool()`. Admin panel has full CRUD, agent assignment (individual + bulk), seed, and detail views under the "Beceriler" tab in AI Training. Workflow automation supports `run_skill` action nodes with a SkillConfigPanel for parameter mapping.

## External Dependencies
*   **OpenAI:** GPT-4o, `text-embedding-3-small`
*   **Anthropic:** Claude Sonnet 4, Claude 3 Haiku
*   **NVIDIA Cloud API:** Nemotron 70B, Ultra 253B, 340B Instruct (OpenAI-compatible, via `https://integrate.api.nvidia.com/v1`)
*   **PostgreSQL (Neon serverless)**
*   **Stripe:** Payment processing
*   **Drizzle ORM**
*   **Google APIs:** Gmail (OAuth), Google Calendar
*   **Resend:** Email delivery
*   **Pinecone:** Vector database
*   **Meta WhatsApp Business Cloud API**