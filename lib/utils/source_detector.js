// lib/utils/source_detector.js
// Utility to detect and standardize lead origin platform, handle, and metadata

/**
 * Detect lead origin, platform, and canonical handle
 * @param {object} lead
 * @returns {object} { engine, label, handle, url, colorClasses }
 */
export function detectLeadSource(lead = {}) {
  const source = String(lead.source || '').toLowerCase();
  const regNum = String(lead.registration_number || '').trim();
  const website = String(lead.website || '').toLowerCase();

  // 1. Instagram
  if (source.includes('instagram') || regNum.startsWith('IG:') || website.includes('instagram.com/')) {
    let handle = '';
    if (regNum.startsWith('IG:')) {
      handle = `@${regNum.slice(3)}`;
    } else if (website.includes('instagram.com/')) {
      const match = website.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match) handle = `@${match[1]}`;
    }
    if (!handle && lead.director && lead.director.startsWith('@')) {
      handle = lead.director;
    }

    return {
      engine: 'INSTAGRAM',
      platform: 'INSTAGRAM',
      label: 'Instagram',
      handle: handle || regNum || 'Creator / Brand',
      url: lead.website && lead.website.includes('instagram.com') ? lead.website : '',
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
      url: lead.website && lead.website.includes('facebook.com') ? lead.website : '',
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
      url: lead.website && lead.website.includes('linkedin.com') ? lead.website : '',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-[#0A66C2]',
      badgeBorder: 'border-sky-200',
      badgeRing: 'ring-sky-200'
    };
  }

  // 4. Google Maps
  if (source.includes('maps') || regNum.startsWith('MAPS-')) {
    const loc = [lead.city, lead.country].filter(Boolean).join(', ');
    return {
      engine: 'MAPS',
      platform: 'MAPS',
      label: 'Google Maps',
      handle: loc || 'Local Place',
      url: lead.website && !lead.website.includes('google.com/maps') ? lead.website : '',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200',
      badgeRing: 'ring-rose-200'
    };
  }

  // 5. Official Corporate Registries (Norway, France, UK, USA, Singapore, Canada, Australia)
  const countryName = lead.country ? String(lead.country).trim() : '';
  return {
    engine: 'REGISTRY',
    platform: 'REGISTRY',
    label: countryName ? `Registry: ${countryName}` : 'Corporate Registry',
    handle: regNum || lead.company_type || 'Corporate Registry',
    url: lead.website || '',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    badgeRing: 'ring-indigo-200'
  };
}
