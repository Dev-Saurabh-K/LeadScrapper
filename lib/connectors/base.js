// lib/connectors/base.js
// Base connector class for all international registry scrapers

import { config } from '../config.js';

export class BaseConnector {
  /**
   * @param {string} code - Country 2-letter or standard code (e.g. 'NO', 'FR', 'SG', 'US', 'UK', 'CA', 'AU')
   * @param {string} countryName - Friendly country name (e.g. 'Norway', 'France')
   * @param {string} registryName - Official name of public registry
   * @param {boolean} requiresAuth - Whether an API key / registration is needed
   */
  constructor(code, countryName, registryName, requiresAuth = false) {
    this.code = code;
    this.countryName = countryName;
    this.registryName = registryName;
    this.requiresAuth = requiresAuth;
  }

  /**
   * Polite sleep utility
   * @param {number} ms 
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Standard polite HTTP GET with retry and backoff
   * @param {string} url 
   * @param {object} headers 
   * @param {number} retries 
   */
  async safeFetch(url, headers = {}, retries = 3) {
    const defaultHeaders = {
      'User-Agent': config.scraper.userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      ...headers
    };

    let attempt = 0;
    while (attempt < retries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.scraper.requestTimeoutMs);

        const response = await fetch(url, {
          method: 'GET',
          headers: defaultHeaders,
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.status === 429) {
          // Rate limit hit - polite exponential backoff
          const waitTime = Math.pow(2, attempt) * 1500;
          console.warn(`[Connector:${this.code}] Rate limit (429) on ${url}. Backing off ${waitTime}ms...`);
          await this.sleep(waitTime);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        if (attempt >= retries) {
          throw new Error(`[${this.code}] Failed to fetch from ${url} after ${retries} attempts: ${err.message}`);
        }
        await this.sleep(1000 * attempt);
      }
    }
  }

  /**
   * Standard polite HTTP POST with retry and backoff
   * @param {string} url 
   * @param {object|string} body 
   * @param {object} headers 
   * @param {number} retries 
   */
  async safePost(url, body = {}, headers = {}, retries = 3) {
    const defaultHeaders = {
      'User-Agent': config.scraper.userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      ...headers
    };

    const payload = typeof body === 'string' ? body : JSON.stringify(body);

    let attempt = 0;
    while (attempt < retries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.scraper.requestTimeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: defaultHeaders,
          body: payload,
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1500;
          console.warn(`[Connector:${this.code}] Rate limit (429) on POST ${url}. Backing off ${waitTime}ms...`);
          await this.sleep(waitTime);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        if (attempt >= retries) {
          throw new Error(`[${this.code}] Failed to POST ${url} after ${retries} attempts: ${err.message}`);
        }
        await this.sleep(1000 * attempt);
      }
    }
  }

  /**
   * Search registry for companies
   * @param {string} query - Search term / keyword / industry
   * @param {number} limit - Maximum records to fetch
   * @returns {Promise<Array<object>>} - Standardized lead objects
   */
  async search(query = '', limit = 20) {
    throw new Error(`search() must be implemented by subclass ${this.constructor.name}`);
  }
}
