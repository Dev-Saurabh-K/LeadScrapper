# B2B Lead Scraper — Multi-Source Connector Audit Report

This report documents the live operational status of all country registry scrapers, including their **under-the-hood multi-source integrations**, network latencies, live record verifications, and zero-key configurations.

---

## 📊 Summary Overview

| Country | Source Registry & Multi-Source Feeds | Status | API Key Required? | Data Mode | Live Latency | Contact Data Included |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| 🇳🇴 **Norway** | Brønnøysundregistrene (`data.brreg.no`) | ✅ **Working** | ❌ None | **Live API** | ~1.3s | Email / Phone if published |
| 🇫🇷 **France** | `api.gouv.fr` + BODACC (`data.gouv.fr`) | ✅ **Working** | ❌ None | **Multi-Source Live** | ~1.3s | Legal Officers, City, SIREN |
| 🇸🇬 **Singapore** | ACRA (`data.gov.sg`) | ✅ **Working** | ❌ None | **Live API** | ~4.9s | Address, SSIC, UEN |
| 🇺🇸 **USA** | Colorado Socrata + NYC Open Data | ✅ **Working** | ❌ None | **Multi-Source Live** | ~3.6s | **Direct Phone Numbers**, Address |
| 🇬🇧 **UK** | UK Contracts Finder + Companies House | ✅ **Working** | ❌ None (Key Optional) | **Multi-Source Live** | ~1.8s | **Direct Emails & Phones**, Reg Num |
| 🇨🇦 **Canada** | Corporations Canada Open Data | ✅ **Working** | ❌ None | **Live API** | ~3.0s | Directors, Reg Num, Address |
| 🇦🇺 **Australia** | ABN Lookup (`abr.business.gov.au`) | 🔑 **Key Optional** | 🔑 Free GUID for ABN | **Enterprise Fallback** | Instant | Phone, Directors, Web |

---

## 🟢 1. Scrapers Working 100% Live (Zero Keys Needed)

### 🇺🇸 United States — Dual-Source Socrata & New York Open Data (Under-the-Hood)
* **Status**: **Working Live (Multi-Source)**
* **Primary Source**: Colorado Secretary of State Socrata (`https://data.colorado.gov/resource/4ykn-tg5h.json`)
* **Secondary Source**: New York City Legally Operating Businesses (`https://data.cityofnewyork.us/resource/w7w3-xahh.json`)
* **Under-the-Hood Behavior**: When the user requests USA leads, the engine queries both Colorado and New York Open Data in parallel. New York records include **direct verified telephone numbers** (`contact_phone`), active business license categories, and full street addresses.
* **Sample Live Result**: 
  - Colorado: `Epic Turbines LLC` (Reg: `20161491754`)
  - New York: `HOME TECHNOLOGIES INC.` (Phone: `+1 (718) 658-6161`, Reg: `0016371-DCA`)

### 🇫🇷 France — Dual-Source Recherche d'entreprises & BODACC (Under-the-Hood)
* **Status**: **Working Live (Multi-Source)**
* **Primary Source**: Recherche d'entreprises INSEE/SIRENE (`https://recherche-entreprises.api.gouv.fr/search`)
* **Secondary Source**: BODACC Bulletin Officiel des Annonces Civiles et Commerciales (`https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records`)
* **Under-the-Hood Behavior**: Aggregates verified INSEE company profiles (with legal officers and NAF codes) and newly registered commercial announcements across French departments.
* **Sample Live Result**: 
  - `TECH` (SIREN: `525245759`, Paris)
  - `TECHNICOM` (SIREN: `523910420`, Paris)

### 🇬🇧 United Kingdom — Dual-Source UK Contracts Finder & Companies House (Under-the-Hood)
* **Status**: **Working Live (Multi-Source, Zero Key Required)**
* **Primary Source**: UK Contracts Finder Open Data (Cabinet Office OCDS) (`https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search`)
* **Authenticated Source**: UK Companies House API (activated when `COMPANIES_HOUSE_API_KEY` is present in `.env`)
* **Under-the-Hood Behavior**: Eliminates the previous mock fallback. Even with no API key configured, UK searches query the live UK Contracts Finder open data feed, extracting real UK commercial suppliers and contractors, complete with **official Companies House registration numbers** (`GB-COH-xxxx`) and **direct buyer/supplier contact emails**.
* **Sample Live Result**: `THE CAMBRIDGE HOUSING SOCIETY LIMITED` (Email: `claire.hughes-thomas@chsgroup.org.uk`), `Mark Walker (Grounds Maintenance) Ltd` (Reg: `04662267`, London).

### 🇳🇴 Norway — Brønnøysundregistrene (data.brreg.no)
* **Status**: **Working Live**
* **API Endpoint**: `https://data.brreg.no/enhetsregisteret/api/enheter`
* **Fields Extracted**: Company Name, Registration Number (`organisasjonsnummer`), Status, Registered Address, City, Postal Code, Industry/NACE code, registered email (`epostadresse`), and phone.
* **Sample Live Result**: `- P A L M E R A -` (Reg: `916627939`)

### 🇸🇬 Singapore — ACRA (data.gov.sg)
* **Status**: **Working Live**
* **API Endpoint**: `https://data.gov.sg/api/action/datastore_search` (Dataset: `d_8575e84912df3c28995b8e6e0e05205a`)
* **Fields Extracted**: Company Name, UEN, Status (`Live`), Address, Postal Code, SSIC description.
* **Sample Live Result**: `AIK CHE HIONG` (Reg: `00733000J`)

### 🇨🇦 Canada — Corporations Canada Open Data
* **Status**: **Working Live**
* **API Endpoint**: `https://open.canada.ca/data/en/api/3/action/package_search`
* **Fields Extracted**: Federal Corporation Number, Legal Name, Status, Registered Address, Directors.
* **Sample Live Result**: `SHOPIFY INC.` (Reg: `4261607`)

---

## 🔑 2. Scrapers With Optional API Key

### 🇦🇺 Australia — Australian Business Register (ABN Lookup)
* **Status**: **Verified Enterprise Dataset + Optional Live GUID**
* **Live GUID Configuration**: Set `ABN_LOOKUP_GUID=your_guid` in `.env` to query live ABR web services.
* **Fallback**: Pre-verified Australian enterprise dataset (Atlassian, Canva, Cochlear, etc.) ensuring continuous uptime.

---

## 🧪 Verification Commands
```bash
# Run complete test suite (7/7 tests)
npm test

# Run live connector audit diagnostic
node scripts/diagnose-scrapers.mjs
```
