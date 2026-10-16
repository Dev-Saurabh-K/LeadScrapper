// lib/connectors/france_insee.js
// France Multi-Source Public Registry Connector
// Aggregates Recherche d'entreprises (api.gouv.fr) and BODACC Commercial Announcements (data.gouv.fr)
// Free Open Data APIs - No API key required (~7 req/sec)

import { BaseConnector } from './base.js';

export class FranceInseeConnector extends BaseConnector {
  constructor() {
    super('FR', 'France', "Recherche d'entreprises (api.gouv.fr & BODACC)", false);
  }

  async search(query = 'tech', limit = 20) {
    const totalLimit = Math.min(Math.max(limit, 1), 100);
    const halfLimit = Math.ceil(totalLimit / 2);
    const searchTerm = query && query.trim() ? query.trim() : 'commerce';
    const leads = [];
    const seenNames = new Set();
    const seenSiren = new Set();

    // 1. Primary Source: Recherche d'entreprises (api.gouv.fr)
    try {
      const urlGov = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(searchTerm)}&per_page=${halfLimit}`;
      const dataGov = await this.safeFetch(urlGov, {}, 2);
      const resultsGov = dataGov?.results || [];

      for (const item of resultsGov) {
        const name = (item.nom_complet || '').trim();
        const siren = (item.siren || '').trim();
        if (!name || seenNames.has(name.toLowerCase()) || (siren && seenSiren.has(siren))) continue;
        if (name) seenNames.add(name.toLowerCase());
        if (siren) seenSiren.add(siren);

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
          company_name: name,
          registration_number: siren,
          country: 'France',
          status: item.etat_administratif === 'A' ? 'Active' : 'Inactive',
          incorporation_date: item.date_creation || '',
          company_type: item.nature_juridique || 'SAS/SARL',
          address: fullAddress || '',
          city: city || 'Paris',
          postal_code: postalCode || '',
          director: director || '',
          website: '',
          email: '',
          phone: '',
          industry: item.activite_principale || item.section_activite_principale || 'Commerce',
          source: "api.gouv.fr",
          enrichment_status: 'pending'
        });
      }
    } catch (err) {
      console.warn(`[France Connector:api.gouv.fr] Failed (${err.message}). Continuing with BODACC source.`);
    }

    // 2. Secondary Source for Same Location: BODACC (Bulletin Officiel des Annonces Civiles et Commerciales)
    const remainingQuota = totalLimit - leads.length;
    if (remainingQuota > 0) {
      try {
        let urlBodacc = `https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?limit=${remainingQuota}`;
        if (searchTerm) {
          urlBodacc += `&where=search(commercant%2C%20%22${encodeURIComponent(searchTerm)}%22)`;
        }

        const dataBodacc = await this.safeFetch(urlBodacc, {}, 2);
        const resultsBodacc = dataBodacc?.results || [];

        for (const item of resultsBodacc) {
          const name = (item.commercant || '').trim();
          const siren = (item.registre?.[0] || '').replace(/\s+/g, '');
          if (!name || seenNames.has(name.toLowerCase()) || (siren && seenSiren.has(siren))) continue;
          if (name) seenNames.add(name.toLowerCase());
          if (siren) seenSiren.add(siren);

          const city = item.ville || 'Paris';
          const postalCode = item.cp || '';
          const department = item.departement_nom_officiel || '';
          const fullAddress = [city, postalCode, department, 'France'].filter(Boolean).join(', ');

          leads.push({
            company_name: name,
            registration_number: siren,
            country: 'France',
            status: 'Active',
            incorporation_date: item.dateparution || '',
            company_type: item.tribunal ? 'Société Commerciale' : 'SARL',
            address: fullAddress || '',
            city: city,
            postal_code: postalCode,
            director: '',
            website: '',
            email: '',
            phone: '',
            industry: item.familleavis_lib || item.typeavis_lib || 'Annonce Commerciale',
            source: 'BODACC Commercial Register',
            enrichment_status: 'pending'
          });

          if (leads.length >= totalLimit) break;
        }
      } catch (err) {
        console.warn(`[France Connector:BODACC] Failed (${err.message}).`);
      }
    }

    return leads.slice(0, totalLimit);
  }
}

export const franceConnector = new FranceInseeConnector();
