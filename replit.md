# RentAI 24

## Overview
RentAI 24 is the world's first AI staffing agency website, providing businesses with on-demand, pre-trained AI agents for various roles (e.g., customer support, sales, bookkeeping). The platform aims to simplify business operations by offering flexible AI talent, reducing traditional hiring complexities, and meeting the growing demand for AI in business. It features a catalog of AI workers, user authentication, customer dashboards, admin panels, and an advanced AI tooling system. The project prioritizes token optimization, robust security, and agent collaboration.

## User Preferences
I prefer a conversational and iterative approach. Please ask clarifying questions and propose solutions incrementally. I value detailed explanations of your thought process and any changes you plan to make. Before implementing any major features or architectural changes, please describe your approach and wait for my approval. I prefer clear, concise language in all communications.

## System Architecture
The RentAI 24 platform uses a modern web stack: React, TypeScript, and Tailwind CSS (with Vite) for the frontend, featuring a dark mode with navy and blue-to-violet gradients. The backend is built with Express.js, PostgreSQL (Neon serverless), and Drizzle ORM. OpenAI GPT-4o is integrated for core AI functionalities.

**Core Architectural Decisions and Features:**

*   **User Management:** Session-based authentication and authorization with `user`, `agent_manager`, and `admin` roles, including Google OAuth.
*   **AI Worker Management:** A catalog of 9 distinct AI agents with specific personas, managed via customer and admin interfaces.
*   **AI Tooling System:** A generalized registry for AI agents to perform actions like sending emails or generating images.
*   **RAG & Fine-tuning:** Supports document uploading, chunking, embedding (pgvector), and OpenAI fine-tuning.
*   **Token Optimization:** Achieved through smart model routing, conversation history summarization, compressed system prompts, RAG threshold adjustments, and conditional tool filtering.
*   **Persistent Chat & Team Features:** Server-side chat persistence and team management for injecting context into agent prompts.
*   **Communication Integrations:** Per-user Gmail integration, social media auto-publishing, and WhatsApp Business integration.
*   **Security & Monitoring:** Multi-layer AI guardrails, distillation protection, server hardening, obfuscated admin panel, and an admin security report. Includes global error handlers, graceful shutdown, per-agent circuit breakers, rate limiting, request timeouts, agent heartbeat monitoring, and a health check endpoint.
*   **Agent Behavior Enhancements:** Proactive agents with `web_search` tool, efficiency rules, and improved error handling.
*   **Manager Agent (Smart Router):** Classifies user messages and routes them to appropriate agents.
*   **Human Escalation System:** Detects frustrated users, triggers escalations, and allows admin intervention in live chats.
*   **Agent Document Handling:** All agents can read, analyze, and correct user-uploaded documents.
*   **Multi-AI Provider Support:** Allows per-agent selection of alternative AI providers (e.g., Anthropic Claude) via the admin panel, with A/B testing and spend comparison.
*   **Finn Turkish Accounting Upgrade:** Specialized bookkeeping agent with Turkish accounting features, including KDV invoicing (with DB persistence, PDF/Excel export), TCMB exchange rates, comprehensive financial management, and Excel report generation (Mizan, Bilanço, Bordro, Gelir Tablosu, KDV Özet). Uses PDFKit for PDF generation and dedicated services for report generation. Supports KaTeX math rendering in chat.
*   **Finn Calculation Tools:** Dedicated deterministic calculation service for Finn, including tools for KDV, payroll, amortization, FX revaluation, withholding, and journal entry formatting.
*   **CRM Document Manager:** For managing customer documents.
*   **KVKK/GDPR Compliance:** Full data privacy infrastructure including consent tracking, data export, account deletion with cascading data removal, and admin consent statistics.
*   **User Behavior Analytics:** Internal analytics system tracking page views and user events, enforcing KVKK consent. Includes an admin dashboard for usage metrics and conversion funnels.
*   **User Profile Enrichment & Onboarding:** Post-registration onboarding and profile enrichment with industry, company size, country, intended agents, and referral source. Admin panel shows demographic distributions.
*   **User Feedback System:** Multi-channel feedback collection (NPS surveys, chat-end emoji ratings, general feedback form) with an admin dashboard for analysis.
*   **Rex CRM Infrastructure:** Full CRM system for the Sales SDR agent (Rex), including tables for contacts, deals, activities, sequences, and stage history, with application-level tenant isolation.
*   **Rex Real Web Search & Smart Lead Finding:** Rex uses OpenAI's Responses API for real web search and includes tools to `research_company` and `find_leads` for B2B lead discovery and classification.
*   **Admin Agent Custom Instructions:** Allows admins to set global and per-agent custom instructions for runtime injection.
*   **Brand Identity and Secrecy:** Agents attribute capabilities to "proprietary RentAI 24 AI technology" and maintain platform confidentiality.
*   **Internationalization (i18n):** Full bilingual support (English/Turkish) using react-i18next on frontend and a centralized message dictionary on backend. User language preferences are saved.
*   **Stability & Diagnostics:** Includes process-level crash handlers, startup memory logging, and a diagnostics health endpoint.

## External Dependencies
*   **OpenAI:** GPT-4o, `text-embedding-3-small`
*   **Anthropic:** Claude Sonnet 4, Claude 3 Haiku
*   **PostgreSQL (Neon serverless)**
*   **Stripe:** Payment processing
*   **Drizzle ORM**
*   **Google APIs:** Gmail (OAuth), Google Calendar
*   **Resend:** Email delivery
*   **Pinecone:** Vector database
*   **Meta WhatsApp Business Cloud API**