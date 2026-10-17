// lib/connectors/index.js
// Registry of all international country connectors & open data registries

import { ukConnector } from './companies_house.js';
import { singaporeConnector } from './singapore_acra.js';
import { norwayConnector } from './norway_brreg.js';
import { franceConnector } from './france_insee.js';
import { usaConnector } from './usa_socrata.js';
import { canadaConnector } from './canada_ised.js';
import { australiaConnector } from './australia_abn.js';
import { euConnector } from './eu_ted.js';
import { gleifConnector } from './global_gleif.js';
import { googleMapsConnector } from './google_maps.js';

export const CONNECTORS = {
  MAPS: {
    code: 'MAPS',
    name: 'Google Maps (Hyper-Local)',
    flag: '📍',
    source: 'Google Maps Hyper-Local Places (Free Headless Engine)',
    requiresAuth: false,
    instance: googleMapsConnector
  },
  GLOBAL: {
    code: 'GLOBAL',
    name: 'Global (GLEIF)',
    flag: '🌐',
    source: 'GLEIF Legal Entity Registry (2.6M+ ISO 17442 LEIs)',
    requiresAuth: false,
    instance: gleifConnector
  },
  EU: {
    code: 'EU',
    name: 'European Union',
    flag: '🇪🇺',
    source: 'EU TED Public Procurement (eForms Awards & Buyers)',
    requiresAuth: false,
    instance: euConnector
  },
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
    source: "Recherche d'entreprises (api.gouv.fr & BODACC)",
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
    source: 'US Socrata Open Data (Colorado, New York & Chicago)',
    requiresAuth: false,
    instance: usaConnector
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    flag: '🇬🇧',
    source: 'UK Corporate Registries (Companies House & Contracts Finder)',
    requiresAuth: false,
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

const ALIASES = {
  GLOBAL: 'GLOBAL',
  GL: 'GLOBAL',
  GLEIF: 'GLOBAL',
  WORLD: 'GLOBAL',
  WORLDWIDE: 'GLOBAL',
  EU: 'EU',
  EUROPE: 'EU',
  'EUROPEAN UNION': 'EU',
  TED: 'EU',
  US: 'US',
  USA: 'US',
  'UNITED STATES': 'US',
  UK: 'UK',
  GB: 'UK',
  'UNITED KINGDOM': 'UK',
  GREATBRITAIN: 'UK',
  MAPS: 'MAPS',
  GMAPS: 'MAPS',
  GOOGLE: 'MAPS',
  'GOOGLE MAPS': 'MAPS',
  LOCAL: 'MAPS'
};

export function getConnector(countryCodeOrName) {
  if (!countryCodeOrName) return null;
  const upper = countryCodeOrName.toUpperCase().trim();

  // Try direct code lookup
  if (CONNECTORS[upper]) {
    return CONNECTORS[upper].instance;
  }

  // Try alias lookup
  if (ALIASES[upper] && CONNECTORS[ALIASES[upper]]) {
    return CONNECTORS[ALIASES[upper]].instance;
  }

  // Try name match
  for (const item of Object.values(CONNECTORS)) {
    if (item.name.toUpperCase() === upper || item.code.toUpperCase() === upper) {
      return item.instance;
    }
  }

  return null;
}

