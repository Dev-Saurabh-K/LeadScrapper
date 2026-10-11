// lib/services/exporter.js
// Exports leads into a professionally styled Master_B2B_Leads.xlsx workbook using ExcelJS

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { db } from '../database.js';
import { config } from '../config.js';

export class ExporterService {
  constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    this.fileName = 'Master_B2B_Leads.xlsx';
    this.filePath = path.join(this.exportDir, this.fileName);
    this.ensureExportDir();
  }

  ensureExportDir() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Generates the Master Excel Workbook from lead records
   * @param {Array<object>} leads - optional leads array; if omitted, queries all from database
   * @returns {Promise<{buffer: Buffer, filePath: string, count: number}>}
   */
  async generateMasterExcel(leads = null) {
    this.ensureExportDir();
    const leadList = leads || await db.getAllLeads();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'B2B Lead Scraper';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Master B2B Leads', {
      views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
    });

    // Define Columns
    worksheet.columns = [
      { header: 'Company Name', key: 'company_name', width: 32 },
      { header: 'Registration Number', key: 'registration_number', width: 22 },
      { header: 'Country', key: 'country', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Incorporation Date', key: 'incorporation_date', width: 18 },
      { header: 'Company Type', key: 'company_type', width: 24 },
      { header: 'Address', key: 'address', width: 38 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Postal Code', key: 'postal_code', width: 14 },
      { header: 'Director / Officers', key: 'director', width: 28 },
      { header: 'Website', key: 'website', width: 26 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Industry', key: 'industry', width: 34 },
      { header: 'Source Registry', key: 'source', width: 24 },
      { header: 'Scraped Date', key: 'created_at', width: 18 }
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate-800
      };
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        indent: 1
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
      };
    });

    // Populate Rows
    leadList.forEach((lead, index) => {
      const rowNumber = index + 2;
      const scrapedDate = lead.created_at ? lead.created_at.split('T')[0] : new Date().toISOString().split('T')[0];

      const row = worksheet.addRow({
        company_name: lead.company_name || '',
        registration_number: lead.registration_number || '',
        country: lead.country || '',
        status: lead.status || '',
        incorporation_date: lead.incorporation_date || '',
        company_type: lead.company_type || '',
        address: lead.address || '',
        city: lead.city || '',
        postal_code: lead.postal_code || '',
        director: lead.director || '',
        website: lead.website || '',
        email: lead.email || '',
        phone: lead.phone || '',
        industry: lead.industry || '',
        source: lead.source || '',
        created_at: scrapedDate
      });

      row.height = 22;

      // Alternating row background (zebra striping)
      const isEven = rowNumber % 2 === 0;
      const rowBgColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF'; // slate-50 vs white

      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor }
        };
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', indent: 1 };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Enable Auto-Filter on all columns
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 16 }
    };

    // Auto-fit Column Widths based on contents
    worksheet.columns.forEach((column) => {
      let maxLen = column.header ? column.header.length : 10;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const cellLen = cell.value ? String(cell.value).length : 0;
        if (cellLen > maxLen) {
          maxLen = cellLen;
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 12), 45);
    });

    // Write file to exports/Master_B2B_Leads.xlsx
    await workbook.xlsx.writeFile(this.filePath);

    // Generate in-memory buffer for streaming / email attachments
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      filePath: this.filePath,
      fileName: this.fileName,
      count: leadList.length
    };
  }
}

export const exporter = new ExporterService();
