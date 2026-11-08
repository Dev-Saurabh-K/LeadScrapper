// scripts/test-edge-cases.mjs
// Exhaustive Edge Case Testing Suite for B2B Scrapers & Pipelines

import { linkedInConnector } from '../lib/connectors/linkedin.js';
import { contactValidator } from '../lib/services/validator.js';
import { normalizer } from '../lib/services/normalizer.js';
import { exporter } from '../lib/services/exporter.js';
import { excelParser } from '../lib/services/excel-parser.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`    ✅ [PASS] ${message}`);
    passed++;
    return true;
  } else {
    console.error(`    ❌ [FAIL] ${message}`);
    return false;
  }
}

async function runEdgeCaseTests() {
  const start = Date.now();
  console.log('\n================================================================');
  console.log('🛡️ RUNNING EXHAUSTIVE EDGE CASE VERIFICATION SUITE');
  console.log('================================================================\n');

  // =============================================================
  // SECTION 1: LINKEDIN QUERY BUILDER EDGE CASES
  // =============================================================
  console.log('--- 1. LinkedIn Query Builder Edge Cases ---');

  // 1.1 Empty / Null / Undefined queries
  const nullQuery = linkedInConnector.buildXRayQuery(null);
  assert(nullQuery.includes('site:linkedin.com/in') && nullQuery.includes('Founder'), 'Null options defaults to executive search');

  const emptyObjQuery = linkedInConnector.buildXRayQuery({});
  assert(emptyObjQuery.includes('site:linkedin.com/in') && emptyObjQuery.includes('Founder'), 'Empty object {} defaults safely');

  const whitespaceQuery = linkedInConnector.buildXRayQuery('   ');
  assert(whitespaceQuery.includes('site:linkedin.com/in'), 'Pure whitespace string handled gracefully');

  // 1.2 Non-string input criteria
  const nonStringQuery = linkedInConnector.buildXRayQuery({
    role: 12345,
    industry: null,
    location: undefined,
    company: true
  });
  assert(nonStringQuery.includes('12345') && nonStringQuery.includes('true'), 'Non-string criteria coerced safely without throwing');

  // 1.3 Pre-formatted and raw queries
  const rawWithPrefix = linkedInConnector.buildXRayQuery('site:linkedin.com/in CTO FinTech London');
  assert(!rawWithPrefix.includes('site:linkedin.com/in site:linkedin.com/in'), 'Does not duplicate site:linkedin.com/in');

  console.log();

  // =============================================================
  // SECTION 2: URL NORMALIZATION & REJECTION OF NON-LEADS
  // =============================================================
  console.log('--- 2. URL Normalization & Non-Lead Filter ---');

  // 2.1 Profile URL detection
  assert(linkedInConnector.isProfileUrl('https://www.linkedin.com/in/satyanadella'), 'Valid profile URL accepted');
  assert(linkedInConnector.isProfileUrl('https://uk.linkedin.com/in/john-doe-123'), 'Subdomain profile URL accepted');
  assert(!linkedInConnector.isProfileUrl('https://www.linkedin.com/in/dir/'), 'Directory path (/in/dir/) rejected');
  assert(!linkedInConnector.isProfileUrl('https://www.linkedin.com/in/login'), 'Login path (/in/login) rejected');
  assert(!linkedInConnector.isProfileUrl('https://www.linkedin.com/company/google'), 'Company page rejected');
  assert(!linkedInConnector.isProfileUrl('https://www.linkedin.com/pulse/ai-revolution'), 'Pulse article rejected');
  assert(!linkedInConnector.isProfileUrl('https://www.linkedin.com/jobs/view/12345'), 'Job posting rejected');

  // 2.2 URL normalization
  const normalizedSubdomain = linkedInConnector.normalizeProfileUrl('https://es.linkedin.com/in/maria-garcia/?originalSubdomain=es');
  assert(normalizedSubdomain.startsWith('https://www.linkedin.com/in/maria-garcia'), `Subdomain normalized: ${normalizedSubdomain}`);
  assert(!normalizedSubdomain.includes('?'), 'Tracking query parameters stripped');
  assert(!normalizedSubdomain.endsWith('/'), 'Trailing slash stripped');

  console.log();

  // =============================================================
  // SECTION 3: SNIPPET PARSING & CONTACT DE-OBFUSCATION
  // =============================================================
  console.log('--- 3. Snippet Parsing & De-Obfuscation ---');

  // 3.1 Non-lead search titles rejected
  const loginMeta = linkedInConnector.parseProfileFromSnippet('Sign In | LinkedIn', 'https://www.linkedin.com/in/someone');
  assert(loginMeta === null, 'Search engine "Sign In" meta result rejected');

  const directoryMeta = linkedInConnector.parseProfileFromSnippet('Top 20 Founder Profiles on LinkedIn', 'https://www.linkedin.com/in/dir/top');
  assert(directoryMeta === null, '"Top 20 Profiles" search engine aggregator result rejected');

  // 3.2 Complex title parsing
  const parsedDoctor = linkedInConnector.parseProfileFromSnippet(
    'Dr. Gregory House, M.D. - Head of Diagnostics @ Princeton Plainsboro | LinkedIn',
    'https://www.linkedin.com/in/greg-house-md',
    'Experience: Diagnostic Medicine · Location: Princeton, New Jersey'
  );
  assert(parsedDoctor.director === 'Dr. Gregory House, M.D.', `Doctor with credentials parsed: "${parsedDoctor.director}"`);
  assert(parsedDoctor.company_name === 'Princeton Plainsboro', `Company extracted via @ symbol: "${parsedDoctor.company_name}"`);
  assert(parsedDoctor.registration_number === 'LI:greg-house-md', `Registration handle: "${parsedDoctor.registration_number}"`);

  // 3.3 Title with no dashes (only name | LinkedIn)
  const parsedSingle = linkedInConnector.parseProfileFromSnippet(
    'Alexander Wright | LinkedIn',
    'https://www.linkedin.com/in/alexander-wright',
    'San Francisco Bay Area · Technology Executive'
  );
  assert(parsedSingle.director === 'Alexander Wright', `Title with no dashes parsed: "${parsedSingle.director}"`);

  // 3.4 Missing / corrupt title recovered from URL slug
  const parsedFromSlug = linkedInConnector.parseProfileFromSnippet(
    'LinkedIn',
    'https://www.linkedin.com/in/sarah-connor-98218492',
    'Operations Director at Cyberdyne'
  );
  assert(parsedFromSlug.director === 'Sarah Connor', `Director recovered from slug: "${parsedFromSlug.director}"`);

  // 3.5 Contact de-obfuscation in snippets
  const snippetWithHiddenEmail = 'Contact me at: ceo [at] quantumlead [dot] io or call (415) 555-0199 for inquiries.';
  const parsedContacts = linkedInConnector.parseProfileFromSnippet(
    'Elon Musk - CEO at X | LinkedIn',
    'https://www.linkedin.com/in/elon-musk',
    snippetWithHiddenEmail
  );
  assert(parsedContacts.email === 'ceo@quantumlead.io', `Obfuscated email extracted: "${parsedContacts.email}"`);
  assert(parsedContacts.phone.includes('+1'), `Snippet phone extracted: "${parsedContacts.phone}"`);

  console.log();

  // =============================================================
  // SECTION 4: VALIDATION & NORMALIZATION EDGE CASES
  // =============================================================
  console.log('--- 4. Validator & Normalizer Edge Cases ---');

  // 4.1 Phone validation with number primitive
  const numberPhone = contactValidator.validatePhone(4155552671, 'US');
  assert(numberPhone.isValid && numberPhone.formatted.includes('+1'), `Phone as number primitive: ${numberPhone.formatted}`);

  // 4.2 Phone with extension
  const extPhone = contactValidator.validatePhone('+1 (212) 555-0199 ext 42');
  assert(extPhone.isValid && extPhone.formatted.includes('+1'), `Phone with extension suffix normalized: ${extPhone.formatted}`);

  // 4.3 Email with non-breaking spaces and angle brackets
  const angleEmail = contactValidator.validateEmail('  \u00A0<contact@enterprise.com>\u00A0  ');
  assert(angleEmail.isValid && angleEmail.sanitized === 'contact@enterprise.com', 'Surrounding non-breaking spaces and angle brackets stripped');

  // 4.4 Normalizer with numbers, dates, and nulls
  const rawEdgeLead = {
    company_name: 'Tech Labs LLC',
    registration_number: 99887766, // numeric reg number
    country: 'United States',
    status: 'Active',
    incorporation_date: new Date('2022-05-15'), // Date object
    postal_code: 94107, // numeric postal code
    phone: 4155552671,
    email: 'founder@techlabs.com'
  };
  const cleanEdgeLead = normalizer.normalizeLead(rawEdgeLead);
  assert(cleanEdgeLead.registration_number === '99887766', 'Numeric registration number converted to string');
  assert(cleanEdgeLead.postal_code === '94107', 'Numeric postal code converted to string');
  assert(cleanEdgeLead.incorporation_date === '2022-05-15', 'Date object formatted as ISO string');
  assert(cleanEdgeLead.phone.includes('+1'), 'Phone validated and formatted');

  console.log();

  // =============================================================
  // SECTION 5: EXPORTER SERVICE EDGE CASES
  // =============================================================
  console.log('--- 5. Exporter Edge Cases ---');

  // 5.1 Empty, null, and corrupt arrays in priority sorting
  const emptySort = exporter.sortLeadsByPriority([]);
  assert(Array.isArray(emptySort) && emptySort.length === 0, 'Empty array returns empty array');

  const nullSort = exporter.sortLeadsByPriority(null);
  assert(Array.isArray(nullSort) && nullSort.length === 0, 'Null returns empty array without throwing');

  const corruptArray = [null, undefined, 42, 'string', { company_name: 'Valid Co', email: 'v@co.com' }];
  const cleanedSort = exporter.sortLeadsByPriority(corruptArray);
  assert(cleanedSort.length === 1 && cleanedSort[0].company_name === 'Valid Co', 'Non-object elements safely filtered');

  // 5.2 Numeric phone and email fields in sorting
  const numericFieldsLeads = [
    { company_name: 'Lead 1', phone: 4155552671, email: null },
    { company_name: 'Lead 2', phone: 4155552671, email: 'lead2@test.com' }
  ];
  const sortedNumeric = exporter.sortLeadsByPriority(numericFieldsLeads);
  assert(sortedNumeric[0].company_name === 'Lead 2', 'Numeric phone handled properly in priority sorting');

  // 5.3 Custom Excel export with empty rows
  const emptyBuffer = await exporter.generateCustomExcel({ rows: [], selectedColumns: ['Company Name', 'Phone'] });
  assert(Buffer.isBuffer(emptyBuffer) && emptyBuffer.length > 0, `Empty rows export generated valid buffer (${emptyBuffer.length} bytes)`);

  const parsedEmpty = await excelParser.parseBuffer(emptyBuffer);
  assert(parsedEmpty.totalRecords === 0, 'Parsed empty spreadsheet successfully with 0 records');

  console.log();

  // =============================================================
  // FINAL SUMMARY
  // =============================================================
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log('================================================================');
  console.log(`🎉 EDGE CASE VERIFICATION COMPLETE: ${passed}/${total} Assertions Passed in ${elapsed}s`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runEdgeCaseTests().catch(err => {
  console.error('\n❌ Edge Case Suite Error:', err);
  process.exit(1);
});
