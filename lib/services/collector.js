// lib/services/collector.js
// Central scraping orchestrator: executes Google Maps headless stealth scraper,
// performs de-duplication, executes website enrichment, exports Excel, and sends email summaries.

import { getConnector } from '../connectors/index.js';
import { normalizer } from './normalizer.js';
import { enrichment } from './enrichment.js';
import { exporter } from './exporter.js';
import { notifier } from './notifier.js';
import { db } from '../database.js';
import { config } from '../config.js';

export class CollectorService {
  /**
   * Sleep helper
   * @param {number} ms 
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Runs a complete scrape job
   * @param {object} options - { countries?: string[], query?: string, limit?: number, enrich?: boolean, delayMs?: number }
   * @param {function} onLog - callback for live streaming log updates: (entry) => void
   * @returns {Promise<object>} Job result
   */
  async runJob(options, onLog = null) {
    const {
      engine = 'MAPS',
      countries = ['MAPS'],
      query = '',
      role = '',
      industry = '',
      location = '',
      company = '',
      limit = 20,
      enrich = true,
      delayMs = 1000,
      notificationEmail = '',
      webhookUrl = ''
    } = options;

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const isLinkedIn = engine === 'LINKEDIN' || (Array.isArray(countries) && countries.includes('LINKEDIN'));
    const targetEngine = isLinkedIn ? 'LINKEDIN' : 'MAPS';
    const targetList = isLinkedIn ? ['LINKEDIN'] : (Array.isArray(countries) && countries.length > 0 ? countries : ['MAPS']);
    const jobId = crypto.randomUUID();
    const logs = [];

    const appendLog = (level, message) => {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message
      };
      logs.push(entry);
      if (typeof onLog === 'function') {
        try {
          onLog(entry);
        } catch {
          // ignore stream callback errors
        }
      }
    };

    if (isLinkedIn) {
      appendLog('info', `Starting LinkedIn Authless Leads Scrape Job [${jobId.slice(0, 8)}]`);
      const searchDesc = query || [role, industry, location, company].filter(Boolean).join(' · ') || 'Professionals';
      appendLog('info', `Target: "${searchDesc}" | Limit: ${safeLimit}`);
    } else {
      appendLog('info', `Starting Google Maps Hyper-Local Scrape Job [${jobId.slice(0, 8)}]`);
      appendLog('info', `Target Query: "${query || 'businesses near me'}" | Limit: ${safeLimit} | Website Contact Crawl: ${enrich ? 'Enabled' : 'Disabled'}`);
    }

    // Create job record in DB
    await db.createJob({
      id: jobId,
      countries: targetList,
      status: 'running',
      leads_collected: 0,
      duplicates_skipped: 0,
      errors_count: 0,
      logs
    });

    let totalCollected = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;

    for (const target of targetList) {
      const connector = getConnector(targetEngine);

      if (!connector) {
        appendLog('warn', `${targetEngine} connector unavailable, skipping.`);
        totalErrors++;
        continue;
      }

      try {
        let rawRecords = [];
        if (isLinkedIn) {
          appendLog('info', `Executing Search Engine X-Ray for LinkedIn profiles (Authless)...`);
          rawRecords = await connector.search({ role, industry, location, company, query }, safeLimit);
          appendLog('info', `Received ${rawRecords.length} live LinkedIn profiles.`);
        } else {
          appendLog('info', `Navigating Google Maps and querying: "${query || 'local businesses'}"...`);
          rawRecords = await connector.search(query, safeLimit);
          appendLog('info', `Received ${rawRecords.length} live business listings from Google Maps.`);
        }

        let countryCollected = 0;
        let countryDuplicates = 0;

        for (const raw of rawRecords) {
          try {
            // 1. Normalize
            const cleanLead = normalizer.normalizeLead(raw);

            // 2. Check for duplicate
            const dupCheck = await normalizer.checkDuplicate(cleanLead);
            if (dupCheck.isDuplicate) {
              countryDuplicates++;
              totalDuplicates++;
              continue;
            }

            // 3. Optional Website Contact Enrichment (for Google Maps businesses or LinkedIn company websites)
            const targetCrawlUrl = (cleanLead.website && !cleanLead.website.includes('linkedin.com'))
              ? cleanLead.website
              : (raw.company_domain || '');

            if (enrich && targetCrawlUrl && (!cleanLead.email || !cleanLead.phone)) {
              appendLog('info', `Crawling business website for direct contacts: ${cleanLead.company_name} (${targetCrawlUrl})`);
              const enrichResult = await enrichment.enrichLead({ ...cleanLead, website: targetCrawlUrl });
              if (enrichResult.email && !cleanLead.email) cleanLead.email = enrichResult.email;
              if (enrichResult.phone && !cleanLead.phone) cleanLead.phone = enrichResult.phone;
              cleanLead.enrichment_status = enrichResult.status;
            }

            // 4. Save to Database
            await db.insertLead(cleanLead);
            countryCollected++;
            totalCollected++;

            // Update live progress in job record periodically
            if (totalCollected % 5 === 0) {
              await db.updateJob(jobId, {
                leads_collected: totalCollected,
                duplicates_skipped: totalDuplicates,
                errors_count: totalErrors
              });
            }
          } catch (err) {
            totalErrors++;
            appendLog('warn', `Lead processing error for "${raw.company_name || raw.director || 'unknown'}": ${err.message}`);
          }
        }

        appendLog('success', `[${targetEngine}] Processed: ${countryCollected} new leads, ${countryDuplicates} duplicates skipped.`);

        if (delayMs > 0) {
          await this.sleep(delayMs);
        }
      } catch (err) {
        totalErrors++;
        appendLog('error', `Failed querying ${targetEngine}: ${err.message}`);
      }
    }

