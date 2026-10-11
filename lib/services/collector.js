// lib/services/collector.js
// Central scraping orchestrator: executes country connectors, applies polite rate limits,
// performs de-duplication, executes website enrichment, exports Excel, and sends email summaries.

import { getConnector } from '../connectors/index.js';
import { normalizer } from './normalizer.js';
import { enrichment } from './enrichment.js';
import { exporter } from './exporter.js';
import { notifier } from './notifier.js';
import { db } from '../database.js';

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
   * @param {object} options - { countries: string[], query?: string, limit?: number, enrich?: boolean, delayMs?: number }
   * @param {function} onLog - callback for live streaming log updates: (entry) => void
   * @returns {Promise<object>} Job result
   */
  async runJob(options, onLog = null) {
    const {
      countries = ['NO', 'FR', 'SG', 'US'],
      query = '',
      limit = 20,
      enrich = false,
      delayMs = 1000
    } = options;

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

    appendLog('info', `Starting B2B Scrape Job [${jobId.slice(0, 8)}]`);
    appendLog('info', `Target Countries: ${countries.join(', ')} | Query: "${query || '*'}" | Limit per country: ${limit}`);

    // Create job record in DB
    await db.createJob({
      id: jobId,
      countries,
      status: 'running',
      leads_collected: 0,
      duplicates_skipped: 0,
      errors_count: 0,
      logs
    });

    let totalCollected = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;

    for (const country of countries) {
      appendLog('info', `--> Connecting to registry for [${country}]...`);
      const connector = getConnector(country);

      if (!connector) {
        appendLog('warn', `No connector found for country [${country}], skipping.`);
        totalErrors++;
        continue;
      }

      try {
        appendLog('info', `Fetching records from ${connector.registryName}...`);
        const rawRecords = await connector.search(query, limit);
        appendLog('info', `Received ${rawRecords.length} raw records from ${connector.countryName}.`);

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

            // 3. Optional Enrichment
            if (enrich && cleanLead.website) {
              appendLog('info', `Enriching website contacts for: ${cleanLead.company_name} (${cleanLead.website})`);
              const enrichResult = await enrichment.enrichLead(cleanLead);
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
            appendLog('warn', `Record validation error in ${connector.countryName}: ${err.message}`);
          }
        }

        appendLog('success', `[${connector.countryName}] Processed: ${countryCollected} new leads, ${countryDuplicates} duplicates skipped.`);

        // Polite delay between countries
        if (delayMs > 0) {
          await this.sleep(delayMs);
        }
      } catch (err) {
        totalErrors++;
        appendLog('error', `Failed querying ${connector.registryName}: ${err.message}`);
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

    // Step 6: Send Email Notification
    appendLog('info', 'Sending job summary email via SMTP...');
    try {
      const emailResult = await notifier.sendJobSummary(
        { leadsCollected: totalCollected, duplicatesSkipped: totalDuplicates, errorsCount: totalErrors },
        countries,
        excelResult?.buffer || excelResult?.filePath
      );
      if (emailResult.sent) {
        appendLog('success', `Job summary email dispatched to ${emailResult.recipient}.`);
      } else {
        appendLog('warn', `Email notification not sent: ${emailResult.reason || emailResult.error}`);
      }
    } catch (err) {
      appendLog('warn', `Email notification failed: ${err.message}`);
    }

    const summaryText = `Job finished. New leads: ${totalCollected}, Duplicates skipped: ${totalDuplicates}, Errors: ${totalErrors}`;
    appendLog('success', `✅ Scrape job complete! ${summaryText}`);

    // Update final job state
    const finishedJob = await db.updateJob(jobId, {
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
      countries,
      logs
    };
  }
}

export const collector = new CollectorService();
