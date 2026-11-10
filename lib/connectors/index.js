// lib/connectors/index.js
// Dedicated connector registry: Google Maps Hyper-Local, LinkedIn, and Instagram Authless Scrapers

import { googleMapsConnector } from './google_maps.js';
import { linkedInConnector } from './linkedin.js';
import { instagramConnector } from './instagram.js';

export const CONNECTORS = {
  MAPS: {
    code: 'MAPS',
    name: 'Google Maps (Hyper-Local)',
    flag: 'MAPS',
    source: 'Google Maps Hyper-Local Places (Free Headless Engine)',
    requiresAuth: false,
    instance: googleMapsConnector
  },
  LINKEDIN: {
    code: 'LINKEDIN',
    name: 'LinkedIn Leads',
    flag: 'LINKEDIN',
    source: 'LinkedIn Business & Decision Maker Search',
    requiresAuth: false,
    instance: linkedInConnector
  },
  INSTAGRAM: {
    code: 'INSTAGRAM',
    name: 'Instagram Leads',
    flag: 'INSTAGRAM',
    source: 'Instagram Business & Creator Search',
    requiresAuth: false,
    instance: instagramConnector
  }
};

const ALIASES = {
  MAPS: 'MAPS',
  GMAPS: 'MAPS',
  GOOGLE: 'MAPS',
  'GOOGLE MAPS': 'MAPS',
  LOCAL: 'MAPS',
  DEFAULT: 'MAPS',
  LINKEDIN: 'LINKEDIN',
  LI: 'LINKEDIN',
  PEOPLE: 'LINKEDIN',
  INSTAGRAM: 'INSTAGRAM',
  IG: 'INSTAGRAM',
  INSTA: 'INSTAGRAM',
  CREATOR: 'INSTAGRAM',
  INFLUENCER: 'INSTAGRAM'
};

/**
 * Get active connector by engine code
 * @param {string} [code] - 'MAPS', 'LINKEDIN', or 'INSTAGRAM'
 * @returns {object} Connector instance
 */
export function getConnector(code) {
  const norm = String(code || 'MAPS').trim().toUpperCase();
  const resolved = ALIASES[norm] || 'MAPS';
  return CONNECTORS[resolved]?.instance || googleMapsConnector;
}

/**
 * List active connectors
 * @returns {Array<object>}
 */
export function listConnectors() {
  return Object.values(CONNECTORS);
}
