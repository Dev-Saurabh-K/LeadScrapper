// lib/services/validator.js
// Enterprise-grade Contact Information Validation Service
// Performs rigorous validation and formatting for B2B Emails and Phone Numbers

export class ContactValidator {
  constructor() {
    // Known placeholder or dummy domains that should never be stored as valid B2B leads
    this.dummyDomains = new Set([
      'example.com',
      'example.org',
      'example.net',
      'test.com',
      'test.org',
      'sample.org',
      'sample.com',
      'domain.com',
      'yourcompany.com',
      'sentry.io',
      'localhost',
      'invalid.com'
    ]);

    // Common disposable / burner email domains
    this.disposableDomains = new Set([
      'mailinator.com',
      'tempmail.com',
      'temp-mail.org',
      '10minutemail.com',
      'guerrillamail.com',
      'throwawaymail.com',
      'sharklasers.com',
      'yopmail.com',
      'trashmail.com',
      'dispostable.com',
      'getairmail.com'
    ]);

    // Common fake/dummy phone digit sequences
    this.dummyPhonePatterns = [
      /^0+$/,                     // All zeros: 0000000000
      /^1+$/,                     // All ones: 1111111111
      /^2+$/,
      /^3+$/,
      /^4+$/,
      /^5+$/,
      /^6+$/,
      /^7+$/,
      /^8+$/,
      /^9+$/,                     // All nines: 9999999999
      /^12345678/,                // Sequential: 123456789...
      /^98765432/,                // Reverse sequential
      /^[01]{7,}$/,               // Binary strings e.g. 01010101
      /^\+?1?55501\d{2}$/         // US fictional movie numbers: 555-0100 to 555-0199
    ];
  }

