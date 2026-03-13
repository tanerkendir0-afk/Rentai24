# RentAI 24

## Overview
RentAI 24 is envisioned as the world's first AI staffing agency website, offering businesses a platform to browse, rent, and manage pre-trained AI agents. These agents are designed to fill various roles such as customer support, sales, and bookkeeping. The project aims to provide flexible, on-demand AI talent, reducing the overhead associated with traditional hiring. The platform seeks to tap into the growing demand for AI solutions in business operations, offering a streamlined process for deploying AI workers 24/7.

## User Preferences
I prefer a conversational and iterative approach. Please ask clarifying questions and propose solutions incrementally. I value detailed explanations of your thought process and any changes you plan to make. Before implementing any major features or architectural changes, please describe your approach and wait for my approval. I prefer clear, concise language in all communications.

## System Architecture
The RentAI 24 platform is built with a modern web stack. The frontend utilizes React, TypeScript, and Tailwind CSS, bundled with Vite, emphasizing a dark mode UI with a navy background and blue-to-violet gradient accents. The backend is powered by Express.js, with PostgreSQL (Neon serverless) as the primary database, managed through Drizzle ORM. AI capabilities are integrated via OpenAI GPT-4o, leveraging Replit AI Integrations for core functionalities.

**Key Features:**

*   **AI Worker Catalog:** A dedicated section showcasing 9 distinct AI agents, each with a specific persona (e.g., Ava the Customer Support Agent, Rex the Sales Development Rep, Reno the Real Estate Agent).
*   **User Authentication & Authorization:** Session-based authentication using `express-session` and `bcrypt` for secure user management, including login, registration, and protected routes.
*   **Customer Dashboard:** A personalized dashboard for users to manage rented AI workers, monitor usage statistics, and handle billing.
*   **Admin Panel:** A password-protected interface for administrators to manage RAG (Retrieval Augmented Generation) documents, fine-tune AI models, and monitor system activity.
*   **AI Tooling System:** A generalized tool registry allows AI agents to perform specific actions (e.g., sending emails, creating tickets, generating images). This includes tools for sales (Rex), customer support (Ava), scheduling (Cal), data analysis (DataBot), social media (Maya), bookkeeping (Finn), HR (Harper), e-commerce (ShopBot), and real estate (Reno).
*   **RAG & Fine-tuning:** Supports uploading documents for RAG, chunking, embedding using `text-embedding-3-small`, and vector storage via `pgvector`. It also facilitates OpenAI fine-tuning for specialized agent models.
*   **Image Credits & Uploads:** Users can purchase image credits for AI image generation (DALL-E 3) and stock photo searches. The platform supports in-chat image uploads.
*   **Token Cost Tracker:** Admin panel tracks all OpenAI API token usage per request — model, prompt/completion tokens, USD cost. Summary and detailed views with $0.01+ expensive request filter. DB table: `token_usage`. Admin APIs: `/api/admin/token-usage/totals`, `/summary`, `/detailed`.
*   **PWA Support:** The application includes a web app manifest and service worker for PWA capabilities, offering an installable, app-like experience.
*   **Brand Identity Protection:** AI agents are programmed to never reveal underlying technologies, always attributing their capabilities to "proprietary RentAI 24 AI technology."

## External Dependencies
*   **OpenAI:** Utilized for core AI agent functionalities, specifically GPT-4o and `text-embedding-3-small`, integrated via Replit AI Integrations.
*   **PostgreSQL (Neon serverless):** Primary database solution for storing all application data, including user profiles, rentals, agent documents, and fine-tuning job details.
*   **Stripe:** Integrated for all payment processing, including subscriptions for AI worker rentals, one-time image credit purchases, and managing customer billing portals.
*   **Drizzle ORM:** Used for object-relational mapping with the PostgreSQL database.
*   **Framer Motion:** Employed for animations in the frontend.
*   **React Hook Form & Zod:** Used for form management and validation.
*   **TanStack Query:** Manages data fetching, caching, and synchronization in the frontend.
*   **Lucide React & React Icons/si:** Icon libraries for the user interface.
*   **Multer:** Middleware for handling `multipart/form-data`, primarily for file uploads (e.g., RAG documents).
*   **Google Fonts (Inter):** The chosen font for the application's typography.
*   **Gmail (OAuth) & Resend:** Used for email routing and sending, particularly for sales and customer support agents.
*   **Google Calendar:** Integrated for scheduling appointments by the Cal agent.