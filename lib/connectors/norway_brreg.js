// lib/connectors/norway_brreg.js
// Norway Public Registry Connector (Brønnøysundregistrene - data.brreg.no)
// Free JSON REST API - No API key required

import { BaseConnector } from './base.js';

export class NorwayBrregConnector extends BaseConnector {
  constructor() {
    super('NO', 'Norway', 'Brønnøysundregistrene (data.brreg.no)', false);
  }

  async search(query = '', limit = 20) {
    const size = Math.min(Math.max(limit, 1), 100);
    let url = `https://data.brreg.no/enhetsregisteret/api/enheter?size=${size}`;
    if (query && query.trim()) {
      url += `&navn=${encodeURIComponent(query.trim())}`;
    }

    const data = await this.safeFetch(url);
    const entities = data?._embedded?.enheter || [];

    const leads = [];
    for (const item of entities) {
      const addressObj = item.forretningsadresse || item.postadresse || {};
      const street = Array.isArray(addressObj.adresse) ? addressObj.adresse.join(', ') : (addressObj.adresse || '');
      const city = addressObj.poststed || addressObj.kommune || '';
      const postalCode = addressObj.postnummer || '';
      const fullAddress = [street, postalCode, city, addressObj.land || 'Norge'].filter(Boolean).join(', ');

      // Website cleaning
      let website = item.hjemmeside || '';
      if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
        website = `https://${website}`;
      }

      leads.push({
        company_name: item.navn || '',
        registration_number: item.organisasjonsnummer ? String(item.organisasjonsnummer) : '',
        country: 'Norway',
        status: item.underAvvikling || item.konkurs ? 'Inactive' : 'Active',
        incorporation_date: item.registreringsdatoEnhetsregisteret || item.stiftelsesdato || '',
        company_type: item.organisasjonsform?.beskrivelse || item.organisasjonsform?.kode || 'AS',
        address: fullAddress || '',
        city: city || '',
        postal_code: postalCode || '',
        director: '', // Filled if enriched or roles fetched
        website: website || '',
        email: item.epostadresse || '',
        phone: item.mobil || item.telefon || '',
        industry: item.naeringskode1?.beskrivelse || '',
        source: this.registryName,
        enrichment_status: (item.epostadresse || item.mobil) ? 'enriched' : 'pending'
      });
    }

    return leads;
  }
}

export const norwayConnector = new NorwayBrregConnector();
