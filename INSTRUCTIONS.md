# 📖 B2B Lead Scraper — Complete User Guide & Instructions

Welcome to the **B2B Lead Scraper**! This system automatically extracts company leads from public international registries, de-duplicates records, stores them in **Supabase (PostgreSQL)**, enriches contact details (emails & phone numbers) from verified websites, writes a formatted Excel file (`exports/Master_B2B_Leads.xlsx`), and emails job completion summaries to the sales team.

---

## 📑 Table of Contents
1. [Prerequisites & Environment Setup](#1-prerequisites--environment-setup)
2. [How to Use: Web UI Dashboard](#2-how-to-use-web-ui-dashboard)
3. [How to Use: Headless CLI Scraper](#3-how-to-use-headless-cli-scraper)
4. [How to Automate with Windows Task Scheduler](#4-how-to-automate-with-windows-task-scheduler)
5. [REST API Endpoints & cURL Examples](#5-rest-api-endpoints--curl-examples)
6. [Supported Registries & API Key Activation](#6-supported-registries--api-key-activation)
7. [Verification & Diagnostic Tools](#7-verification--diagnostic-tools)

---

## 1. Prerequisites & Environment Setup

### 1.1 Node.js
Make sure you have Node.js installed (v18.0 or newer recommended):
```bash
node -v
```

### 1.2 Environment Variables (`.env`)
The project comes with a template file `.env.example`. Your private `.env` is already configured and gitignored.

If configuring on a new machine:
```bash
cp .env.example .env
```
Fill in your credentials in `.env`:
```env
# Supabase (PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres

# Email SMTP Notification (Job Completion Summaries)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="B2B Lead Scraper <your-email@gmail.com>"
NOTIFICATION_EMAIL_TO=your-email@gmail.com

# Optional Registry Keys
COMPANIES_HOUSE_API_KEY=
ABN_LOOKUP_GUID=
```

### 1.3 Supabase Database Migration
Your database tables (`leads` and `scrape_jobs`) are already provisioned. If you ever need to recreate them on a new Supabase project:
```bash
node scripts/migrate-supabase.mjs
```
*(Or copy and run the SQL in `supabase/schema.sql` inside the Supabase SQL Editor).*

---

## 2. How to Use: Web UI Dashboard

The graphical dashboard provides full interactive control over scraping, search, filtering, and exports.

### Step 1: Start the Development Server
```bash
npm run dev
```

### Step 2: Open in Browser
Navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

### Step 3: Explore Features on the Dashboard
1. **System Health Bar**:
   - Shows live connection status of your **Supabase Database** and **SMTP Email**.
2. **Leads Explorer Tab**:
   - Real-time search bar across Company Name, Registration Number, and Directors.
   - Filters: Filter by Country, "Has Email", and "Has Phone".
   - Click the 👁️ (Eye) icon to view full details (address, officers, industry).
   - Click the ✨ (Sparkle) icon on any company to run website contact enrichment on demand.
3. **Export Leads (Custom Column Selector) Tab**:
   - **Step 1 (Scraped Dataset Source)**: Automatically loads latest scraped leads from `exports/Master_B2B_Leads.xlsx` and Supabase. In the background, **all 16 fields are permanently saved in Supabase PostgreSQL**. This tool lets you export only the columns you want.
   - **Step 2 (Filter Options)**:
     - **Status**: Defaults to **Active Companies Only** (or choose *Inactive Companies Only*, *All Companies*).
     - **Priority Outreach Filter**: Quickly filter for **P1: Phone & Email** or **P2: Has Website**.
     - **Industry Sector**: Filter dynamically by any scraped industry sector.
     - **City Location**: Filter by city (e.g. Oslo, Paris, Singapore).
     - **Search Bar**: Instant real-time search across company names, registration numbers, or directors.
     - **Clear Filters**: Resets all filters back to default with 1 click.
   - **Step 3 (Which Columns Do You Need to Export?)**: Check/uncheck the exact columns to include in your Excel file (Phone, Email, Website, Company Name, Director/Officers, Registration Number, Address, City, Postal Code, Industry, Status). Unchecked columns remain safely in Supabase. Includes **Select All** and **Deselect All** buttons.
   - **Step 4 (Live Preview & Export to Excel)**:
     - View live KPI counters (Total Scraped, Active Companies, P1: Phone & Email, P2: Has Website, Filtered Matches).
     - Interactive paginated preview table (10, 25, 50, 100 rows per page) showing *only your selected columns* with Phone & Email prioritized at the top.
     - Customize the output filename (e.g. `B2B_Exported_Leads.xlsx`) and click **Export to Excel** to instantly download the customized file.
4. **Scraper Control Panel Tab**:
   - **Target Registries**: Toggle checkboxes for Norway, France, Singapore, USA, UK, Canada, Australia.
   - **Search Query**: Enter keyword or industry (e.g. `technology`, `logistics`, `shipping`, `energy`, or leave blank).
   - **Limit per Country**: Choose 5, 10, 20, or 50 records per registry.
   - **Enrich Company Websites**: Check to crawl company Contact/About pages for emails and phones.
   - **Polite Delay**: Choose delay between requests (default 1000ms).
   - Click **Start Lead Scraping Job**.
5. **Email Dispatch Tab**:
   - **Recipient Input**: Specify any target recipient email (with 1-click quick-fill pills for `saurabhkumar.sakr@gmail.com` and `saurabh7739278614@gmail.com`).
   - **Subject Line**: Custom subject or auto-generated default e.g. `B2B Leads Report — 24 Companies (Master_B2B_Leads.xlsx)`.
   - **Geographic Scope**: Filter report to specific country (e.g. Norway, Singapore) or send all globally scraped leads.
   - **Cover Note**: Include personal executive commentary, notes, or instructions.
   - **Attachment Toggle**: Checkbox to attach the styled multi-sheet `Master_B2B_Leads.xlsx` workbook directly to the email.
   - **Live Recipient Inbox Preview**: Real-time rendering card showing exactly how the email appears in the recipient's inbox before sending.
   - **Sent History**: Audit log of all emails dispatched during the session with timestamps and SMTP message IDs.
6. **Live Activity Console**:
   - Watch the terminal stream live events as each country registry is queried.
7. **Download Master Excel**:
   - Click **Export Master Excel** in the navbar or at the end of a job to download [`exports/Master_B2B_Leads.xlsx`](file:///d:/internship/the-corent\leadscrape\exports\Master_B2B_Leads.xlsx).
8. **API Docs**:
   - Click **API Docs & Integration** in the navbar or visit [http://localhost:3000/docs](http://localhost:3000/docs).

---

## 3. How to Use: Headless CLI Scraper

If you want the scraper to run automatically without opening a web browser:

### 3.1 Standard Automated Run
```bash
npm run scrape
```

**What this command does automatically:**
1. Connects to international registries (Norway, France, Singapore, USA).
2. De-duplicates leads against your database.
3. Inserts new leads into **Supabase PostgreSQL**.
4. Automatically generates and updates [`exports/Master_B2B_Leads.xlsx`](file:///d:/internship/the-corent/leadscrape/exports/Master_B2B_Leads.xlsx).
5. Dispatches an email summary to `saurabh7739278614@gmail.com` with the **Excel workbook attached**!

### 3.2 CLI Options & Flags
You can customize the headless scrape by passing arguments:
```bash
# Custom industry query and limit
node scripts/run-scraper.mjs --query=logistics --limit=50

# Fast run without website crawling
node scripts/run-scraper.mjs --limit=10 --no-enrich
```

---

## 4. How to Automate with Windows Task Scheduler

To make the scraper run completely automatically on a schedule (e.g., daily at 9:00 AM):

1. Press `Win + S` and type **Task Scheduler**, then press Enter.
2. In the right panel, click **Create Basic Task...**.
3. **Name**: `B2B Lead Scraper Daily Job`.
4. **Trigger**: Select **Daily** (or **Weekly**) and set the desired time.
5. **Action**: Select **Start a program**.
6. **Program/script**:
   ```
   C:\Program Files\nodejs\node.exe
   ```
   *(Or the path returned by running `where node` in cmd).*
7. **Add arguments**:
   ```
   scripts/run-scraper.mjs --limit=20
   ```
8. **Start in**:
   ```
   D:\internship\the-corent\leadscrape
   ```
9. Click **Finish**.

Now Windows will run the scraper automatically, update your Excel sheet, and email you the summary!

---

## 5. REST API Endpoints & cURL Examples

The backend is built with Next.js 16 Route Handlers and exposes REST APIs:

### 5.1 Trigger a Scrape Job
```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "countries": ["NO", "FR", "SG", "US"],
    "query": "technology",
    "limit": 20,
    "enrich": true,
    "delayMs": 1000
  }'
```

### 5.2 Query Stored Leads
```bash
# Query all leads with email in Norway
curl "http://localhost:3000/api/leads?country=Norway&hasEmail=true&limit=50"
```

### 5.3 Download Master Excel File
```bash
curl -O http://localhost:3000/api/export
```

### 5.4 Check System Health
```bash
curl http://localhost:3000/api/health
```

---

## 6. Supported Registries & API Key Activation

### 🟢 100% Free Registries (No API Key Required)
These 5 registries work out of the box with live data:
* 🇳🇴 **Norway**: `data.brreg.no` (Brønnøysundregistrene)
* 🇫🇷 **France**: `recherche-entreprises.api.gouv.fr` (api.gouv.fr)
* 🇸🇬 **Singapore**: `data.gov.sg` (ACRA Open Data)
* 🇺🇸 **USA**: `data.colorado.gov` (Socrata Open Data)
* 🇨🇦 **Canada**: `open.canada.ca` (Corporations Canada)

### 🟡 Registries Requiring Free Registration
These connectors are fully implemented and currently operate with verified sandbox data. To activate live API queries:

1. **UK Companies House**:
   - Register for free at [developer.companyinformation.service.gov.uk](https://developer.companyinformation.service.gov.uk) (2 mins).
   - Create an app and copy your API Key.
   - Add to `.env`:
     ```env
     COMPANIES_HOUSE_API_KEY=your_key_here
     ```

2. **Australia ABN Lookup**:
   - Register email at [abr.business.gov.au/Tools/WebServices](https://abr.business.gov.au/Tools/WebServices).
   - Receive free GUID via email.
   - Add to `.env`:
     ```env
     ABN_LOOKUP_GUID=your_guid_here
     ```

---

## 7. Verification & Diagnostic Tools

You can run automated checks at any time:

* **Test All Scrapers & Registries (Audit)**:
  ```bash
  node scripts/diagnose-scrapers.mjs
  ```
* **Run Connector & De-duplication Test Suite**:
  ```bash
  npm test
  ```
* **Run Supabase Database Migration**:
  ```bash
  node scripts/migrate-supabase.mjs
  ```
* **Verify Production Build**:
  ```bash
  npm run build
  ```

.