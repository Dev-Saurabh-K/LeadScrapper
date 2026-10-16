// scripts/test-ui-sorting-filtering.mjs
// Exhaustive test suite for UI Sorting, Filtering, Column Prioritization, and DB Lead Filters

import assert from 'assert';
import { db } from '../lib/database.js';

console.log('================================================================');
console.log('🧪 TESTING UI SORTING & FILTERING ENGINE');
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
// Column Priority Sorting Functions (from components/InvoiceDataExporter.jsx)
// -----------------------------------------------------------------------------
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

const getRecordField = (record, keyword) => {
  const key = Object.keys(record).find((k) => k.toLowerCase().includes(keyword.toLowerCase()));
  return key && record[key] ? String(record[key]).trim() : '';
};

const filterAndSortRecords = (
  records,
  {
    statusFilter = 'active',
    contactPriorityFilter = 'all',
    selectedIndustry = '',
    selectedCity = '',
    searchQuery = ''
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

  // Priority sort: Phone & Email (1st) -> Website (2nd) -> Rest (3rd)
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
// Sample Test Dataset for UI testing
// -----------------------------------------------------------------------------
const sampleUiRecords = [
  {
    id: 1,
    'Company Name': 'Acme Corp',
    'Phone': '+1 (212) 555-0199',
    'Email': 'contact@acme.com',
    'Website': 'https://acme.com',
    'City': 'New York',
    'Industry': 'Technology',
    'Registration Number': 'US-NYC-001',
    __status: 'Active'
  },
  {
    id: 2,
    'Company Name': 'Stark Industries',
    'Phone': '+1 (415) 555-2671',
    'Email': '',
    'Website': 'https://stark.com',
    'City': 'San Francisco',
    'Industry': 'Defense',
    'Registration Number': 'US-CA-002',
    __status: 'Active'
  },
  {
    id: 3,
    'Company Name': 'Wayne Enterprises',
    'Phone': '',
    'Email': 'bruce@wayne.com',
    'Website': 'https://wayne.com',
    'City': 'Gotham',
    'Industry': 'Conglomerate',
    'Registration Number': 'US-NJ-003',
    __status: 'Active'
  },
  {
    id: 4,
    'Company Name': 'Cyberdyne Systems',
    'Phone': '',
    'Email': '',
    'Website': 'https://cyberdyne.ai',
    'City': 'Los Angeles',
    'Industry': 'Technology',
    'Registration Number': 'US-CA-004',
    __status: 'Active'
  },
  {
    id: 5,
    'Company Name': 'Umbrella Corporation',
    'Phone': '',
    'Email': '',
    'Website': '',
    'City': 'Raccoon City',
    'Industry': 'Pharmaceuticals',
    'Registration Number': 'US-RC-005',
    __status: 'Active'
  },
  {
    id: 6,
    'Company Name': 'Initech LLC',
    'Phone': '+1 (512) 555-1234',
    'Email': 'peter@initech.com',
    'Website': 'https://initech.com',
    'City': 'Austin',
    'Industry': 'Technology',
    'Registration Number': 'US-TX-006',
    __status: 'Inactive'
  },
  {
    id: 7,
    'Company Name': 'Oscorp Industries',
    'Phone': '+1 (212) 555-8888',
    'Email': '',
    'Website': '',
    'City': 'New York',
    'Industry': 'Chemicals',
    'Registration Number': 'US-NYC-007',
    __status: 'Inactive'
  }
];

async function runTestSuite() {
  // =============================================================================
  // SECTION 1: COLUMN PRIORITY SORTING
  // =============================================================================
  console.log('📊 SECTION 1: COLUMN PRIORITY SORTING');

  await test('Sort columns places Company Name at rank 0, Phone & Email at rank 1-2', () => {
    const columns = ['City', 'Email', 'Postal Code', 'Company Name', 'Phone', 'Website', 'Industry'];
    const sorted = sortColumnsByPriority(columns);
    assert.strictEqual(sorted[0], 'Company Name');
    assert.strictEqual(sorted[1], 'Phone');
    assert.strictEqual(sorted[2], 'Email');
    assert.strictEqual(sorted[3], 'Website');
  });

  await test('Sort columns handles varied contact field names (Mobile, Web URL, Officers)', () => {
    const columns = ['Registration Number', 'Director Officer', 'Mobile Number', 'Web URL', 'Company'];
    const sorted = sortColumnsByPriority(columns);
    assert.strictEqual(sorted[0], 'Company');
    assert.strictEqual(sorted[1], 'Mobile Number');
    assert.strictEqual(sorted[2], 'Web URL');
    assert.strictEqual(sorted[3], 'Director Officer');
    assert.strictEqual(sorted[4], 'Registration Number');
  });

  await test('Sort columns preserves tie-break alphabetical sorting for non-priority fields', () => {
    const columns = ['Postal Code', 'City', 'Address Line 1', 'Country'];
    const sorted = sortColumnsByPriority(columns);
    assert.deepStrictEqual(sorted, ['Country', 'Address Line 1', 'City', 'Postal Code']);
  });

  // =============================================================================
  // SECTION 2: STATUS FILTERING (Active vs Inactive vs All)
  // =============================================================================
  console.log('\n🔍 SECTION 2: STATUS FILTERING');

  await test('statusFilter: "active" excludes inactive records', () => {
    const res = filterAndSortRecords(sampleUiRecords, { statusFilter: 'active' });
    assert.strictEqual(res.length, 5);
    assert(res.every((r) => r.__status === 'Active'));
    assert(!res.some((r) => r['Company Name'] === 'Initech LLC'));
  });

  await test('statusFilter: "inactive" returns only inactive records', () => {
    const res = filterAndSortRecords(sampleUiRecords, { statusFilter: 'inactive' });
    assert.strictEqual(res.length, 2);
    assert(res.every((r) => r.__status === 'Inactive'));
    const names = res.map((r) => r['Company Name']);
    assert(names.includes('Initech LLC') && names.includes('Oscorp Industries'));
  });

  await test('statusFilter: "all" returns both active and inactive records', () => {
    const res = filterAndSortRecords(sampleUiRecords, { statusFilter: 'all' });
    assert.strictEqual(res.length, 7);
    assert(res.some((r) => r.__status === 'Active'));
    assert(res.some((r) => r.__status === 'Inactive'));
  });

  // =============================================================================
  // SECTION 3: CONTACT PRIORITY FILTERING (p1_both, p1_either, p2_website, all)
  // =============================================================================
  console.log('\n🎯 SECTION 3: CONTACT PRIORITY FILTERING');

  await test('contactPriorityFilter: "p1_both" matches records with BOTH Email and Phone', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'active',
      contactPriorityFilter: 'p1_both'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Acme Corp');
    assert(res[0].Phone && res[0].Email);
  });

  await test('contactPriorityFilter: "p1_either" matches records with EITHER Email OR Phone', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'active',
      contactPriorityFilter: 'p1_either'
    });
    assert.strictEqual(res.length, 3);
    const names = res.map((r) => r['Company Name']);
    assert(names.includes('Acme Corp')); // both
    assert(names.includes('Stark Industries')); // phone only
    assert(names.includes('Wayne Enterprises')); // email only
    assert(!names.includes('Cyberdyne Systems')); // neither
  });

  await test('contactPriorityFilter: "p2_website" matches records with Website', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'active',
      contactPriorityFilter: 'p2_website'
    });
    assert.strictEqual(res.length, 4);
    assert(res.every((r) => r.Website.startsWith('http')));
    assert(!res.some((r) => r['Company Name'] === 'Umbrella Corporation'));
  });

  // =============================================================================
  // SECTION 4: SEARCH QUERY & METADATA FILTERING
  // =============================================================================
  console.log('\n🔎 SECTION 4: SEARCH QUERY & METADATA FILTERING');

  await test('searchQuery matches case-insensitive company name', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'all',
      searchQuery: 'stark'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Stark Industries');
  });

  await test('searchQuery matches registration number', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'all',
      searchQuery: 'US-TX-006'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Initech LLC');
  });

  await test('selectedIndustry filters by exact industry match', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'active',
      selectedIndustry: 'Technology'
    });
    assert.strictEqual(res.length, 2);
    const names = res.map((r) => r['Company Name']);
    assert(names.includes('Acme Corp') && names.includes('Cyberdyne Systems'));
  });

  await test('selectedCity filters by exact city match', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'all',
      selectedCity: 'New York'
    });
    assert.strictEqual(res.length, 2);
    const names = res.map((r) => r['Company Name']);
    assert(names.includes('Acme Corp') && names.includes('Oscorp Industries'));
  });

  await test('Multi-filter combination (status + industry + search) works seamlessly', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'active',
      selectedIndustry: 'Technology',
      searchQuery: 'acme'
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0]['Company Name'], 'Acme Corp');
  });

  await test('Unmatched query returns empty array gracefully', () => {
    const res = filterAndSortRecords(sampleUiRecords, {
      statusFilter: 'all',
      searchQuery: 'NonExistentCorporationXYZ'
    });
    assert.strictEqual(res.length, 0);
  });

  // =============================================================================
  // SECTION 5: ROW PRIORITY SORTING LOGIC
  // =============================================================================
  console.log('\n⚡ SECTION 5: ROW PRIORITY SORTING LOGIC');

  await test('Records are sorted: P1 Both (1st) -> P1 Either (2nd) -> P2 Website (3rd) -> Rest (4th)', () => {
    const res = filterAndSortRecords(sampleUiRecords, { statusFilter: 'active' });
    assert.strictEqual(res[0]['Company Name'], 'Acme Corp');

    const rank2Names = [res[1]['Company Name'], res[2]['Company Name']];
    assert(rank2Names.includes('Stark Industries'));
    assert(rank2Names.includes('Wayne Enterprises'));

    assert.strictEqual(res[3]['Company Name'], 'Cyberdyne Systems');
    assert.strictEqual(res[4]['Company Name'], 'Umbrella Corporation');
  });

  // =============================================================================
  // SECTION 6: LIVE DATABASE / API LAYER FILTERING & SORTING
  // =============================================================================
  console.log('\n🗄️ SECTION 6: DATABASE & API FILTERING');

  const testLeads = [
    {
      company_name: 'Nordic Clean Energy AS',
      country: 'Norway',
      registration_number: 'NO-999001',
      director: 'Lars Hansen',
      email: 'lars@nordicenergy.no',
      phone: '+47 21 00 00 01',
      website: 'https://nordicenergy.no',
      industry: 'Energy'
    },
    {
      company_name: 'Paris BioTech SAS',
      country: 'France',
      registration_number: 'FR-888002',
      director: 'Marie Curie',
      email: 'contact@parisbiotech.fr',
      phone: '',
      website: 'https://parisbiotech.fr',
      industry: 'Biotechnology'
    },
    {
      company_name: 'London Finance Ltd',
      country: 'United Kingdom',
      registration_number: 'UK-777003',
      director: 'Arthur Pendelton',
      email: '',
      phone: '+44 20 7946 0002',
      website: 'https://londonfinance.co.uk',
      industry: 'Finance'
    },
    {
      company_name: 'Singapore Maritime Pte',
      country: 'Singapore',
      registration_number: 'SG-666004',
      director: 'Wei Zhang',
      email: '',
      phone: '',
      website: 'https://sgmaritime.sg',
      industry: 'Shipping'
    },
    {
      company_name: 'Colorado Mining Corp',
      country: 'United States',
      registration_number: 'US-555005',
      director: 'John Denver',
      email: '',
      phone: '',
      website: '',
      industry: 'Mining'
    }
  ];

  for (const lead of testLeads) {
    try {
      await db.insertLead(lead);
    } catch (_) {}
  }

  await test('Database filters leads by country (Norway)', async () => {
    const leads = await db.getAllLeads({ country: 'Norway' });
    assert(leads.length >= 1);
    assert(leads.some((l) => l.company_name === 'Nordic Clean Energy AS'));
    assert(leads.every((l) => l.country.toLowerCase().includes('norway')));
  });

  await test('Database filters leads with hasEmail="true"', async () => {
    const leads = await db.getAllLeads({ hasEmail: 'true' });
    assert(leads.length >= 2);
    assert(leads.every((l) => Boolean(l.email && l.email.trim())));
  });

  await test('Database filters leads with hasPhone="true"', async () => {
    const leads = await db.getAllLeads({ hasPhone: 'true' });
    assert(leads.length >= 2);
    assert(leads.every((l) => Boolean(l.phone && l.phone.trim())));
  });

  await test('Database search filter queries company_name, director, and reg_num', async () => {
    const byCompany = await db.getAllLeads({ search: 'BioTech' });
    assert(byCompany.some((l) => l.company_name === 'Paris BioTech SAS'));

    const byDirector = await db.getAllLeads({ search: 'Arthur Pendelton' });
    assert(byDirector.some((l) => l.company_name === 'London Finance Ltd'));

    const byReg = await db.getAllLeads({ search: 'SG-666004' });
    assert(byReg.some((l) => l.company_name === 'Singapore Maritime Pte'));
  });

  await test('Database result respects priority sorting (Both Phone+Email first)', async () => {
    const all = await db.getAllLeads({ limit: '100' });
    const testSubset = all.filter((l) =>
      testLeads.some((t) => t.registration_number === l.registration_number)
    );
    assert(testSubset.length >= 4);
    const nordicIdx = testSubset.findIndex((l) => l.company_name === 'Nordic Clean Energy AS');
    const maritimeIdx = testSubset.findIndex((l) => l.company_name === 'Singapore Maritime Pte');
    assert(nordicIdx < maritimeIdx, 'Leads with phone+email must rank higher than website-only leads');
  });

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passedTests}/${totalTests} Tests Passed successfully!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
