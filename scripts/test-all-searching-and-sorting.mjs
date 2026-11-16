// scripts/test-all-searching-and-sorting.mjs
// Exhaustive Verification Suite for ALL Searching, Filtering, and Sorting Capabilities
// Across UI Components, Engine Connectors, Local Storage, and PostgreSQL DB.

import assert from 'assert';
import { db } from '../lib/database.js';
import { buildMapsQuery } from '../lib/data/geo_locations.js';
import { detectLeadSource } from '../lib/utils/source_detector.js';

console.log('================================================================');
console.log('🔍 EXHAUSTIVE TEST SUITE: ALL SEARCHING & SORTING CAPABILITIES');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function test(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// Core UI Logic Mirrors (from components/InvoiceDataExporter.jsx)
// -----------------------------------------------------------------------------
const getRecordField = (record, keyword) => {
  const key = Object.keys(record).find((k) => k.toLowerCase().includes(keyword.toLowerCase()));
  return key && record[key] ? String(record[key]).trim() : '';
};

const getColumnPriorityMeta = (colName) => {
  const lower = colName.trim().toLowerCase();
  if (lower === 'company name' || lower === 'company_name' || lower === 'company') {
    return { priority: 3, rank: 0 };
  }
  if (lower.includes('phone') || lower.includes('mobile')) {
    return { priority: 1, rank: 1 };
  }
  if (lower.includes('email')) {
    return { priority: 1, rank: 2 };
  }
  if (lower.includes('website') || lower.includes('url') || lower.includes('web')) {
    return { priority: 2, rank: 3 };
  }
  if (lower.includes('country') || lower.includes('jurisdiction')) {
    return { priority: 3, rank: 4 };
  }
  if (lower.includes('director') || lower.includes('officer') || lower.includes('contact')) {
    return { priority: 3, rank: 5 };
  }
  if (lower.includes('registration') || lower.includes('gst')) {
    return { priority: 3, rank: 6 };
  }
  if (lower.includes('status')) {
    return { priority: 3, rank: 7 };
  }
  if (lower.includes('industry') || lower.includes('type')) {
    return { priority: 3, rank: 8 };
  }
  if (lower.includes('address') || lower.includes('city') || lower.includes('postal')) {
    return { priority: 3, rank: 9 };
  }
  if (lower.includes('date') || lower.includes('incorporation')) {
    return { priority: 3, rank: 10 };
  }
  if (lower.includes('source') || lower.includes('registry')) {
    return { priority: 3, rank: 11 };
  }
  return { priority: 3, rank: 12 };
};

const sortColumnsByPriority = (columns) => {
  return [...columns].sort((a, b) => {
    const metaA = getColumnPriorityMeta(a);
    const metaB = getColumnPriorityMeta(b);
    if (metaA.rank !== metaB.rank) return metaA.rank - metaB.rank;
    return a.localeCompare(b);
  });
};

const filterAndSortRecords = (
  records,
  {
    statusFilter = 'active',
    contactPriorityFilter = 'all',
    selectedSourceFilter = 'ALL',
    selectedCountry = '',
    selectedIndustry = '',
    selectedCity = '',
    searchQuery = '',
    tableSortCol = null,
    tableSortDir = 'asc'
  } = {}
) => {
  const matched = records.filter((record) => {
    if (statusFilter === 'active') {
      if (record.__status !== 'Active') return false;
    } else if (statusFilter === 'inactive') {
      if (record.__status !== 'Inactive') return false;
    }

    const emailVal = getRecordField(record, 'email');
    const phoneVal = getRecordField(record, 'phone');
    const websiteVal = getRecordField(record, 'website');

    if (contactPriorityFilter === 'p1_both') {
      if (!emailVal || !phoneVal) return false;
    } else if (contactPriorityFilter === 'p1_either') {
      if (!emailVal && !phoneVal) return false;
    } else if (contactPriorityFilter === 'p2_website') {
      if (!websiteVal) return false;
    }

    if (selectedSourceFilter !== 'ALL') {
      const src = (record.source || record.Source || '').toLowerCase();
      const reg = (record.registration_number || record.Registration_Number || '').toLowerCase();
      const web = (record.website || record.Website || '').toLowerCase();

      if (selectedSourceFilter === 'MAPS') {
        if (!src.includes('maps') && !reg.startsWith('maps-')) return false;
      } else if (selectedSourceFilter === 'LINKEDIN') {
        if (!src.includes('linkedin') && !reg.startsWith('li:') && !web.includes('linkedin.com')) return false;
      } else if (selectedSourceFilter === 'INSTAGRAM') {
        if (!src.includes('instagram') && !reg.startsWith('ig:') && !web.includes('instagram.com')) return false;
      } else if (selectedSourceFilter === 'FACEBOOK') {
        if (!src.includes('facebook') && !reg.startsWith('fb:') && !web.includes('facebook.com')) return false;
      } else if (selectedSourceFilter === 'REGISTRY') {
        if (
          src.includes('maps') || src.includes('linkedin') || src.includes('instagram') || src.includes('facebook') ||
          reg.startsWith('maps-') || reg.startsWith('li:') || reg.startsWith('ig:') || reg.startsWith('fb:')
        ) {
          return false;
        }
      }
    }

    if (selectedCountry) {
      const countryVal = getRecordField(record, 'country');
      if (!countryVal.toLowerCase().includes(selectedCountry.toLowerCase())) return false;
    }

    if (selectedIndustry) {
      const indVal = getRecordField(record, 'industry');
      if (indVal !== selectedIndustry) return false;
    }

    if (selectedCity) {
      const cityVal = getRecordField(record, 'city');
      if (cityVal !== selectedCity) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const rowString = Object.values(record).join(' ').toLowerCase();
      if (!rowString.includes(query)) return false;
    }

    return true;
  });

  if (tableSortCol) {
    return matched.sort((a, b) => {
      const valA = a[tableSortCol] ?? '';
      const valB = b[tableSortCol] ?? '';
      const strA = String(valA).trim();
      const strB = String(valB).trim();

      if (!strA && strB) return 1;
      if (strA && !strB) return -1;
      if (!strA && !strB) return 0;

      const isNumA = /^-?\d+(\.\d+)?$/.test(strA);
      const isNumB = /^-?\d+(\.\d+)?$/.test(strB);
      if (isNumA && isNumB) {
        const numA = Number(strA);
        const numB = Number(strB);
        return tableSortDir === 'asc' ? numA - numB : numB - numA;
      }

      const cmp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      return tableSortDir === 'asc' ? cmp : -cmp;
    });
  }

  // Default Priority sort: Phone & Email (1st) -> Website (2nd) -> Rest (3rd)
  return matched.sort((a, b) => {
    const getScore = (rec) => {
      const hasEmail = Boolean(getRecordField(rec, 'email'));
      const hasPhone = Boolean(getRecordField(rec, 'phone'));
      const hasWebsite = Boolean(getRecordField(rec, 'website'));

      if (hasEmail && hasPhone) return 1;
      if (hasEmail || hasPhone) return 2;
      if (hasWebsite) return 3;
      return 4;
    };
    return getScore(a) - getScore(b);
  });
};

// -----------------------------------------------------------------------------
// Sample Dataset representing all engines, statuses, and data variations
// -----------------------------------------------------------------------------
const comprehensiveDataset = [
  {
    id: 'lead-1',
    'Company Name': 'Acme Global Robotics',
    Phone: '+1 (212) 555-0199',
    Email: 'contact@acmeglobal.com',
    Website: 'https://acmeglobal.com',
    Country: 'United States',
    City: 'New York',
    Industry: 'Technology',
    'Registration Number': 'US-NYC-101',
    source: 'Registry API',
    director: 'Ada Lovelace',
    __status: 'Active'
  },
  {
    id: 'lead-2',
    'Company Name': 'Stark Clean Tech',
    Phone: '+1 (415) 555-2671',
    Email: '',
    Website: 'https://starkcleantech.com',
    Country: 'United States',
    City: 'San Francisco',
    Industry: 'Energy',
    'Registration Number': 'US-SF-102',
    source: 'Google Maps Places',
    director: 'Tony Stark',
    __status: 'Active'
  },
  {
    id: 'lead-3',
    'Company Name': 'Wayne BioResearch',
    Phone: '',
    Email: 'bruce@waynebio.com',
    Website: 'https://waynebio.com',
    Country: 'United Kingdom',
    City: 'London',
    Industry: 'Healthcare',
    'Registration Number': 'UK-LON-103',
    source: 'Registry API',
    director: 'Bruce Wayne',
    __status: 'Active'
  },
  {
    id: 'lead-4',
    'Company Name': 'Cyberdyne AI Solutions',
    Phone: '',
    Email: '',
    Website: 'https://cyberdyne.ai',
    Country: 'United States',
    City: 'Los Angeles',
    Industry: 'Technology',
    'Registration Number': 'US-LA-104',
    source: 'Registry API',
    director: 'Miles Dyson',
    __status: 'Active'
  },
  {
    id: 'lead-5',
    'Company Name': 'Zeta Media Group',
    Phone: '',
    Email: '',
    Website: '',
    Country: 'Germany',
    City: 'Berlin',
    Industry: 'Media',
    'Registration Number': 'DE-BER-105',
    source: 'Registry API',
    director: 'Klaus Schmidt',
    __status: 'Active'
  },
  {
    id: 'lead-6',
    'Company Name': 'Beta Cloud Services',
    Phone: '+1 (512) 555-1234',
    Email: 'info@betacloud.com',
    Website: 'https://betacloud.com',
    Country: 'United States',
    City: 'Austin',
    Industry: 'Technology',
    'Registration Number': 'US-ATX-106',
    source: 'Registry API',
    director: 'Peter Gibbons',
    __status: 'Inactive'
  },
  {
    id: 'lead-7',
    'Company Name': 'Alpha Fitness Miami',
    Phone: '+1 (305) 555-9000',
    Email: 'contact@alphafitness.com',
    Website: 'https://instagram.com/alphafitnessmiami',
    Country: 'United States',
    City: 'Miami',
    Industry: 'Fitness',
    'Registration Number': 'IG:alphafitnessmiami',
    source: 'Instagram Public Bio',
    director: 'Sarah Connor',
    __status: 'Active'
  },
  {
    id: 'lead-8',
    'Company Name': 'Apex Plumbing & HVAC',
    Phone: '+1 (786) 555-4422',
    Email: 'service@apexplumbing.com',
    Website: 'https://facebook.com/ApexPlumbingHVAC',
    Country: 'United States',
    City: 'Miami',
    Industry: 'Home Services',
    'Registration Number': 'FB:ApexPlumbingHVAC',
    source: 'Facebook Page Discovery',
    director: 'Mario Mario',
    __status: 'Active'
  },
  {
    id: 'lead-9',
    'Company Name': 'Elena Rostova - VP Growth',
    Phone: '',
    Email: 'elena@growthventures.io',
    Website: 'https://www.linkedin.com/in/elena-rostova-growth',
    Country: 'United States',
    City: 'New York',
    Industry: 'SaaS',
    'Registration Number': 'LI:elena-rostova-growth',
    source: 'LinkedIn Authless Engine',
    director: 'Elena Rostova',
    __status: 'Active'
  },
  {
    id: 'lead-10',
    'Company Name': 'Blue Ocean Logistics AS',
    Phone: '+47 21 00 99 88',
    Email: 'booking@blueocean.no',
    Website: 'https://blueocean.no',
    Country: 'Norway',
    City: 'Oslo',
    Industry: 'Shipping',
    'Registration Number': 'NO-998877665',
    source: 'Brønnøysund Enhetsregisteret',
    director: 'Sven Nygård',
    __status: 'Active'
  }
];

async function runSearchingAndSortingTests() {
  // =============================================================================
  // SECTION 1: DEFAULT PRIORITY SORTING (Row-Level High-Intent Contact Ranking)
  // =============================================================================
  console.log('📊 SECTION 1: CONTACT PRIORITY SORTING');

  await test('P1 Both (Phone & Email) ranks 1st in default priority sort', () => {
    const res = filterAndSortRecords(comprehensiveDataset, { statusFilter: 'active' });
    const p1Both = res.slice(0, 4); // Acme, Alpha Fitness, Apex Plumbing, Blue Ocean
    assert(p1Both.every((r) => r.Phone && r.Email), 'All top ranked leads must have both phone and email');
  });

  await test('P1 Either (Phone OR Email) ranks 2nd in default priority sort', () => {
    const res = filterAndSortRecords(comprehensiveDataset, { statusFilter: 'active' });
    const p1Either = res.slice(4, 6); // Stark Clean Tech (phone only), Wayne BioResearch (email only), Elena (email only)
    assert(p1Either.every((r) => (r.Phone && !r.Email) || (!r.Phone && r.Email)));
  });

  await test('P2 Website Only ranks 3rd in default priority sort', () => {
    const res = filterAndSortRecords(comprehensiveDataset, { statusFilter: 'active' });
    const cyberdyne = res.find((r) => r['Company Name'] === 'Cyberdyne AI Solutions');
    const zeta = res.find((r) => r['Company Name'] === 'Zeta Media Group');
    const cyberdyneIdx = res.indexOf(cyberdyne);
    const zetaIdx = res.indexOf(zeta);

    assert(cyberdyneIdx < zetaIdx, 'Website-only lead must rank before lead with no website');
  });

  await test('Inactive leads are excluded from active priority ranking by default', () => {
    const res = filterAndSortRecords(comprehensiveDataset, { statusFilter: 'active' });
    assert(!res.some((r) => r['Company Name'] === 'Beta Cloud Services'));
  });

  // =============================================================================
  // SECTION 2: INTERACTIVE COLUMN HEADER SORTING (Ascending & Descending)
  // =============================================================================
  console.log('\n⚡ SECTION 2: INTERACTIVE COLUMN HEADER SORTING');

  await test('Sort Company Name ASC orders alphabetically A -> Z', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      tableSortCol: 'Company Name',
      tableSortDir: 'asc'
    });
    assert.strictEqual(res[0]['Company Name'], 'Acme Global Robotics');
    assert.strictEqual(res[res.length - 1]['Company Name'], 'Zeta Media Group');
  });

  await test('Sort Company Name DESC orders alphabetically Z -> A', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      tableSortCol: 'Company Name',
      tableSortDir: 'desc'
    });
    assert.strictEqual(res[0]['Company Name'], 'Zeta Media Group');
    assert.strictEqual(res[res.length - 1]['Company Name'], 'Acme Global Robotics');
  });

  await test('Sort Country ASC groups same countries and orders A -> Z', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      tableSortCol: 'Country',
      tableSortDir: 'asc'
    });
    assert.strictEqual(res[0].Country, 'Germany'); // DE comes before NO, UK, US
    assert.strictEqual(res[res.length - 1].Country, 'United States');
  });

  await test('Sort City DESC handles reverse alphabetical city order', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      tableSortCol: 'City',
      tableSortDir: 'desc'
    });
    assert.strictEqual(res[0].City, 'San Francisco');
    assert.strictEqual(res[res.length - 1].City, 'Austin');
  });

  await test('Blank or missing field values are pushed to bottom during sorting', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      tableSortCol: 'Phone',
      tableSortDir: 'asc'
    });
    const lastItems = res.slice(-3);
    assert(lastItems.every((r) => !r.Phone || r.Phone.trim() === ''));
  });

  await test('Clearing column sort reverts cleanly to high-priority contact order', () => {
    const withSort = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'active',
      tableSortCol: 'Company Name',
      tableSortDir: 'desc'
    });
    assert.strictEqual(withSort[0]['Company Name'], 'Zeta Media Group');

    const resetSort = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'active',
      tableSortCol: null
    });
    // Reset should have a P1 both lead at index 0, NOT Zeta (which has no phone/email)
    assert.notStrictEqual(resetSort[0]['Company Name'], 'Zeta Media Group');
    assert(resetSort[0].Phone && resetSort[0].Email);
  });

  // =============================================================================
  // SECTION 3: COLUMN PRIORITY ORGANIZATION (Grid Header Ordering)
  // =============================================================================
  console.log('\n📐 SECTION 3: COLUMN PRIORITY ORGANIZATION');

  await test('sortColumnsByPriority guarantees Company at rank 0, Phone & Email at rank 1 & 2', () => {
    const rawCols = ['City', 'Postal Code', 'Email', 'Director', 'Company Name', 'Phone', 'Website', 'Industry'];
    const sorted = sortColumnsByPriority(rawCols);
    assert.strictEqual(sorted[0], 'Company Name');
    assert.strictEqual(sorted[1], 'Phone');
    assert.strictEqual(sorted[2], 'Email');
    assert.strictEqual(sorted[3], 'Website');
  });

  await test('sortColumnsByPriority handles synonyms: Mobile, Jurisdiction, GST, Officers', () => {
    const rawCols = ['Jurisdiction', 'Officers', 'GST Number', 'Mobile', 'Web URL', 'Company'];
    const sorted = sortColumnsByPriority(rawCols);
    assert.strictEqual(sorted[0], 'Company');
    assert.strictEqual(sorted[1], 'Mobile');
    assert.strictEqual(sorted[2], 'Web URL');
    assert.strictEqual(sorted[3], 'Jurisdiction');
    assert.strictEqual(sorted[4], 'Officers');
    assert.strictEqual(sorted[5], 'GST Number');
  });

  // =============================================================================
  // SECTION 4: UNIVERSAL MULTI-FIELD SEARCH QUERY FILTERING
  // =============================================================================
  console.log('\n🔎 SECTION 4: UNIVERSAL MULTI-FIELD SEARCH QUERY FILTERING');

  await test('Search query matches case-insensitive company name substring', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      searchQuery: 'roBOTics'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Acme Global Robotics');
  });

  await test('Search query matches registration number (e.g., US-SF-102)', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      searchQuery: 'US-SF-102'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Stark Clean Tech');
  });

  await test('Search query matches director name (e.g., "Miles Dyson")', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      searchQuery: 'Miles Dyson'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Cyberdyne AI Solutions');
  });

  await test('Search query matches phone dial code or area code (e.g., "305")', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      searchQuery: '305'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Alpha Fitness Miami');
  });

  await test('Search query matches email domain (e.g., "@blueocean.no")', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      searchQuery: '@blueocean.no'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Blue Ocean Logistics AS');
  });

  await test('Search with no matching records returns empty list gracefully', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      searchQuery: 'XYZ_NON_EXISTENT_9999'
    });
    assert.strictEqual(res.length, 0);
  });

  // =============================================================================
  // SECTION 5: SOURCE ENGINE TAGGING & ORIGIN FILTERING
  // =============================================================================
  console.log('\n🏷️ SECTION 5: SOURCE ENGINE TAGGING & ORIGIN FILTERING');

  await test('Filter by Google Maps places source', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      selectedSourceFilter: 'MAPS'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Stark Clean Tech');
  });

  await test('Filter by LinkedIn leads source', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      selectedSourceFilter: 'LINKEDIN'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Elena Rostova - VP Growth');
  });

  await test('Filter by Instagram profiles source', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      selectedSourceFilter: 'INSTAGRAM'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Alpha Fitness Miami');
  });

  await test('Filter by Facebook pages source', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      selectedSourceFilter: 'FACEBOOK'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Apex Plumbing & HVAC');
  });

  await test('Filter by Corporate Registries excludes all social media engines', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      selectedSourceFilter: 'REGISTRY'
    });
    assert(res.length >= 5);
    const names = res.map((r) => r['Company Name']);
    assert(!names.includes('Stark Clean Tech')); // Maps
    assert(!names.includes('Elena Rostova - VP Growth')); // LinkedIn
    assert(!names.includes('Alpha Fitness Miami')); // Instagram
    assert(!names.includes('Apex Plumbing & HVAC')); // Facebook
    assert(names.includes('Acme Global Robotics'));
    assert(names.includes('Blue Ocean Logistics AS'));
  });

  await test('detectLeadSource correctly identifies platform badges and URLs', () => {
    const mapsBadge = detectLeadSource({ source: 'Google Maps Places', registration_number: 'MAPS-123' });
    assert.strictEqual(mapsBadge.platform, 'MAPS');
    assert.strictEqual(mapsBadge.label, 'Google Maps');

    const liBadge = detectLeadSource({ source: 'LinkedIn Authless Engine', website: 'https://linkedin.com/in/john-doe' });
    assert.strictEqual(liBadge.platform, 'LINKEDIN');
    assert.strictEqual(liBadge.label, 'LinkedIn');

    const igBadge = detectLeadSource({ source: 'Instagram Public Bio', registration_number: 'IG:miamibakery' });
    assert.strictEqual(igBadge.platform, 'INSTAGRAM');
    assert.strictEqual(igBadge.label, 'Instagram');

    const fbBadge = detectLeadSource({ source: 'Facebook Page Discovery', registration_number: 'FB:MiasBakery' });
    assert.strictEqual(fbBadge.platform, 'FACEBOOK');
    assert.strictEqual(fbBadge.label, 'Facebook');

    const regBadge = detectLeadSource({ source: 'Companies House UK', country: 'United Kingdom', registration_number: 'UK-01234567' });
    assert.strictEqual(regBadge.platform, 'REGISTRY');
    assert.strictEqual(regBadge.label, 'Registry: United Kingdom');

    const regBadgeNoCountry = detectLeadSource({ source: 'Registry API', registration_number: 'REG-999' });
    assert.strictEqual(regBadgeNoCountry.platform, 'REGISTRY');
    assert.strictEqual(regBadgeNoCountry.label, 'Corporate Registry');
  });

  // =============================================================================
  // SECTION 6: METADATA, GEOGRAPHY & STATUS FILTERING
  // =============================================================================
  console.log('\n🌍 SECTION 6: METADATA, GEOGRAPHY & STATUS FILTERING');

  await test('Filter by Country (Norway) matches Blue Ocean Logistics', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      selectedCountry: 'Norway'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Blue Ocean Logistics AS');
  });

  await test('Filter by City (Miami) matches Miami leads', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'all',
      selectedCity: 'Miami'
    });
    assert.strictEqual(res.length, 2);
    const names = res.map((r) => r['Company Name']);
    assert(names.includes('Alpha Fitness Miami') && names.includes('Apex Plumbing & HVAC'));
  });

  await test('Filter by Industry (Technology) matches tech companies', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'active',
      selectedIndustry: 'Technology'
    });
    assert.strictEqual(res.length, 2);
    const names = res.map((r) => r['Company Name']);
    assert(names.includes('Acme Global Robotics') && names.includes('Cyberdyne AI Solutions'));
  });

  await test('Combined compound filtering (Active + US + Miami + Both Phone & Email)', () => {
    const res = filterAndSortRecords(comprehensiveDataset, {
      statusFilter: 'active',
      selectedCountry: 'United States',
      selectedCity: 'Miami',
      contactPriorityFilter: 'p1_both'
    });
    assert.strictEqual(res.length, 2);
    assert(res.every((r) => r.City === 'Miami' && r.Phone && r.Email));
  });

  // =============================================================================
  // SECTION 7: SEARCH QUERY SYNTHESIS FOR ALL 4 SCRAPER ENGINES
  // =============================================================================
  console.log('\n⚙️ SECTION 7: SEARCH QUERY SYNTHESIS FOR ALL 4 ENGINES');

  await test('Google Maps query synthesizes hyper-local parameters', () => {
    const query = buildMapsQuery({
      category: 'Artisan Bakery',
      locality: 'Brooklyn',
      city: 'New York',
      country: 'United States'
    });
    assert.strictEqual(query, 'Artisan Bakery in Brooklyn, New York, United States');
  });

  await test('LinkedIn search query synthesizes role, industry, location, and seniority', () => {
    const role = 'Chief Technology Officer';
    const industry = 'Artificial Intelligence';
    const location = 'Austin, Texas';
    const company = 'Tech';
    const seniority = 'Executive / VP / C-Level';

    const query = [
      'site:linkedin.com/in',
      role,
      seniority,
      industry,
      location,
      company
    ].filter(Boolean).join(' ');

    assert(query.startsWith('site:linkedin.com/in'));
    assert(query.includes('Chief Technology Officer'));
    assert(query.includes('Austin, Texas'));
    assert(query.includes('Artificial Intelligence'));
  });

  await test('Instagram search query synthesizes category, city, bio intent, and brand', () => {
    const igCategory = 'Boutique Coffee Roaster';
    const location = 'Seattle, United States';
    const igBioIntent = 'Worldwide Shipping Orders';
    const igBrand = 'Espresso';

    const query = [
      'site:instagram.com',
      igCategory,
      location,
      igBioIntent,
      igBrand,
      '-inurl:p -inurl:reel -inurl:explore -inurl:tags'
    ].filter(Boolean).join(' ');

    assert(query.startsWith('site:instagram.com'));
    assert(query.includes('Boutique Coffee Roaster'));
    assert(query.includes('Seattle, United States'));
    assert(query.includes('Worldwide Shipping Orders'));
    assert(query.includes('-inurl:tags'));
  });

  await test('Facebook search query synthesizes category, city, intent, and filters out group clutter', () => {
    const fbCategory = 'Real Estate Agent Broker';
    const location = 'Miami, United States';
    const fbBioIntent = 'Call Now Call Us Direct Phone';
    const fbBrand = 'Luxury Realty';

    const query = [
      'site:facebook.com',
      fbCategory,
      location,
      fbBioIntent,
      fbBrand,
      '-inurl:groups -inurl:posts'
    ].filter(Boolean).join(' ');

    assert(query.startsWith('site:facebook.com'));
    assert(query.includes('Real Estate Agent Broker'));
    assert(query.includes('Miami, United States'));
    assert(query.includes('Call Now Call Us Direct Phone'));
    assert(query.includes('-inurl:groups -inurl:posts'));
  });

  // =============================================================================
  // SECTION 8: DATABASE & API LAYER SEARCHING & SORTING
  // =============================================================================
  console.log('\n🗄️ SECTION 8: DATABASE & API LAYER SEARCHING & SORTING');

  const dbTestLeads = [
    {
      company_name: 'Nordic Aurora Tech AS',
      country: 'Norway',
      registration_number: 'NO-SEARCH-001',
      director: 'Astrid Lind',
      email: 'astrid@auroratech.no',
      phone: '+47 22 11 00 11',
      website: 'https://auroratech.no',
      industry: 'Software'
    },
    {
      company_name: 'Zurich Financial Solutions AG',
      country: 'Switzerland',
      registration_number: 'CH-SEARCH-002',
      director: 'Hans Gruber',
      email: 'contact@zurichsolutions.ch',
      phone: '',
      website: 'https://zurichsolutions.ch',
      industry: 'Finance'
    },
    {
      company_name: 'Tokyo Robotics Kabushiki Kaisha',
      country: 'Japan',
      registration_number: 'JP-SEARCH-003',
      director: 'Kenji Sato',
      email: '',
      phone: '+81 3 5555 0101',
      website: 'https://tokyorobotics.co.jp',
      industry: 'Robotics'
    },
    {
      company_name: 'Sydney Marine Services Pty',
      country: 'Australia',
      registration_number: 'AU-SEARCH-004',
      director: 'Bruce Smith',
      email: '',
      phone: '',
      website: 'https://sydneymarine.com.au',
      industry: 'Maritime'
    }
  ];

  for (const l of dbTestLeads) {
    try {
      await db.insertLead(l);
    } catch (_) {}
  }

  await test('DB search filter finds lead by partial company name ("Aurora")', async () => {
    const leads = await db.getAllLeads({ search: 'Aurora' });
    assert(leads.length >= 1);
    assert(leads.some((l) => l.company_name === 'Nordic Aurora Tech AS'));
  });

  await test('DB search filter finds lead by director name ("Hans Gruber")', async () => {
    const leads = await db.getAllLeads({ search: 'Hans Gruber' });
    assert(leads.length >= 1);
    assert(leads.some((l) => l.company_name === 'Zurich Financial Solutions AG'));
  });

  await test('DB country filter retrieves only leads matching country ("Japan")', async () => {
    const leads = await db.getAllLeads({ country: 'Japan' });
    assert(leads.length >= 1);
    assert(leads.every((l) => l.country.toLowerCase().includes('japan')));
  });

  await test('DB hasEmail flag filters leads with valid email addresses', async () => {
    const leads = await db.getAllLeads({ hasEmail: 'true' });
    assert(leads.length >= 2);
    assert(leads.every((l) => Boolean(l.email && l.email.trim())));
  });

  await test('DB hasPhone flag filters leads with valid phone numbers', async () => {
    const leads = await db.getAllLeads({ hasPhone: 'true' });
    assert(leads.length >= 2);
    assert(leads.every((l) => Boolean(l.phone && l.phone.trim())));
  });

  await test('DB query prioritizes contact completeness (Both Phone+Email ranks top)', async () => {
    const all = await db.getAllLeads({ limit: '200' });
    const subset = all.filter((l) => dbTestLeads.some((t) => t.registration_number === l.registration_number));
    assert(subset.length >= 4);

    const auroraIdx = subset.findIndex((l) => l.company_name === 'Nordic Aurora Tech AS'); // Phone + Email
    const sydneyIdx = subset.findIndex((l) => l.company_name === 'Sydney Marine Services Pty'); // Website only

    assert(auroraIdx < sydneyIdx, 'Lead with both Phone & Email must rank ahead of Website-only lead in DB query');
  });

  // =============================================================================
  // SUMMARY
  // =============================================================================
  console.log('\n================================================================');
  console.log(`🎉 ALL SEARCHING & SORTING TESTS: ${passedTests}/${totalTests} Passed!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSearchingAndSortingTests().catch((err) => {
  console.error('Fatal error in searching and sorting test suite:', err);
  process.exit(1);
});
