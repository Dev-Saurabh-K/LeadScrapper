// lib/connectors/index.js
// Registry of all country connectors

import { ukConnector } from './companies_house.js';
import { singaporeConnector } from './singapore_acra.js';
import { norwayConnector } from './norway_brreg.js';
import { franceConnector } from './france_insee.js';
import { usaConnector } from './usa_socrata.js';
import { canadaConnector } from './canada_ised.js';
import { australiaConnector } from './australia_abn.js';

export const CONNECTORS = {
  NO: {
    code: 'NO',
    name: 'Norway',
    flag: '🇳🇴',
    source: 'Brønnøysundregistrene (data.brreg.no)',
    requiresAuth: false,
    instance: norwayConnector
  },
  FR: {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    source: "Recherche d'entreprises (api.gouv.fr)",
    requiresAuth: false,
    instance: franceConnector
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    source: 'ACRA (data.gov.sg)',
    requiresAuth: false,
    instance: singaporeConnector
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    source: 'US Socrata Open Data (Colorado & NY)',
    requiresAuth: false,
    instance: usaConnector
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    flag: '🇬🇧',
    source: 'Companies House API',
    requiresAuth: true,
    instance: ukConnector
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    source: 'Corporations Canada Open Data',
    requiresAuth: false,
    instance: canadaConnector
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    source: 'Australian Business Register (ABN Lookup)',
    requiresAuth: true,
    instance: australiaConnector
  }
};

export function getConnector(countryCodeOrName) {
  if (!countryCodeOrName) return null;
  const upper = countryCodeOrName.toUpperCase().trim();

  // Try direct code lookup
  if (CONNECTORS[upper]) {
    return CONNECTORS[upper].instance;
  }

  // Try name match
  for (const item of Object.values(CONNECTORS)) {
    if (item.name.toUpperCase() === upper || item.code.toUpperCase() === upper) {
      return item.instance;
    }
  }

  return null;
}
