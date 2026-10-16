// lib/services/normalizer.js
// Standardizes company records, cleans contact info, and performs de-duplication

import { LeadSchema } from '../models.js';
import { db } from '../database.js';
import { contactValidator } from './validator.js';

export class NormalizerService {
  /**
   * Clean and normalize raw company name
   * @param {string} rawName 
   * @returns {string}
   */
  normalizeCompanyName(rawName) {
    if (!rawName) return '';
    return rawName
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^["']+|["']+$/g, '');
  }

  /**
   * Clean, validate, and format phone number using ITU-T E.164 standard
   * @param {string} rawPhone 
   * @param {string} [country='']
   * @returns {string}
   */
  normalizePhone(rawPhone, country = '') {
    if (!rawPhone) return '';
    const res = contactValidator.validatePhone(rawPhone, country);
    return res.isValid ? (res.formatted || res.sanitized) : '';
  }

  /**
   * Validate and clean email address (strict RFC 5322 compliance + dummy/disposable filters)
   * @param {string} rawEmail 
   * @returns {string}
   */
  normalizeEmail(rawEmail) {
    if (!rawEmail) return '';
    const res = contactValidator.validateEmail(rawEmail);
    return res.isValid ? res.sanitized : '';
  }

  /**
   * Normalize and validate a lead record against schema
   * @param {object} rawLead 
   * @returns {object} validated and sanitized lead
   */
  normalizeLead(rawLead) {
    const sanitized = {
      company_name: this.normalizeCompanyName(rawLead.company_name),
      registration_number: (rawLead.registration_number || '').trim(),
      country: (rawLead.country || '').trim(),
      status: (rawLead.status || 'Active').trim(),
      incorporation_date: (rawLead.incorporation_date || '').trim(),
      company_type: (rawLead.company_type || '').trim(),
      address: (rawLead.address || '').trim(),
      city: (rawLead.city || '').trim(),
      postal_code: (rawLead.postal_code || '').trim(),
      director: (rawLead.director || '').trim(),
      website: (rawLead.website || '').trim(),
      email: this.normalizeEmail(rawLead.email),
      phone: this.normalizePhone(rawLead.phone, rawLead.country),
      industry: (rawLead.industry || '').trim(),
      source: rawLead.source || 'Registry API',
      enrichment_status: rawLead.enrichment_status || 'pending'
    };

    // Validate with Zod
    const result = LeadSchema.safeParse(sanitized);
    if (!result.success) {
      throw new Error(`Lead validation failed: ${result.error.errors.map(e => e.message).join(', ')}`);
    }

    return result.data;
  }

  /**
   * Check if a lead is a duplicate in the database
   * @param {object} lead 
   * @returns {Promise<{isDuplicate: boolean, existingId?: string, matchField?: string}>}
   */
  async checkDuplicate(lead) {
    return await db.findDuplicate(lead.country, lead.registration_number, lead.company_name);
  }
}

export const normalizer = new NormalizerService();
