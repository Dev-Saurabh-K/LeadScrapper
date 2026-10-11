// lib/services/notifier.js
// Sends post-scrape email summary notifications via Nodemailer SMTP with optional Excel attachment

import nodemailer from 'nodemailer';
import { config } from '../config.js';
import fs from 'fs';

export class NotifierService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (config.smtp.isConfigured) {
      try {
        this.transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass
          }
        });
      } catch (err) {
        console.warn('[Notifier] SMTP configuration error:', err.message);
        this.transporter = null;
      }
    }
  }

  /**
   * Format job summary email text and HTML
   */
  formatSummaryMessage(jobStats, countries) {
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const countryList = countries && countries.length > 0 ? countries.join(', ') : 'All';

    const text = [
      `✅ Job finished at ${timeStr}`,
      `🌍 Countries: ${countryList}`,
      `📋 New leads added: ${jobStats.leadsCollected || 0}`,
      `⚠ Duplicates skipped: ${jobStats.duplicatesSkipped || 0}`,
      `❌ Errors: ${jobStats.errorsCount || 0} (see logs)`,
      `📁 Excel file updated: Master_B2B_Leads.xlsx`
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">🚀 B2B Lead Scraper — Job Summary</h2>
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 6px 0; font-size: 15px;"><strong>✅ Job finished at:</strong> ${timeStr}</p>
          <p style="margin: 6px 0; font-size: 15px;"><strong>🌍 Countries:</strong> ${countryList}</p>
          <p style="margin: 6px 0; font-size: 15px; color: #16a34a;"><strong>📋 New leads added:</strong> ${jobStats.leadsCollected || 0}</p>
          <p style="margin: 6px 0; font-size: 15px; color: #d97706;"><strong>⚠ Duplicates skipped:</strong> ${jobStats.duplicatesSkipped || 0}</p>
          <p style="margin: 6px 0; font-size: 15px; color: ${jobStats.errorsCount ? '#dc2626' : '#64748b'};"><strong>❌ Errors:</strong> ${jobStats.errorsCount || 0}</p>
          <p style="margin: 6px 0; font-size: 15px; color: #2563eb;"><strong>📁 Excel file updated:</strong> Master_B2B_Leads.xlsx (Attached)</p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Automated notification from your B2B Lead Scraping system.</p>
      </div>
    `;

    return { text, html, timeStr };
  }

  /**
   * Send the email notification
   * @param {object} jobStats - { leadsCollected, duplicatesSkipped, errorsCount }
   * @param {Array<string>} countries - list of countries scraped
   * @param {string|Buffer} excelAttachment - optional file path or buffer to attach
   */
  async sendJobSummary(jobStats, countries = [], excelAttachment = null) {
    if (!config.smtp.isConfigured) {
      console.log('[Notifier] SMTP not configured. Notification summary:');
      const { text } = this.formatSummaryMessage(jobStats, countries);
      console.log(text);
      return { sent: false, reason: 'SMTP not configured in .env' };
    }

    try {
      this.initTransporter();
      const { text, html } = this.formatSummaryMessage(jobStats, countries);
      const subject = `Scrape Job Complete — ${jobStats.leadsCollected || 0} new leads collected`;

      const attachments = [];
      if (excelAttachment) {
        if (Buffer.isBuffer(excelAttachment)) {
          attachments.push({
            filename: 'Master_B2B_Leads.xlsx',
            content: excelAttachment
          });
        } else if (typeof excelAttachment === 'string') {
          const safeExportsDir = path.join(process.cwd(), 'exports');
          const resolvedPath = path.resolve(excelAttachment);
          if (resolvedPath.startsWith(safeExportsDir) && fs.existsSync(resolvedPath)) {
            attachments.push({
              filename: 'Master_B2B_Leads.xlsx',
              path: resolvedPath
            });
          }
        }
      }

      const mailOptions = {
        from: config.smtp.from,
        to: config.smtp.recipient,
        subject: subject,
        text: text,
        html: html,
        attachments: attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Notifier] Job summary email successfully sent to ${config.smtp.recipient} (Message ID: ${info.messageId})`);
      return { sent: true, messageId: info.messageId, recipient: config.smtp.recipient };
    } catch (err) {
      console.error('[Notifier] Failed to send email summary:', err.message);
      return { sent: false, error: err.message };
    }
  }
}

export const notifier = new NotifierService();
