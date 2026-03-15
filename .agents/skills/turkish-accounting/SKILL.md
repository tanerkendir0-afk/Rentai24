---
name: turkish-accounting
description: Turkish accounting system reference for the Finn (Bookkeeping) AI agent. Covers Tekdüzen Hesap Planı, KDV rates and tevkifat, stopaj, SGK premiums, payroll calculations, Ba-Bs reporting, tax calendar, depreciation, TCMB exchange rates, and common journal entry templates. Use when handling any Turkish accounting, tax, or financial query for the Finn agent.
---

# Turkish Accounting System Reference

This skill provides the Finn (Bookkeeping) agent with comprehensive Turkish accounting knowledge sourced from a structured reference database (52 chunks). The reference data is loaded at runtime via `server/muhasebeRetriever.ts` which performs keyword-based retrieval from `server/turk-muhasebe-chunks.json`.

## How It Works

1. When a user sends a message to Finn, the `getMuhasebeContext(userMessage)` function is called
2. It detects the category (KDV, SGK, bordro, stopaj, etc.) from keywords in the query
3. It retrieves the most relevant chunks from the local JSON database
4. The retrieved context is injected into the system prompt as `<referans_bilgisi>` blocks
5. Finn uses this context to provide accurate, regulation-referenced responses

## Key Rules for Finn

1. Use reference data as PRIMARY SOURCE. Rates, amounts, and account codes from reference take priority.
2. Always cite the relevant law/regulation (VUK md. X, GVK md. Y, KDVK md. Z).
3. Write account codes with both number and name (e.g., "120 Alıcılar").
4. When creating journal entries, verify debit-credit balance.
5. Use Turkish number format (1.250.000,50 ₺). Always clarify KDV inclusive/exclusive.
6. State which year's data is being used for variable parameters (tax rates, minimum wage, SGK ceiling).
7. Proactively warn about penalty risks for incorrect applications.
8. Always use TCMB (Central Bank) exchange rates, not market rates.

## Coverage Areas

- **Tekdüzen Hesap Planı** (Uniform Chart of Accounts): Classes 1-7
- **KDV**: Rates (%1, %10, %20), exemptions, full/partial withholding (tevkifat)
- **Stopaj**: Freelance %20, rent %20, royalty %17, construction %5
- **SGK**: Worker %15, employer %23.75 (2026), minimum wage 33,030 ₺
- **Gelir Vergisi**: 2025 and 2026 brackets (wage and non-wage separate)
- **Damga Vergisi**: Payroll 7.59‰, contracts 9.48‰
- **Ba-Bs**: Monthly reporting for transactions ≥ 5,000 ₺ per entity
- **Tax Calendar**: KDV (28th), Muhtasar (26th), SGK (month end)
- **Depreciation**: Methods and common asset rates
- **TCMB Exchange Rates**: VUK md. 280 rules, year-end valuation
- **DİİB**: Inward processing permits, recording rules
- **Export/Import Accounting**: GB dates, FX differences, customs duties
- **Severance/Notice Pay**: Calculation rules, caps
- **Sector-specific**: Steel/manufacturing fire rates, scrap accounting

## Files

- `server/turk-muhasebe-chunks.json` — 52 reference chunks
- `server/muhasebeRetriever.ts` — Context retrieval module
- `attached_assets/muhasebe-system-prompt.md` — System prompt reference
