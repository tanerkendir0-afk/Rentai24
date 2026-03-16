# RentAI 24

## Overview
RentAI 24 is the world's first AI staffing agency website, offering businesses on-demand, pre-trained AI agents for roles like customer support, sales, and bookkeeping. The platform aims to streamline business operations by providing flexible AI talent, reducing traditional hiring complexities, and capitalizing on the increasing demand for AI in business. Key capabilities include managing a catalog of AI workers, user authentication, customer dashboards, admin panels, and a robust AI tooling system. The platform emphasizes token optimization, advanced security measures, and agent collaboration.

## User Preferences
I prefer a conversational and iterative approach. Please ask clarifying questions and propose solutions incrementally. I value detailed explanations of your thought process and any changes you plan to make. Before implementing any major features or architectural changes, please describe your approach and wait for my approval. I prefer clear, concise language in all communications.

## System Architecture
The RentAI 24 platform utilizes a modern web stack with React, TypeScript, and Tailwind CSS for the frontend, bundled with Vite. The UI features a dark mode with navy and blue-to-violet gradients. The backend is built with Express.js, leveraging PostgreSQL (Neon serverless) and Drizzle ORM. OpenAI GPT-4o is integrated for core AI functionalities.

**Key Architectural Decisions and Features:**

*   **User Management:** Session-based authentication and authorization supporting `user`, `agent_manager`, and `admin` roles, including Google OAuth.
*   **AI Worker Management:** A catalog of 9 distinct AI agents with specific personas, managed through a customer dashboard and admin panel.
*   **AI Tooling System:** A generalized registry allowing AI agents to perform actions like sending emails or generating images.
*   **RAG & Fine-tuning:** Support for document uploading, chunking, embedding (pgvector storage), and OpenAI fine-tuning.
*   **Token Optimization:** Implements smart model routing, conversation history summarization, compressed system prompts, RAG threshold adjustments, and conditional tool filtering.
*   **Persistent Chat & Team Features:** Server-side chat persistence and a system for managing team members whose context is injected into agent prompts.
*   **Communication Integrations:** Per-user Gmail (Google OAuth) for email operations, social media account integration for auto-publishing, and WhatsApp Business integration for agent-driven messaging.
*   **Security & Monitoring:** Multi-layer AI guardrails (input/output), distillation protection, server hardening, obfuscated admin panel, and an admin security report.
*   **Agent Behavior Enhancements:** Proactive agent behavior with a `web_search` tool, efficiency rules, and improved error handling.
*   **Manager Agent (Smart Router):** An intelligent routing layer that classifies user messages and directs them to the appropriate hired agent.
*   **Human Escalation System:** Detects frustrated user interactions, triggers escalations, and allows admins to join live chats.
*   **Agent Document Handling:** All agents can read, analyze, and correct user-uploaded documents, with specific enhancements for data analysis.
*   **Multi-AI Provider Support:** Allows selection of alternative AI providers (e.g., Anthropic Claude) per-agent from the admin panel, with A/B testing and spend comparison features.
*   **Finn Turkish Accounting Upgrade:** Specialized bookkeeping agent with professional Turkish accounting features including KDV invoicing, TCMB exchange rates, and comprehensive financial management.
*   **CRM Document Manager:** Allows users to upload and manage customer documents within the platform.
*   **Admin Agent Custom Instructions:** Enables admins to set global and per-agent custom instructions for runtime injection into agent system prompts.
*   **Brand Identity and Secrecy:** Agents attribute capabilities to "proprietary RentAI 24 AI technology" and refuse to reveal platform internals without a specific password.
*   **Internationalization (i18n):** Full bilingual support (English/Turkish) using react-i18next on frontend and a centralized message dictionary on backend. Default language is English. Users toggle TR/EN via a navbar button. Logged-in users' language preferences are saved to the database (`users.language` column) and restored on login. Locale files are in `client/src/locales/{en,tr}/{common,pages,agents}.json`. The `LanguageProvider` component (`client/src/lib/language.tsx`) wraps the app inside `AuthProvider` and syncs language from user data. Backend endpoint `PATCH /api/auth/language` persists the preference. Backend i18n: `server/i18n.ts` provides `resolveUserLang(req)` and a `langMiddleware()` that sets `req.lang` on all `/api` routes. `server/messages.ts` contains all bilingual error/status messages accessed via `msg(key, lang)`. All API error responses use `msg()` for bilingual support. Email templates (`server/emailTemplates.ts`) and guardrails (`server/guardrails.ts`) also support bilingual output.

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
*   **Shipping/Cargo Providers:** (e.g., Aras Kargo, UPS)