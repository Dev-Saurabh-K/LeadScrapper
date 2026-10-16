// scripts/test-validations.mjs
// Comprehensive test suite for ContactValidator (Email & Phone validation)

import { contactValidator } from '../lib/services/validator.js';
import { normalizer } from '../lib/services/normalizer.js';

console.log('================================================================');
console.log('🛡️ EXHAUSTIVE CONTACT VALIDATION TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
  }
}

// -----------------------------------------------------------------------------
// 1. EMAIL VALIDATION: VALID CASES
// -----------------------------------------------------------------------------
console.log('📧 SECTION 1: VALID EMAIL TESTS');
const validEmailCases = [
  { email: 'sales@stripe.com', desc: 'Standard business email' },
  { email: 'john.doe@apple.com', desc: 'Email with dot in local-part' },
  { email: 'deals+inbound@startup.io', desc: 'Email with sub-addressing / plus sign' },
  { email: 'contact@gov.uk', desc: 'Government two-level domain' },
  { email: 'info@firm.co.uk', desc: 'Commercial UK domain' },
  { email: 'bonjour@entreprise.fr', desc: 'French national TLD (.fr)' },
  { email: 'kontakt@bedrift.no', desc: 'Norwegian national TLD (.no)' },
  { email: 'enquiries@singapore.sg', desc: 'Singapore national TLD (.sg)' },
  { email: 'support@business.com.au', desc: 'Australian company domain (.com.au)' },
  { email: 'billing@sub.dept.enterprise.com', desc: 'Multi-subdomain corporate email' }
];

for (const c of validEmailCases) {
  const res = contactValidator.validateEmail(c.email);
  assert(res.isValid === true && res.sanitized === c.email.toLowerCase(), c.desc, res.error);
}
console.log();

// -----------------------------------------------------------------------------
// 2. EMAIL VALIDATION: INVALID CASES
// -----------------------------------------------------------------------------
console.log('🚫 SECTION 2: INVALID EMAIL TESTS (Rejection Verification)');
const invalidEmailCases = [
  // Crawler asset false positives
  { email: 'logo.png@2x', expected: 'Media asset file' },
  { email: 'icon.svg@v2', expected: 'Media asset file' },
  { email: 'styles.css', expected: 'Not an email' },
  { email: 'document.pdf', expected: 'Not an email' },
  
  // Placeholder & dummy domains
  { email: 'user@example.com', expected: 'Placeholder example.com' },
  { email: 'test@test.com', expected: 'Placeholder test.com' },
  { email: 'admin@sample.org', expected: 'Placeholder sample.org' },
  { email: 'sales@yourcompany.com', expected: 'Placeholder yourcompany.com' },
  { email: 'errors@sentry.io', expected: 'Telemetry sentry.io' },
  { email: 'dev@localhost', expected: 'Localhost domain' },

  // Burner & disposable domains
  { email: 'anonymous@mailinator.com', expected: 'Disposable mailinator.com' },
  { email: 'temp123@tempmail.com', expected: 'Disposable tempmail.com' },
  { email: 'quick@10minutemail.com', expected: 'Disposable 10minutemail.com' },
  { email: 'hacker@guerrillamail.com', expected: 'Disposable guerrillamail.com' },

  // Malformed syntax
  { email: 'missing-at-sign.com', expected: 'Missing @ symbol' },
  { email: '@nodomain.com', expected: 'Empty local-part' },
  { email: 'user@', expected: 'Empty domain-part' },
  { email: 'user@.com', expected: 'Leading dot in domain' },
  { email: 'user..double@domain.com', expected: 'Consecutive dots' },
  { email: '.leadingdot@domain.com', expected: 'Leading dot' },
  { email: 'user@domain..com', expected: 'Consecutive dots in domain' },
  { email: '', expected: 'Empty string' }
];

for (const c of invalidEmailCases) {
  const res = contactValidator.validateEmail(c.email);
  assert(res.isValid === false, `Rejected invalid: "${c.email}" (${c.expected})`, `Got unexpected valid`);
}
console.log();

