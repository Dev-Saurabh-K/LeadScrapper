// lib/connectors/singapore_acra.js
// Singapore ACRA Public Registry Connector (data.gov.sg CKAN datastore API)
// Free JSON API - No API key required

import { BaseConnector } from './base.js';

export class SingaporeAcraConnector extends BaseConnector {
  constructor() {
    super('SG', 'Singapore', 'ACRA (data.gov.sg)', false);
    this.resourceId = 'd_8575e84912df3c28995b8e6e0e05205a';
  }

  async search(query = '', limit = 20) {
    const size = Math.min(Math.max(limit, 1), 100);
    let url = `https://data.gov.sg/api/action/datastore_search?resource_id=${this.resourceId}&limit=${size}`;
    if (query && query.trim()) {
      url += `&q=${encodeURIComponent(query.trim())}`;
    }

    const data = await this.safeFetch(url);
    const records = data?.result?.records || [];

    const leads = [];
    for (const item of records) {
      const streetParts = [item.block ? `Blk ${item.block}` : '', item.street_name, item.building_name !== 'na' ? item.building_name : ''].filter(Boolean);
      const street = streetParts.join(' ');
      const postal = item.postal_code && item.postal_code !== 'na' ? item.postal_code : '';
      const fullAddress = [street, postal ? `Singapore ${postal}` : 'Singapore'].filter(Boolean).join(', ');

      leads.push({
        company_name: item.entity_name || '',
        registration_number: item.uen || '',
        country: 'Singapore',
        status: item.entity_status_description || 'Live',
        incorporation_date: item.registration_incorporation_date && item.registration_incorporation_date !== 'na' ? item.registration_incorporation_date : '',
        company_type: item.company_type_description !== 'na' ? item.company_type_description : (item.entity_type_description || 'Private Limited'),
        address: fullAddress || '',
        city: 'Singapore',
        postal_code: postal || '',
        director: item.no_of_officers && item.no_of_officers !== 'na' ? `${item.no_of_officers} Officers Registered` : '',
        website: '',
        email: '',
        phone: '',
        industry: item.primary_ssic_description && item.primary_ssic_description !== 'na' ? item.primary_ssic_description : (item.primary_ssic_code || ''),
        source: this.registryName,
        enrichment_status: 'pending'
      });
    }

    return leads;
  }
}

export const singaporeConnector = new SingaporeAcraConnector();
