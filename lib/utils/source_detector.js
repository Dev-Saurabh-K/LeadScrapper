// lib/utils/source_detector.js
// Utility to detect and standardize lead origin platform, handle, and metadata

/**
 * Detect lead origin, platform, and canonical handle
 * @param {object} lead
 * @returns {object} { engine, label, handle, url, colorClasses }
 */
export function detectLeadSource(lead = {}) {
  const source = String(lead.source || lead['Source Registry'] || lead['Source'] || lead.Source || '').toLowerCase();
  const regNum = String(lead.registration_number || lead['Registration Number'] || lead.Registration_Number || '').trim();
  const rawWebsite = String(lead.website || lead['Website'] || lead.Website || '');
  const website = rawWebsite.toLowerCase();
  const directorVal = String(lead.director || lead['Director / Officers'] || '');
  const cityVal = String(lead.city || lead['City'] || '');
  const countryVal = String(lead.country || lead['Country'] || '');
  const companyTypeVal = String(lead.company_type || lead['Company Type'] || '');

  // 1. Instagram
  if (source.includes('instagram') || regNum.startsWith('IG:') || website.includes('instagram.com/')) {
    let handle = '';
    if (regNum.startsWith('IG:')) {
      handle = `@${regNum.slice(3)}`;
    } else if (website.includes('instagram.com/')) {
      const match = website.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match) handle = `@${match[1]}`;
    }
    if (!handle && directorVal.startsWith('@')) {
      handle = directorVal;
    }

    return {
      engine: 'INSTAGRAM',
      platform: 'INSTAGRAM',
      label: 'Instagram',
      handle: handle || regNum || 'Creator / Brand',
      url: rawWebsite && website.includes('instagram.com') ? rawWebsite : '',
      badgeBg: 'bg-pink-50',
      badgeText: 'text-pink-700',
      badgeBorder: 'border-pink-200',
      badgeRing: 'ring-pink-200'
    };
  }

  // 2. Facebook
  if (source.includes('facebook') || regNum.startsWith('FB:') || website.includes('facebook.com/')) {
    let handle = '';
    if (regNum.startsWith('FB:')) {
      handle = regNum.slice(3);
    } else if (website.includes('facebook.com/')) {
      const match = website.match(/facebook\.com\/([a-zA-Z0-9._-]+)/);
      if (match) handle = match[1];
    }

    return {
      engine: 'FACEBOOK',
      platform: 'FACEBOOK',
      label: 'Facebook',
      handle: handle ? `fb/${handle}` : regNum || 'Business Page',
      url: rawWebsite && website.includes('facebook.com') ? rawWebsite : '',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-[#1877F2]',
      badgeBorder: 'border-blue-200',
      badgeRing: 'ring-blue-200'
    };
  }

  // 3. LinkedIn
  if (source.includes('linkedin') || regNum.startsWith('LI:') || website.includes('linkedin.com/')) {
    let handle = '';
    if (regNum.startsWith('LI:')) {
      handle = `in/${regNum.slice(3)}`;
    } else if (website.includes('linkedin.com/in/')) {
      const match = website.match(/linkedin\.com\/in\/([a-zA-Z0-9._-]+)/);
      if (match) handle = `in/${match[1]}`;
    }

    return {
      engine: 'LINKEDIN',
      platform: 'LINKEDIN',
      label: 'LinkedIn',
      handle: handle || regNum || 'Professional',
      url: rawWebsite && website.includes('linkedin.com') ? rawWebsite : '',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-[#0A66C2]',
      badgeBorder: 'border-sky-200',
      badgeRing: 'ring-sky-200'
    };
  }

  // 4. Google Maps
  if (source.includes('maps') || regNum.startsWith('MAPS-')) {
    const loc = [cityVal, countryVal].filter(Boolean).join(', ');
    return {
      engine: 'MAPS',
      platform: 'MAPS',
      label: 'Google Maps',
      handle: loc || 'Local Place',
      url: rawWebsite && !website.includes('google.com/maps') ? rawWebsite : '',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200',
      badgeRing: 'ring-rose-200'
    };
  }

  // 5. Official Corporate Registries (Norway, France, UK, USA, Singapore, Canada, Australia)
  const countryName = countryVal ? countryVal.trim() : '';
  return {
    engine: 'REGISTRY',
    platform: 'REGISTRY',
    label: countryName ? `Registry: ${countryName}` : 'Corporate Registry',
    handle: regNum || companyTypeVal || 'Corporate Registry',
    url: rawWebsite || '',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    badgeRing: 'ring-indigo-200'
  };
}
