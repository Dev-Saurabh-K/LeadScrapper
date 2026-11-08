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
    return String(rawName)
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
    if (!rawLead || typeof rawLead !== 'object') {
      throw new Error('Invalid lead: expected an object');
    }

    let incDate = '';
    if (rawLead.incorporation_date instanceof Date) {
      incDate = rawLead.incorporation_date.toISOString().slice(0, 10);
    } else {
      incDate = String(rawLead.incorporation_date ?? '').trim();
    }

    const sanitized = {
      company_name: this.normalizeCompanyName(rawLead.company_name),
      registration_number: String(rawLead.registration_number ?? '').trim(),
      country: String(rawLead.country ?? '').trim(),
      status: String(rawLead.status ?? 'Active').trim() || 'Active',
      incorporation_date: incDate,
      company_type: String(rawLead.company_type ?? '').trim(),
      address: String(rawLead.address ?? '').trim(),
      city: String(rawLead.city ?? '').trim(),
      postal_code: String(rawLead.postal_code ?? '').trim(),
      director: String(rawLead.director ?? '').trim(),
      website: String(rawLead.website ?? '').trim(),
      email: this.normalizeEmail(rawLead.email),
      phone: this.normalizePhone(rawLead.phone, rawLead.country),
      industry: String(rawLead.industry ?? '').trim(),
      source: String(rawLead.source ?? 'Registry API').trim(),
      enrichment_status: String(rawLead.enrichment_status ?? 'pending').trim()
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
