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

      const targetRecipient = (recipient || config.smtp.recipient).trim();
      const mailOptions = {
        from: config.smtp.from,
        to: targetRecipient,
        subject: subject,
        text: text,
        html: html,
        attachments: attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Notifier] Job summary email successfully sent to ${targetRecipient} (Message ID: ${info.messageId})`);
      return { sent: true, messageId: info.messageId, recipient: targetRecipient };
    } catch (err) {
      console.error('[Notifier] Failed to send email summary:', err.message);
      return { sent: false, error: err.message };
    }
  }

  /**
   * Send a customized leads report email
   */
  async sendCustomEmail({
    recipient,
    subject,
    customNote = '',
    totalLeads = 0,
    countries = [],
    excelAttachment = null
  }) {
    if (!config.smtp.isConfigured) {
      return { sent: false, reason: 'SMTP credentials not configured in .env' };
    }

    try {
      this.initTransporter();
      const targetRecipient = (recipient || config.smtp.recipient).trim();
      const timeStr = new Date().toLocaleString('en-GB');
      const countryList = countries && countries.length > 0 ? countries.join(', ') : 'All Countries';
      const finalSubject = subject || `B2B Leads Report — ${totalLeads} Companies (Master_B2B_Leads.xlsx)`;

      const text = [
        `B2B LEAD SCRAPER — LEADS REPORT`,
        `Generated: ${timeStr}`,
        `Total Leads Included: ${totalLeads}`,
        `Countries: ${countryList}`,
        customNote ? `\nNote from Sender:\n${customNote}\n` : '',
        `Master_B2B_Leads.xlsx is attached to this email.`
      ].filter(Boolean).join('\n');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff; color: #1e293b;">
          <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">📊 B2B Sales Leads Report</h2>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">International Corporate Registry Extraction</p>
          </div>

          ${customNote ? `
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
            <strong style="color: #1e40af; font-size: 13px; text-transform: uppercase;">Message from Sender:</strong>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #1e293b; line-height: 1.5;">${customNote.replace(/\n/g, '<br/>')}</p>
          </div>
          ` : ''}

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">📅 Generated Date:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a; text-align: right;">${timeStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">📈 Total Companies:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #16a34a; text-align: right;">${totalLeads} leads</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">🌍 Coverage:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a; text-align: right;">${countryList}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">📁 Excel Workbook:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #2563eb; text-align: right;">Master_B2B_Leads.xlsx (Attached)</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
            The attached Excel spreadsheet contains normalized company leads with registration numbers, headquarters addresses, directors, industry codes, and verified website contact info (emails & phone numbers).
          </p>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #94a3b8; text-align: center;">
            Sent automatically via B2B Lead Scraper Notification Service.
          </div>
        </div>
      `;

      const attachments = [];
      if (excelAttachment) {
        if (Buffer.isBuffer(excelAttachment)) {
          attachments.push({ filename: 'Master_B2B_Leads.xlsx', content: excelAttachment });
        } else if (typeof excelAttachment === 'string') {
          const safeExportsDir = path.join(process.cwd(), 'exports');
          const resolvedPath = path.resolve(excelAttachment);
          if (resolvedPath.startsWith(safeExportsDir) && fs.existsSync(resolvedPath)) {
            attachments.push({ filename: 'Master_B2B_Leads.xlsx', path: resolvedPath });
          }
        }
      }

      const mailOptions = {
        from: config.smtp.from,
        to: targetRecipient,
        subject: finalSubject,
        text: text,
        html: html,
        attachments: attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Notifier] Custom email sent to ${targetRecipient} (ID: ${info.messageId})`);
      return {
        sent: true,
        messageId: info.messageId,
        recipient: targetRecipient,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('[Notifier] Failed to send custom email:', err.message);
      return { sent: false, error: err.message };
    }
  }
}

export const notifier = new NotifierService();
