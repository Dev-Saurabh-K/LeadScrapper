// lib/connectors/index.js
// Dedicated connector registry: 100% Free Live Google Maps Hyper-Local Scraper

import { googleMapsConnector } from './google_maps.js';

export const CONNECTORS = {
  MAPS: {
    code: 'MAPS',
    name: 'Google Maps (Hyper-Local)',
    flag: '📍',
    source: 'Google Maps Hyper-Local Places (Free Headless Engine)',
    requiresAuth: false,
    instance: googleMapsConnector
  }
};

const ALIASES = {
  MAPS: 'MAPS',
  GMAPS: 'MAPS',
  GOOGLE: 'MAPS',
  'GOOGLE MAPS': 'MAPS',
  LOCAL: 'MAPS',
  DEFAULT: 'MAPS'
};

/**
 * Get active connector (always returns Google Maps connector)
 * @param {string} [countryCodeOrName]
 * @returns {object} Google Maps connector instance
 */
export function getConnector(countryCodeOrName) {
  return googleMapsConnector;
}

/**
 * List active connectors
 * @returns {Array<object>}
 */
export function listConnectors() {
  return Object.values(CONNECTORS);
}