    // Step 5: Generate Master Excel File
    appendLog('info', 'Generating Master_B2B_Leads.xlsx workbook...');
    let excelResult = null;
    try {
      excelResult = await exporter.generateMasterExcel();
      appendLog('success', `Master_B2B_Leads.xlsx updated with ${excelResult.count} total leads.`);
    } catch (err) {
      appendLog('error', `Failed to generate Excel workbook: ${err.message}`);
    }

    // Step 6: Send Email Notification (only if user provided an optional recipient email)
    const targetEmail = (notificationEmail || options.notificationEmail || '').trim();
    if (targetEmail) {
      if (config.smtp.isConfigured) {
        appendLog('info', `Sending job summary email to ${targetEmail}...`);
        try {
          const emailResult = await notifier.sendJobSummary(
            { leadsCollected: totalCollected, duplicatesSkipped: totalDuplicates, errorsCount: totalErrors },
            targetList,
            excelResult?.buffer || excelResult?.filePath,
            targetEmail
          );
          if (emailResult.sent) {
            appendLog('success', `Job summary email dispatched to ${emailResult.recipient}.`);
          } else {
            appendLog('warn', `Email notification could not be sent: ${emailResult.reason || emailResult.error || 'Failed'}`);
          }
        } catch (err) {
          console.warn('[Collector] Email notification error:', err.message);
          appendLog('warn', `Email notification error: ${err.message}`);
        }
      } else {
        appendLog('info', 'Email recipient specified, but SMTP is not configured in .env.');
      }
    } else {
      appendLog('info', 'Auto-email skipped (no recipient specified). You can dispatch emails manually anytime from the Dispatch Email tab.');
    }

    // 6. Optional Outbound Webhook Notification
    if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
      try {
        appendLog('info', `Dispatching outbound webhook notification to ${webhookUrl}...`);
        const webhookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'leadscrape.completed',
            jobId,
            engine: targetEngine,
            leadsCollected: totalCollected,
            duplicatesSkipped: totalDuplicates,
            errorsCount: totalErrors,
            summary: `${isLinkedIn ? 'LinkedIn' : 'Google Maps'} scrape finished. New leads: ${totalCollected}, Duplicates skipped: ${totalDuplicates}, Errors: ${totalErrors}`,
            timestamp: new Date().toISOString()
          })
        });
        if (webhookRes.ok) {
          appendLog('success', `Outbound webhook dispatched successfully (HTTP ${webhookRes.status}).`);
        } else {
          appendLog('warn', `Outbound webhook returned HTTP ${webhookRes.status}.`);
        }
      } catch (webhookErr) {
        appendLog('warn', `Outbound webhook dispatch failed: ${webhookErr.message}`);
      }
    }

    const summaryText = `${isLinkedIn ? 'LinkedIn' : 'Google Maps'} scrape finished. New leads: ${totalCollected}, Duplicates skipped: ${totalDuplicates}, Errors: ${totalErrors}`;
    appendLog('success', `Scrape job complete! ${summaryText}`);

    // Update final job state
    await db.updateJob(jobId, {
      status: 'completed',
      leads_collected: totalCollected,
      duplicates_skipped: totalDuplicates,
      errors_count: totalErrors,
      finished_at: new Date().toISOString(),
      logs,
      summary: summaryText
    });

    return {
      jobId,
      status: 'completed',
      leadsCollected: totalCollected,
      duplicatesSkipped: totalDuplicates,
      errorsCount: totalErrors,
      countries: targetList,
      logs
    };
  }
}

export const collector = new CollectorService();
