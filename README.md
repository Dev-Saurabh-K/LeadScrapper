# 🚀 B2B Lead Scraper & International Registry Intelligence

An automated multi-country B2B lead scraping engine and sales dashboard built with **Next.js 16 (App Router)**, **Tailwind CSS**, and **Supabase (PostgreSQL)**.

Extracts company data from international corporate registries, de-duplicates leads, enriches contact details (emails & phones) via polite website crawling, updates a styled `Master_B2B_Leads.xlsx` workbook, and sends post-job SMTP email summaries.

---

## ⚡ Quick Start

### 1. Run Interactive Dashboard (UI)
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to launch scrapes, search leads, and export to Excel.

### 2. Run Automated Headless Scraper (CLI)
```bash
npm run scrape
```
Runs in the background, updates Supabase, updates [`exports/Master_B2B_Leads.xlsx`](exports/Master_B2B_Leads.xlsx), and sends an email summary with the Excel sheet attached.

---

## 📚 Documentation
* **Complete User Guide & Instructions**: [INSTRUCTIONS.md](INSTRUCTIONS.md)
* **Data Flow & Workflow Architecture**: [WORKFLOW.md](WORKFLOW.md)
* **Engineering & Architecture Reference**: [ENGINEERING.md](ENGINEERING.md)
* **Live Scraper Audit & Registry Status**: [SCRAPER_STATUS.md](SCRAPER_STATUS.md)
* **PostgreSQL Database Schema**: [supabase/schema.sql](supabase/schema.sql)
* **API Documentation**: Available at `/docs` or [http://localhost:3000/docs](http://localhost:3000/docs)

---

## 🌍 Supported Registries

| Country | Source Registry | Status | Free Key Needed? |
| :--- | :--- | :---: | :---: |
| 🇳🇴 **Norway** | Brønnøysundregistrene (`data.brreg.no`) | 🟢 Live | ❌ None |
| 🇫🇷 **France** | Recherche d'entreprises (`api.gouv.fr`) | 🟢 Live | ❌ None |
| 🇸🇬 **Singapore** | ACRA (`data.gov.sg`) | 🟢 Live | ❌ None |
| 🇺🇸 **USA** | Colorado Socrata Open Data | 🟢 Live | ❌ None |
| 🇨🇦 **Canada** | Corporations Canada Open Data | 🟢 Live | ❌ None |
| 🇬🇧 **UK** | Companies House API | 🟡 Ready | 🔑 Free Key |
| 🇦🇺 **Australia** | ABN Lookup | 🟡 Ready | 🔑 Free GUID |

---

## 🛠️ Testing & Verification
```bash
# Run connector test suite
npm test

# Run scrapers audit diagnostic
node scripts/diagnose-scrapers.mjs

# Build production application
npm run build
```
