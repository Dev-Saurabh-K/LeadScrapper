# 🚀 B2B Lead Scraper & International Registry Intelligence

An automated multi-source B2B lead scraping engine and sales dashboard built with **Next.js 16 (App Router)**, **Tailwind CSS**, and **Supabase (PostgreSQL)** with automatic local JSON fallback.

Supports **Hyper-Local Google Maps Scraping**, **Authless LinkedIn Lead Generation**, **Authless Instagram Business & Creator Lead Generation**, and **Authless Facebook Business Pages & Places Search (Zero Tokens / No Login Required)**, de-duplicates leads, normalizes contacts, automatically appends to a unified `Master_B2B_Leads.xlsx` workbook, and supports optional on-demand email dispatches.

---

## ⚡ Quick Start

### 1. Run Interactive Dashboard (UI)
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to launch scrapes, switch between engines (Google Maps, LinkedIn, Instagram, or Facebook), search leads, inspect columns, and export to Excel.

### 2. Run Automated Headless Scraper (CLI)
```bash
npm run scrape
# Or specifically target Google Maps:
npm run scrape:maps
# Or run standalone tests:
npm run test:facebook
npm run test:instagram
npm run test:linkedin
```
Runs in the background, updates the database, appends to [`exports/Master_B2B_Leads.xlsx`](exports/Master_B2B_Leads.xlsx), and sends an email summary if configured.

---

## 🎯 Supported Engines

| Engine | Target Data | Method | Auth Required | Status |
| :--- | :--- | :--- | :---: | :---: |
| 📍 **Google Maps** | Local businesses, phone numbers, websites, physical addresses, review counts, coordinates | Stealth Puppeteer hyper-local extraction | ❌ Zero API keys | 🟢 Active |
| 💼 **LinkedIn Leads** | Decision-makers, Job Titles (CEOs, VPs, Heads of Sales), company names, locations, profile links, contact info | Authless Search Engine X-Ray & structured snippet extraction | ❌ No tokens / No login | 🟢 Active |
| 📸 **Instagram Leads** | Creators, business accounts, boutique brands, handles, bio links, public emails, and phone/WhatsApp | Authless Search Engine X-Ray & structured snippet extraction | ❌ No tokens / No login | 🟢 Active |
| 📘 **Facebook Leads** | Business pages, local places, verified phone numbers, street addresses, postal codes, websites, follower metrics | Authless Search Engine X-Ray & structured snippet extraction | ❌ No tokens / No login | 🟢 Active |

---

## 📊 Priority Sorting & Excel Master Workbook

All leads across both engines are unified into a single workbook: [`exports/Master_B2B_Leads.xlsx`](exports/Master_B2B_Leads.xlsx).
Rows and columns are arranged with strict sales priority:
1. **Priority 1 (P1)**: Leads with **both Phone and Email** verified.
2. **Priority 2 (P2)**: Leads with **Phone or Email** present.
3. **Priority 3 (P3)**: Leads with Website or Company profile details only.

Columns are prioritized: **Company Name** → **Phone** → **Email** → **Website** → **Director / Officers** → Registry Details.

---

## ✉️ Optional Email Dispatch

- **Safe by Default**: If no recipient email is entered during a scrape job, auto-emailing is cleanly skipped.
- **Optional Target Box**: Enter any recipient email address in the scrape form to send the generated Excel sheet immediately upon job completion.
- **Manual Dispatch Tab**: The dedicated **Dispatch Email** tab allows sending the latest Master Excel workbook to any recipient email with a single click.

---

## 🛠️ Testing & Verification Suites

```bash
# Run unit & connector test suites (109 tests)
npm test

# Run the comprehensive 5-phase full-system verification suite (30 assertions)
npm run test:phases

# Run all feature verification tests
npm run test:all

# Run LinkedIn connector standalone tests
npm run test:linkedin

# Build production application (Next.js 16 Turbopack)
npm run build
```

---

## 📚 Documentation
* **Complete User Guide & Instructions**: [INSTRUCTIONS.md](INSTRUCTIONS.md)
* **Data Flow & Workflow Architecture**: [WORKFLOW.md](WORKFLOW.md)
* **Engineering & Architecture Reference**: [ENGINEERING.md](ENGINEERING.md)
* **Live Scraper Audit & Registry Status**: [SCRAPER_STATUS.md](SCRAPER_STATUS.md)
* **PostgreSQL Database Schema**: [supabase/schema.sql](supabase/schema.sql)
* **API Documentation**: Available at `/docs` or [http://localhost:3000/docs](http://localhost:3000/docs)
