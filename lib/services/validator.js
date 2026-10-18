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
      'example.edu',
      'test.com',
      'test.org',
      'test.net',
      'sample.org',
      'sample.com',
      'sample.net',
      'domain.com',
      'domain.org',
      'yourcompany.com',
      'mycompany.com',
      'company.com',
      'website.com',
      'sentry.io',
      'localhost',
      'invalid.com',
      'none.com',
      'nowhere.com',
      'corp.com',
      'email.com',
      'user.com',
      'xyz.com',
      'asdf.com',
      'foo.bar',
      'testing.com',
      'dummy.com',
      'demo.com',
      'fake.com',
      'fakemail.com',
      'testcompany.com',
      'testdomain.com'
    ]);

    // Common disposable / burner email domains
    this.disposableDomains = new Set([
      'mailinator.com',
      'tempmail.com',
      'temp-mail.org',
      'temp-mail.io',
      '10minutemail.com',
      '10minutemail.net',
      'guerrillamail.com',
      'guerrillamail.net',
      'guerrillamail.biz',
      'guerrillamail.org',
      'guerrillamailblock.com',
      'grr.la',
      'throwawaymail.com',
      'throwawaymail.org',
      'sharklasers.com',
      'yopmail.com',
      'yopmail.fr',
      'yopmail.net',
      'trashmail.com',
      'trashmail.net',
      'trashmail.org',
      'trash-mail.com',
      'dispostable.com',
      'getairmail.com',
      'maildrop.cc',
      'inboxkitten.com',
      'burnermail.io',
      'fakemailgenerator.com',
      'generator.email',
      'disposablemail.com',
      'crazymailing.com',
      'getnada.com',
      'mohmal.com',
      'emailondeck.com',
      'tempail.com',
      'mytemp.email',
      'dropmail.me',
      'tempr.email',
      'discard.email',
      'nada.ltd',
      'mailnull.com',
      'jetable.org',
      'mytempemail.com',
      'fakeinbox.com',
      'armyspy.com',
      'cuvox.de',
      'dayrep.com',
      'einrot.com',
      'fleckens.hu',
      'gustr.com',
      'jourrapide.com',
      'rhyta.com',
      'superrito.com',
      'teleworm.us',
      'mintemail.com',
      'harakirimail.com',
      'mailcatch.com',
      'pokemail.net',
      'spamgourmet.com',
      'mytempmail.com'
    ]);

    // Common placeholder or dummy local-parts that are non-actionable for sales outreach
    this.dummyLocalParts = new Set([
      'none',
      'null',
      'undefined',
      'na',
      'n/a',
      'test',
      'testing',
      'fake',
      'dummy',
      'placeholder',
      'example',
      'noreply',
      'no-reply',
      'donotreply',
      'do-not-reply',
      'nobody'
    ]);

    // Known telemetry & crawler false-positive patterns
    this.telemetryDomains = [
      'sentry.io',
      'wixpress.com',
      'schema.org',
      'w3.org',
      'datadoghq.com'
    ];

    // File extensions mistakenly captured by web crawlers as emails
    this.mediaAssetRegex = /\.(png|jpg|jpeg|gif|webp|svg|ico|bmp|tiff|css|js|mjs|jsx|ts|tsx|json|xml|woff|woff2|ttf|eot|otf|pdf|zip|tar|gz|rar|7z|mp4|mp3|wav|webm|avi|mov|wasm|map)(?:@|\?|$)/i;

    // Common fake/dummy phone digit sequences
    this.dummyPhonePatterns = [
      /^(\d)\1{6,}$/,             // All identical digits (7+): 0000000, 1111111, 2222222, etc.
      /^01234567/,                // Sequential starting 0
      /^12345678/,                // Sequential: 123456789...
      /^23456789/,
      /^98765432/,                // Reverse sequential
      /^87654321/,
      /^76543210/,
      /^[01]{7,}$/,               // Binary strings e.g. 01010101
      /^(12){4,}/,                // Alternating 12121212...
      /^(01){4,}/,                // Alternating 01010101...
      /^(90){4,}/,                // Alternating 90909090...
      /^\+?1?55501\d{2}$/         // US fictional movie numbers: 555-0100 to 555-0199
    ];
  }

  /**
   * Validate and clean an email address (RFC 5322 compliance + syntax + dummy check)
   * @param {string} rawEmail 
   * @returns {{ isValid: boolean, sanitized: string, error?: string, localPart?: string, domain?: string }}
   */
  validateEmail(rawEmail) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      return { isValid: false, sanitized: '', error: 'Email is empty or not a string' };
    }

    // Sanitize: remove wrapping quotes, angle brackets, and whitespace
    let trimmed = rawEmail.trim().toLowerCase();
    trimmed = trimmed.replace(/^[<"']+|[>"']+$/g, '');

    // 1. Length constraints (RFC 5321: max 254 chars, local part max 64)
    if (trimmed.length < 5 || trimmed.length > 254) {
      return { isValid: false, sanitized: '', error: 'Email length out of RFC limits (5-254 characters)' };
    }

    // 2. Reject file extension false positives (e.g. from regex crawling)
    if (this.mediaAssetRegex.test(trimmed) || /\.(png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ico|pdf|zip)$/i.test(trimmed)) {
      return { isValid: false, sanitized: '', error: 'Email points to a media/asset file' };
    }

    // 3. Reject consecutive dots, leading/trailing dot in local part
    if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.includes('@.') || trimmed.includes('.@')) {
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

    if (this.dummyLocalParts.has(localPart)) {
      return { isValid: false, sanitized: '', error: `Local part '${localPart}' is a placeholder/no-reply address` };
    }

    // 6. Domain part validations
    const domainLabels = domainPart.split('.');
    if (domainLabels.length < 2) {
      return { isValid: false, sanitized: '', error: 'Domain must contain at least one period' };
    }

    for (const label of domainLabels) {
      if (!label || label.length > 63) {
        return { isValid: false, sanitized: '', error: 'Domain label length invalid (1-63 chars)' };
      }
      if (label.startsWith('-') || label.endsWith('-')) {
        return { isValid: false, sanitized: '', error: 'Domain label cannot start or end with a hyphen' };
      }
    }

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

    for (const telDom of this.telemetryDomains) {
      if (domainPart === telDom || domainPart.endsWith(`.${telDom}`)) {
        return { isValid: false, sanitized: '', error: `Domain '${domainPart}' is a telemetry/error-monitoring service` };
      }
    }

    return {
      isValid: true,
      sanitized: trimmed,
      localPart,
      domain: domainPart
    };
  }

  /**
   * Validate, clean, and format an international phone number (ITU-T E.164 compliance)
   * @param {string} rawPhone 
   * @param {string} [countryHint=''] - Optional country name or code for localized formatting
   * @returns {{ isValid: boolean, sanitized: string, formatted: string, country?: string, error?: string }}
   */
  validatePhone(rawPhone, countryHint = '') {
    if (!rawPhone || typeof rawPhone !== 'string') {
      return { isValid: false, sanitized: '', formatted: '', error: 'Phone is empty or not a string' };
    }

    let trimmed = rawPhone.trim();

    // Remove extension suffixes if present (e.g., "x123", "ext 456")
    trimmed = trimmed.replace(/(?:x|ext\.?|extension)\s*\d+$/i, '').trim();

    // Convert leading international '00' to '+'
    if (trimmed.startsWith('00') && trimmed.replace(/\D/g, '').length >= 9) {
      trimmed = '+' + trimmed.slice(2).trim();
    }

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
    if (!formatted && (upperCountry === 'UK' || upperCountry === 'GB' || upperCountry === 'UNITED KINGDOM' || digitsOnly.startsWith('44'))) {
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

    // Norway formatting (8 digits or 10 digits starting with 47)
    if (!formatted && (upperCountry === 'NO' || upperCountry === 'NORWAY' || digitsOnly.startsWith('47'))) {
      const eightDigits = digitsOnly.startsWith('47') && digitsOnly.length === 10 ? digitsOnly.slice(2) : digitsOnly;
      if (eightDigits.length === 8) {
        formatted = `+47 ${eightDigits.slice(0, 2)} ${eightDigits.slice(2, 4)} ${eightDigits.slice(4, 6)} ${eightDigits.slice(6, 8)}`;
      }
    }

    // Singapore formatting (8 digits starting with 3, 6, 8, 9 or 10 digits starting with 65)
    if (!formatted && (upperCountry === 'SG' || upperCountry === 'SINGAPORE' || digitsOnly.startsWith('65'))) {
      if (digitsOnly.startsWith('65') && digitsOnly.length === 10) {
        const nat = digitsOnly.slice(2);
        formatted = `+65 ${nat.slice(0, 4)} ${nat.slice(4)}`;
      } else if (digitsOnly.length === 8) {
        formatted = `+65 ${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4)}`;
      }
    }

    // Australia formatting (9 digits or 11 digits starting with 61)
    if (!formatted && (upperCountry === 'AU' || upperCountry === 'AUSTRALIA' || digitsOnly.startsWith('61'))) {
      if (digitsOnly.startsWith('61') && digitsOnly.length >= 10) {
        const nat = digitsOnly.slice(2);
        formatted = `+61 ${nat[0]} ${nat.slice(1, 5)} ${nat.slice(5)}`;
      } else if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
        const nat = digitsOnly.slice(1);
        formatted = `+61 ${nat[0]} ${nat.slice(1, 5)} ${nat.slice(5)}`;
      }
    }

    // India formatting (10 digits starting with 6-9 or 12 digits starting with 91)
    if (!formatted && (upperCountry === 'IN' || upperCountry === 'INDIA' || digitsOnly.startsWith('91'))) {
      if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
        const nat = digitsOnly.slice(2);
        formatted = `+91 ${nat.slice(0, 5)} ${nat.slice(5)}`;
      } else if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
        formatted = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
      }
    }

    // Germany formatting (starting with 49)
    if (!formatted && (upperCountry === 'DE' || upperCountry === 'GERMANY' || digitsOnly.startsWith('49'))) {
      if (digitsOnly.startsWith('49') && digitsOnly.length >= 10) {
        formatted = `+49 ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5)}`;
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
