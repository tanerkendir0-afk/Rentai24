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
*   **Per-User Gmail:** Enables users to connect their personal Gmail accounts for agents to send/receive emails.
*   **Social Media Accounts & Auto-Publishing:** Users can connect various social media accounts, allowing Maya AI to auto-publish or prepare posts for manual sharing based on account type.
*   **Shipping/Cargo Providers:** Users can connect shipping provider APIs (e.g., Aras Kargo, UPS), which ShopBot AI can access.
*   **Help & Support System:** Users can report issues and requests, view ticket history, and admins can manage tickets via a dedicated panel.
*   **Boss AI Notification System:** Notifies Boss AI of agent actions and sends email notifications to users with configured Gmail.
*   **PWA Support:** Provides an installable, app-like experience.
*   **AI Guardrails System:** Implements multi-layer security with input guardrails (prompt injection detection, blocked topics, rate limiting) and output guardrails (sensitive data sanitization, response length limits), logging all blocks.
*   **Agent Behavior Improvements:** Includes efficiency rules, tool call deduplication, and better error handling for Gmail.
*   **Agent Performance Dashboard:** Displays per-agent statistics like sessions, messages, error rates, and health status.
*   **Conversation Review System:** Allows admins to browse, filter, and rate conversations, influencing training data quality.
*   **Training Data Quality Scoring:** Scores conversation quality for training data exports, filtering out low-quality examples.
*   **Brand Identity Protection:** Agents attribute capabilities to "proprietary RentAI 24 AI technology."

## External Dependencies
*   **OpenAI:** GPT-4o, `text-embedding-3-small` (via Replit AI Integrations)
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