// -----------------------------------------------------------------------------
// 3. PHONE VALIDATION: VALID CASES & LOCALIZED FORMATTING
// -----------------------------------------------------------------------------
console.log('📞 SECTION 3: VALID PHONE TESTS & FORMATTING');
const validPhoneCases = [
  // US & Canada
  { raw: '2127526166', country: 'USA', expectedFormatted: '+1 (212) 752-6166', desc: '10-digit US raw -> +1 (212) 752-6166' },
  { raw: '13038662411', country: 'US', expectedFormatted: '+1 (303) 866-2411', desc: '11-digit US with 1 prefix -> +1 (303) 866-2411' },
  { raw: '(415) 555-2671', country: 'USA', expectedFormatted: '+1 (415) 555-2671', desc: 'Punctuation US -> +1 (415) 555-2671' },

  // UK
  { raw: '02079460192', country: 'UK', expectedFormatted: '+44 2079 460192', desc: '11-digit UK national 020 -> +44' },
  { raw: '+44 161 999 8888', country: 'UK', expectedFormatted: '+44 1619 998888', desc: 'UK with +44 prefix' },

  // France
  { raw: '0142685500', country: 'France', expectedFormatted: '+33 1 42 68 55 00', desc: '10-digit France 01 -> +33' },
  { raw: '+33 6 12 34 56 78', country: 'France', expectedFormatted: '+33 6 12 34 56 78', desc: 'France mobile with +33' },

  // Norway
  { raw: '45172987', country: 'Norway', expectedFormatted: '+47 45 17 29 87', desc: '8-digit Norway -> +47' },
  { raw: '+47 911 76 537', country: 'Norway', expectedFormatted: '+47 91 17 65 37', desc: 'Norway with +47' },

  // Singapore & Australia (International fallback)
  { raw: '+65 6789 0123', country: 'Singapore', expectedFormatted: '+6567890123', desc: 'Singapore international with +' },
  { raw: '+61 2 9262 1443', country: 'Australia', expectedFormatted: '+61292621443', desc: 'Australia international with +' }
];

for (const c of validPhoneCases) {
  const res = contactValidator.validatePhone(c.raw, c.country);
  const ok = res.isValid === true && (res.formatted === c.expectedFormatted || res.formatted.replace(/\s+/g, '') === c.expectedFormatted.replace(/\s+/g, ''));
  assert(ok, c.desc, `Got: "${res.formatted}"`);
}
console.log();

// -----------------------------------------------------------------------------
// 4. PHONE VALIDATION: INVALID CASES
// -----------------------------------------------------------------------------
console.log('🚫 SECTION 4: INVALID PHONE TESTS (Rejection Verification)');
const invalidPhoneCases = [
  // Repetitive dummy digits
  { phone: '0000000000', expected: 'All zeros' },
  { phone: '1111111111', expected: 'All ones' },
  { phone: '9999999999', expected: 'All nines' },
  { phone: '7777777', expected: 'All sevens' },

  // Sequential dummy digits
  { phone: '12345678', expected: 'Sequential digits' },
  { phone: '1234567890', expected: 'Sequential 10 digits' },
  { phone: '98765432', expected: 'Reverse sequential digits' },

  // US fictional movie 555 numbers
  { phone: '5550143', expected: 'US Fictional 555-01xx' },
  { phone: '+15550199', expected: 'US Fictional +1-555-01xx' },

  // Length violations
  { phone: '123', expected: 'Too short (< 7 digits)' },
  { phone: '12345', expected: 'Too short (< 7 digits)' },
  { phone: '12345678901234567', expected: 'Too long (> 15 digits, ITU-T limit)' },

  // Non-dialable strings
  { phone: 'N/A', expected: 'No digits' },
  { phone: 'Contact Us', expected: 'Text string' },
  { phone: '', expected: 'Empty string' }
];

for (const c of invalidPhoneCases) {
  const res = contactValidator.validatePhone(c.phone);
  assert(res.isValid === false, `Rejected invalid phone: "${c.phone}" (${c.expected})`, `Got unexpected valid`);
}
console.log();

// -----------------------------------------------------------------------------
// 5. FULL LEAD OBJECT VALIDATION & NORMALIZER INTEGRATION
// -----------------------------------------------------------------------------
console.log('🏢 SECTION 5: FULL LEAD AUDIT & NORMALIZER INTEGRATION');

const leadWithValidData = {
  company_name: 'Stripe Payments UK Ltd',
  registration_number: '08414858',
  country: 'United Kingdom',
  email: 'SUPPORT@STRIPE.COM',
  phone: '02079460192'
};

const normalizedClean = normalizer.normalizeLead(leadWithValidData);
assert(normalizedClean.email === 'support@stripe.com', 'Normalized email converted to lowercase and validated');
assert(normalizedClean.phone.startsWith('+44'), 'Normalized phone formatted with +44 UK prefix');

const leadWithGarbageData = {
  company_name: 'Acme Dummy Corp',
  registration_number: '999999',
  country: 'United States',
  email: 'logo.png@2x',
  phone: '0000000000'
};

const normalizedGarbage = normalizer.normalizeLead(leadWithGarbageData);
assert(normalizedGarbage.email === '', 'Garbage email stripped and saved as empty string');
assert(normalizedGarbage.phone === '', 'Garbage phone stripped and saved as empty string');

const auditResult = contactValidator.validateLeadContacts(leadWithGarbageData);
assert(auditResult.emailValid === false && auditResult.phoneValid === false, 'validateLeadContacts reports both as invalid');
assert(auditResult.issues.length >= 2, `Audit generated ${auditResult.issues.length} diagnostic issue messages`);

console.log();
console.log('================================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failed)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
}