  /**
   * Validate and clean an email address (RFC 5322 compliance + syntax + dummy check)
   * @param {string} rawEmail 
   * @returns {{ isValid: boolean, sanitized: string, error?: string }}
   */
  validateEmail(rawEmail) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      return { isValid: false, sanitized: '', error: 'Email is empty or not a string' };
    }

    const trimmed = rawEmail.trim().toLowerCase();

    // 1. Length constraints (RFC 5321: max 254 chars, local part max 64)
    if (trimmed.length < 5 || trimmed.length > 254) {
      return { isValid: false, sanitized: '', error: 'Email length out of RFC limits (5-254 characters)' };
    }

    // 2. Reject file extension false positives (e.g. from regex crawling)
    if (/\.(png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ico|pdf|zip)$/i.test(trimmed)) {
      return { isValid: false, sanitized: '', error: 'Email points to a media/asset file' };
    }

    // 3. Reject consecutive dots, leading/trailing dot in local part
    if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.includes('@.')) {
      return { isValid: false, sanitized: '', error: 'Email contains consecutive or misplaced periods' };
    }

    // 4. Standard RFC Email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, sanitized: '', error: 'Email does not match standard RFC 5322 syntax' };
    }

    const parts = trimmed.split('@');
    if (parts.length !== 2) {
      return { isValid: false, sanitized: '', error: 'Invalid @ symbol count' };
    }

    const [localPart, domainPart] = parts;

    // 5. Local part validations
    if (localPart.length > 64) {
      return { isValid: false, sanitized: '', error: 'Local part exceeds 64 characters' };
    }

    // 6. Domain part validations
    const domainLabels = domainPart.split('.');
    const tld = domainLabels[domainLabels.length - 1];

    if (!tld || tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
      return { isValid: false, sanitized: '', error: 'Invalid Top-Level Domain (TLD)' };
    }

    // 7. Dummy and disposable domain filter
    if (this.dummyDomains.has(domainPart)) {
      return { isValid: false, sanitized: '', error: `Domain '${domainPart}' is a placeholder/dummy domain` };
    }

    if (this.disposableDomains.has(domainPart)) {
      return { isValid: false, sanitized: '', error: `Domain '${domainPart}' is a known disposable/burner service` };
    }

    return {
      isValid: true,
      sanitized: trimmed
    };
  }

  /**
   * Validate, clean, and format an international phone number (ITU-T E.164 compliance)
   * @param {string} rawPhone 
   * @param {string} [countryHint=''] - Optional country name or code for localized formatting
   * @returns {{ isValid: boolean, sanitized: string, formatted: string, error?: string }}
   */
  validatePhone(rawPhone, countryHint = '') {
    if (!rawPhone || typeof rawPhone !== 'string') {
      return { isValid: false, sanitized: '', formatted: '', error: 'Phone is empty or not a string' };
    }

    const trimmed = rawPhone.trim();

    // 1. Remove non-phone characters while keeping digits and leading '+'
    const hasLeadingPlus = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/\D/g, '');

    // 2. Length constraints (ITU-T E.164 standard: max 15 digits; local B2B numbers min 7 digits)
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return { 
        isValid: false, 
        sanitized: '', 
        formatted: '', 
        error: `Phone digit count (${digitsOnly.length}) is outside valid range (7-15 digits)` 
      };
    }

    // 3. Reject dummy/fake repetition patterns (e.g. 0000000, 1111111, 12345678)
    for (const pattern of this.dummyPhonePatterns) {
      if (pattern.test(digitsOnly) || pattern.test((hasLeadingPlus ? '+' : '') + digitsOnly)) {
        return { isValid: false, sanitized: '', formatted: '', error: 'Phone number matches dummy/placeholder pattern' };
      }
    }

    // 4. Format number based on country or length
    let formatted = '';
    const upperCountry = (countryHint || '').toUpperCase().trim();

    // US & Canada formatting (10 digits or 11 digits starting with 1)
    if (upperCountry === 'US' || upperCountry === 'USA' || upperCountry === 'UNITED STATES' || upperCountry === 'CA' || upperCountry === 'CANADA' || (digitsOnly.length === 10 && !hasLeadingPlus)) {
      const tenDigits = digitsOnly.length === 11 && digitsOnly.startsWith('1') ? digitsOnly.slice(1) : digitsOnly;
      if (tenDigits.length === 10) {
        const areaCode = tenDigits.slice(0, 3);
        const prefix = tenDigits.slice(3, 6);
        const line = tenDigits.slice(6);
        // North American Numbering Plan: area code and exchange code cannot start with 0 or 1
        if (areaCode[0] !== '0' && areaCode[0] !== '1' && prefix[0] !== '0' && prefix[0] !== '1') {
          formatted = `+1 (${areaCode}) ${prefix}-${line}`;
        }
      }
    }

    // UK formatting (10 or 11 digits starting with 0 or 44)
    if (!formatted && (upperCountry === 'UK' || upperCountry === 'UNITED KINGDOM' || digitsOnly.startsWith('44'))) {
      if (digitsOnly.startsWith('44') && digitsOnly.length >= 11) {
        const national = digitsOnly.slice(2);
        formatted = `+44 ${national.slice(0, 4)} ${national.slice(4)}`;
      } else if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
        formatted = `+44 ${digitsOnly.slice(1, 5)} ${digitsOnly.slice(5)}`;
      }
    }

    // France formatting (10 digits starting with 0 or 33)
    if (!formatted && (upperCountry === 'FR' || upperCountry === 'FRANCE' || digitsOnly.startsWith('33'))) {
      if (digitsOnly.startsWith('33') && digitsOnly.length === 11) {
        const nat = digitsOnly.slice(2);
        formatted = `+33 ${nat[0]} ${nat.slice(1, 3)} ${nat.slice(3, 5)} ${nat.slice(5, 7)} ${nat.slice(7, 9)}`;
      } else if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
        const nat = digitsOnly.slice(1);
        formatted = `+33 ${nat[0]} ${nat.slice(1, 3)} ${nat.slice(3, 5)} ${nat.slice(5, 7)} ${nat.slice(7, 9)}`;
      }
    }

    // Norway formatting (8 digits)
    if (!formatted && (upperCountry === 'NO' || upperCountry === 'NORWAY' || digitsOnly.startsWith('47'))) {
      const eightDigits = digitsOnly.startsWith('47') && digitsOnly.length === 10 ? digitsOnly.slice(2) : digitsOnly;
      if (eightDigits.length === 8) {
        formatted = `+47 ${eightDigits.slice(0, 2)} ${eightDigits.slice(2, 4)} ${eightDigits.slice(4, 6)} ${eightDigits.slice(6, 8)}`;
      }
    }

    // Generic international format fallback
    if (!formatted) {
      if (hasLeadingPlus) {
        formatted = `+${digitsOnly}`;
      } else if (digitsOnly.length >= 10) {
        formatted = `+${digitsOnly}`;
      } else {
        formatted = digitsOnly;
      }
    }

    return {
      isValid: true,
      sanitized: hasLeadingPlus ? `+${digitsOnly}` : digitsOnly,
      formatted: formatted
    };
  }

  /**
   * Validate all contact information on a lead object
   * @param {object} lead
   * @returns {{ emailValid: boolean, phoneValid: boolean, cleanEmail: string, cleanPhone: string, issues: string[] }}
   */
  validateLeadContacts(lead) {
    const issues = [];
    let cleanEmail = '';
    let cleanPhone = '';

    // Validate Email
    if (lead.email) {
      const emailRes = this.validateEmail(lead.email);
      if (emailRes.isValid) {
        cleanEmail = emailRes.sanitized;
      } else {
        issues.push(`Email invalid: ${emailRes.error}`);
      }
    }

    // Validate Phone
    if (lead.phone) {
      const phoneRes = this.validatePhone(lead.phone, lead.country);
      if (phoneRes.isValid) {
        cleanPhone = phoneRes.formatted || phoneRes.sanitized;
      } else {
        issues.push(`Phone invalid: ${phoneRes.error}`);
      }
    }

    return {
      emailValid: Boolean(cleanEmail),
      phoneValid: Boolean(cleanPhone),
      cleanEmail,
      cleanPhone,
      issues
    };
  }
}

export const contactValidator = new ContactValidator();
