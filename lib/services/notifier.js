// lib/services/notifier.js
// Sends post-scrape email summary notifications via Nodemailer SMTP with optional Excel attachment

import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { exporter } from './exporter.js';
import fs from 'fs';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatEmailCell(colName, val) {
  const lower = colName.toLowerCase();
  if (val === null || val === undefined || String(val).trim() === '') {
    return '<span style="color: #94a3b8;">—</span>';
  }
  const str = String(val).trim();
  const escaped = escapeHtml(str);

  if (lower.includes('email')) {
    return `<a href="mailto:${escaped}" style="color: #059669; font-weight: 600; text-decoration: none;">${escaped}</a>`;
  }
  if (lower.includes('website') || lower.includes('url')) {
    const url = str.startsWith('http') ? escaped : `https://${escaped}`;
    return `<a href="${url}" target="_blank" style="color: #0284c7; text-decoration: none;">${escaped.replace(/^https?:\/\//, '')}</a>`;
  }
  if (lower.includes('phone') || lower.includes('mobile')) {
    return `<span style="color: #059669; font-family: monospace; font-weight: 500;">${escaped}</span>`;
  }
  if (lower.includes('status')) {
    const isInactive = str.toLowerCase().includes('inactive') || str.toLowerCase().includes('dissolved');
    const color = isInactive ? '#dc2626' : '#059669';
    const bg = isInactive ? '#fee2e2' : '#d1fae5';
    return `<span style="background-color: ${bg}; color: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">${escaped}</span>`;
  }
  return escaped;
}

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

  /**
   * Send an email with a custom filtered table and attached custom Excel workbook
   */
  async sendCustomTableEmail({
    recipient,
    subject,
    customNote = '',
    rows = [],
    selectedColumns = [],
    fileName = 'B2B_Exported_Leads.xlsx',
    attachExcel = true
  }) {
    if (!config.smtp.isConfigured) {
      return { sent: false, reason: 'SMTP credentials not configured in .env' };
    }

    try {
      this.initTransporter();
      const targetRecipient = (recipient || config.smtp.recipient).trim();
      const timeStr = new Date().toLocaleString('en-GB');
      const safeFileName = (fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`).replace(/[^a-zA-Z0-9_.-]/g, '_');
      const finalSubject = subject || `B2B Leads Table — ${rows.length} Companies (${selectedColumns.length} Columns)`;

      // Generate customized Excel attachment buffer using the selected columns and filtered rows
      let excelBuffer = null;
      if (attachExcel) {
        excelBuffer = await exporter.generateCustomExcel({
          rows,
          selectedColumns,
          fileName: safeFileName
        });
      }

      // Format clean HTML preview table of the exact selected columns (up to 50 rows displayed in email body)
      const maxRowsInEmail = 50;
      const previewRows = rows.slice(0, maxRowsInEmail);
      const remainingRowsCount = rows.length - previewRows.length;

      const headerThs = selectedColumns.map(col =>
        `<th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background-color: #0f172a; color: #f8fafc; border-bottom: 2px solid #334155; white-space: nowrap;">${escapeHtml(col)}</th>`
      ).join('');

      const bodyTrs = previewRows.map((row, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const tds = selectedColumns.map(col => {
          const val = row[col];
          return `<td style="padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; vertical-align: middle;">${formatEmailCell(col, val)}</td>`;
        }).join('');
        return `<tr style="background-color: ${bg};">${tds}</tr>`;
      }).join('');

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background-color: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 18px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h2 style="margin: 0; font-size: 20px; color: #0f172a;">📊 B2B Leads Table Export</h2>
              <span style="font-size: 12px; background-color: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 9999px; font-weight: 600;">Custom Outreach Table</span>
            </div>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">Generated from B2B Lead Scraper — Filtered Table with Selected Columns</p>
          </div>

          ${customNote ? `
          <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin-bottom: 18px; border-radius: 4px;">
            <strong style="color: #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Message from Sender:</strong>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #1e293b; line-height: 1.5;">${escapeHtml(customNote).replace(/\n/g, '<br/>')}</p>
          </div>
          ` : ''}

          <!-- Summary Metric Cards -->
          <div style="display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Total Companies</div>
              <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px;">${rows.length}</div>
            </div>
            <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Selected Columns</div>
              <div style="font-size: 20px; font-weight: 700; color: #2563eb; margin-top: 2px;">${selectedColumns.length}</div>
            </div>
            <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Excel Attachment</div>
              <div style="font-size: 13px; font-weight: 600; color: #059669; margin-top: 4px; word-break: break-all;">${safeFileName}</div>
            </div>
          </div>

          <div style="margin-bottom: 12px; font-size: 12px; color: #64748b;">
            <strong>Columns included:</strong> ${selectedColumns.map(c => `<span style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #334155; margin-right: 4px;">${escapeHtml(c)}</span>`).join(' ')}
          </div>

          <!-- HTML Table -->
          <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 14px;">
            <table style="width: 100%; border-collapse: collapse; font-family: inherit;">
              <thead>
                <tr>${headerThs}</tr>
              </thead>
              <tbody>
                ${bodyTrs}
              </tbody>
            </table>
          </div>

          ${remainingRowsCount > 0 ? `
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; font-size: 12px; color: #64748b; margin-bottom: 18px;">
            Showing first 50 of ${rows.length} records in this email preview. All ${rows.length} records are in the attached <strong>${safeFileName}</strong>.
          </div>
          ` : ''}

          <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between;">
            <span>Generated on ${timeStr}</span>
            <span>B2B Lead Scraper Notification Service</span>
          </div>
        </div>
      `;

      const attachments = [];
      if (excelBuffer) {
        attachments.push({
          filename: safeFileName,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      }

      const mailOptions = {
        from: config.smtp.from,
        to: targetRecipient,
        subject: finalSubject,
        text: `B2B Leads Table Export — ${rows.length} companies with ${selectedColumns.length} selected columns: ${selectedColumns.join(', ')}.\nAttached: ${safeFileName}`,
        html: html,
        attachments: attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Notifier] Custom table email sent to ${targetRecipient} (ID: ${info.messageId})`);
      return {
        sent: true,
        messageId: info.messageId,
        recipient: targetRecipient,
        leadsCount: rows.length,
        columnsCount: selectedColumns.length
      };
    } catch (err) {
      console.error('[Notifier] Failed to send custom table email:', err.message);
      return { sent: false, error: err.message };
    }
  }
}

export const notifier = new NotifierService();
