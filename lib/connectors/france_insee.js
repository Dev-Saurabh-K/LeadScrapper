// lib/connectors/france_insee.js
// France Recherche Entreprises Connector (api.gouv.fr)
// Free JSON API - No API key required (~7 requests/second)

import { BaseConnector } from './base.js';

export class FranceInseeConnector extends BaseConnector {
  constructor() {
    super('FR', 'France', "Recherche d'entreprises (api.gouv.fr)", false);
  }

  async search(query = 'tech', limit = 20) {
    const size = Math.min(Math.max(limit, 1), 50);
    const searchTerm = query && query.trim() ? query.trim() : 'commerce';
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(searchTerm)}&per_page=${size}`;

    const data = await this.safeFetch(url);
    const results = data?.results || [];

    const leads = [];
    for (const item of results) {
      const siege = item.siege || {};
      const street = [siege.numero_voie, siege.type_voie, siege.nom_voie].filter(Boolean).join(' ') || siege.adresse || '';
      const postalCode = siege.code_postal || '';
      const city = siege.libelle_commune || '';
      const fullAddress = [street, postalCode, city, 'France'].filter(Boolean).join(', ');

      // Extract director / key officers
      let director = '';
      if (Array.isArray(item.dirigeants) && item.dirigeants.length > 0) {
        const d = item.dirigeants[0];
        const nameParts = [d.prenoms, d.nom || d.denomination].filter(Boolean).join(' ');
        director = d.qualite ? `${nameParts} (${d.qualite})` : nameParts;
      }

      leads.push({
        company_name: item.nom_complet || '',
        registration_number: item.siren || '',
        country: 'France',
        status: item.etat_administratif === 'A' ? 'Active' : 'Inactive',
        incorporation_date: item.date_creation || '',
        company_type: item.nature_juridique || 'SAS/SARL',
        address: fullAddress || '',
        city: city || '',
        postal_code: postalCode || '',
        director: director || '',
        website: '',
        email: '',
        phone: '',
        industry: item.activite_principale || item.section_activite_principale || '',
        source: this.registryName,
        enrichment_status: 'pending'
      });
    }

    return leads;
  }
}

export const franceConnector = new FranceInseeConnector();
