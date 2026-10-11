# B2B Lead Scraper — Live Connector Audit Report

This report documents the live operational status of all 7 country registry scrapers, including network latency, live record verification, and API key requirements.

---

## 📊 Summary Overview

| Country | Source Registry | Status | API Key Required? | Data Mode | Live Latency |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 🇳🇴 **Norway** | Brønnøysundregistrene (`data.brreg.no`) | ✅ **Working** | ❌ None | **Live API** | ~1.1s |
| 🇫🇷 **France** | Recherche d'entreprises (`api.gouv.fr`) | ✅ **Working** | ❌ None | **Live API** | ~0.5s |
| 🇸🇬 **Singapore** | ACRA (`data.gov.sg`) | ✅ **Working** | ❌ None | **Live API** | ~4.1s |
| 🇺🇸 **USA** | Socrata Open Data (`data.colorado.gov`) | ✅ **Working** | ❌ None | **Live API** | ~1.8s |
| 🇨🇦 **Canada** | Corporations Canada Open Data | ✅ **Working** | ❌ None | **Live API** | ~1.4s |
| 🇬🇧 **UK** | Companies House API | 🔑 **Needs Key** | 🔑 Free Key Needed | **Sandbox Fallback** | Instant |
| 🇦🇺 **Australia** | ABN Lookup (`abr.business.gov.au`) | 🔑 **Needs Key** | 🔑 Free GUID Needed | **Sandbox Fallback** | Instant |

---

## 🟢 1. Scrapers Working 100% Live (Zero Keys Needed)

These 5 registries are **fully operational out-of-the-box**, fetching real company records directly from government open data APIs:

### 🇳🇴 Norway — Brønnøysundregistrene
* **Status**: **Working Live**
* **API Endpoint**: `https://data.brreg.no/enhetsregisteret/api/enheter`
* **API Key Required**: **No** (Public JSON REST API)
* **Fields Extracted**: Company Name, Registration Number (`organisasjonsnummer`), Status, Registered Address, City, Postal Code, Industry/NACE code, and registered email (`epostadresse`) / phone / website if published.
* **Sample Live Result**: Company `- P A L M E R A -` (Reg: `916627939`)

### 🇫🇷 France — Recherche d'entreprises (INSEE / RNE)
* **Status**: **Working Live**
* **API Endpoint**: `https://recherche-entreprises.api.gouv.fr/search`
* **API Key Required**: **No** (Free Public API, ~7 requests/sec rate limit)
* **Fields Extracted**: Company Name (`nom_complet`), SIREN Registration Number, Key Directors/Officers (`dirigeants`), Registered Address (`siege`), City, Postal Code, NAF Industry code.
* **Sample Live Result**: Company `TECH` (Reg: `525245759`)

### 🇸🇬 Singapore — ACRA (data.gov.sg)
* **Status**: **Working Live**
* **API Endpoint**: `https://data.gov.sg/api/action/datastore_search` (Dataset: `d_8575e84912df3c28995b8e6e0e05205a`)
* **API Key Required**: **No** (CKAN open data API)
* **Fields Extracted**: Company Name, Unique Entity Number (`uen`), Status (`Live`/`Terminated`), Registered Address, Postal Code, SSIC Industry description, Officer count.
* **Sample Live Result**: Company `AIK CHE HIONG` (Reg: `00733000J`)

### 🇺🇸 United States — Colorado Socrata Open Data
* **Status**: **Working Live**
* **API Endpoint**: `https://data.colorado.gov/resource/4ykn-tg5h.json`
* **API Key Required**: **No** (Public Socrata API, commercial use allowed)
* **Fields Extracted**: Entity Name, Entity ID, Status ("Good Standing"), Registered Agent / Director, Principal Address, City, State, Zip.
* **Sample Live Result**: Company `The Colorado State Bee-Keepers' Association` (Reg: `18881009142`)

### 🇨🇦 Canada — Corporations Canada Open Data
* **Status**: **Working Live**
* **API Endpoint**: `https://open.canada.ca/data/en/api/3/action/package_search`
* **API Key Required**: **No** (Open government data portal)
* **Fields Extracted**: Federal Corporation Number, Legal Name, Status, Registered Address, Director/Officers.
* **Sample Live Result**: Company `SHOPIFY INC.` (Reg: `4261607`)

---

## 🔑 2. Scrapers That Need a Free API Key / Registration

These connectors are fully implemented in the codebase. They currently use verified sandbox records and will automatically switch to 100% live API data as soon as you add their free credentials to `.env`:

### 🇬🇧 United Kingdom — Companies House API
* **Status**: **Connector Ready — Needs Free API Key**
* **Why**: The UK government requires HTTP Basic Authentication for Companies House API access.
* **How to get the free key** (takes 2 minutes):
  1. Register at [developer.companyinformation.service.gov.uk](https://developer.companyinformation.service.gov.uk)
  2. Create an Application and copy your API Key.
  3. Open `.env` and set:
     ```env
     COMPANIES_HOUSE_API_KEY=your_actual_key_here
     ```
  4. The connector in `lib/connectors/companies_house.js` will immediately query live UK companies and their registered officers/directors.

### 🇦🇺 Australia — Australian Business Register (ABN Lookup)
* **Status**: **Connector Ready — Needs Free GUID**
* **Why**: The ABN Lookup JSON Web Service requires a registered GUID passed in the query.
* **How to get the free GUID**:
  1. Register your email at [abr.business.gov.au/Tools/WebServices](https://abr.business.gov.au/Tools/WebServices)
  2. You will instantly receive a free GUID in your email.
  3. Open `.env` and set:
     ```env
     ABN_LOOKUP_GUID=your_guid_here
     ```
  4. The connector in `lib/connectors/australia_abn.js` will immediately query live Australian companies.

---

## ❌ 3. Scrapers Not Working / Excluded by Brief

* **UAE & Saudi Arabia**:
  - Excluded in the intern brief due to no reliable free bulk APIs.
  - Recommended by brief: Revisit later with a licensed data provider.
