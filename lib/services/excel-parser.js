// lib/services/excel-parser.js
// Parses scraped Master_B2B_Leads.xlsx or uploaded Excel/CSV files and extracts structured records, columns, and metrics

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { db } from '../database.js';

export class ExcelParserService {
  constructor() {
    this.masterFilePath = path.join(process.cwd(), 'exports', 'Master_B2B_Leads.xlsx');
  }

  /**
   * Parse an uploaded binary Excel buffer
   * @param {Buffer|ArrayBuffer} buffer
   * @param {string} fileName
   */
  async parseBuffer(buffer, fileName = 'Uploaded_File.xlsx') {
    const workbook = new ExcelJS.Workbook();
    if (Buffer.isBuffer(buffer)) {
      await workbook.xlsx.load(buffer);
    } else {
      await workbook.xlsx.load(Buffer.from(buffer));
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 1) {
      throw new Error('The uploaded spreadsheet contains no worksheets or data.');
    }

    return this.extractFromWorksheet(worksheet, fileName);
  }

  /**
   * Load the current scraped Master Excel file from disk, or fallback to database
   */
  async loadMasterScrapedFile() {
    if (fs.existsSync(this.masterFilePath)) {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(this.masterFilePath);
        const worksheet = workbook.worksheets[0];
        if (worksheet && worksheet.rowCount > 1) {
          return this.extractFromWorksheet(worksheet, 'Master_B2B_Leads.xlsx');
        }
      } catch (err) {
        console.warn('[ExcelParser] Error reading Master_B2B_Leads.xlsx from disk, falling back to DB:', err.message);
      }
    }

    // Fallback: Query live database leads and structure into parsed format
    const leads = await db.getAllLeads({ limit: 50000 });
    return this.convertDatabaseLeadsToParsedFormat(leads, 'Master_B2B_Leads.xlsx');
  }

  /**
   * Extract rows, headers, and compute metrics from an ExcelJS Worksheet
   */
  extractFromWorksheet(worksheet, fileName) {
    const rawHeaders = [];
    const headerRow = worksheet.getRow(1);
    
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const val = cell.value ? String(cell.value).trim() : '';
      if (val) {
        rawHeaders.push({ col: colNumber, key: val });
      }
    });

    if (rawHeaders.length === 0) {
      throw new Error('No valid column headers found in row 1 of the spreadsheet.');
    }

    const records = [];
    const industriesSet = new Set();
    const citiesSet = new Set();
    let activeCount = 0;
    let inactiveCount = 0;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      // Skip completely empty rows
      if (!row || !row.hasValues) continue;

      const record = { __rowId: rowNumber - 1 };
      let hasAnyValue = false;

      rawHeaders.forEach(({ col, key }) => {
        const cell = row.getCell(col);
        let cellVal = cell.value;

        // Handle cell object formats (hyperlinks, formulas, dates)
        if (cellVal !== null && cellVal !== undefined) {
          if (typeof cellVal === 'object') {
            if (cellVal instanceof Date) {
              cellVal = cellVal.toISOString().split('T')[0];
            } else if (cellVal.text) {
              cellVal = String(cellVal.text).trim();
            } else if (cellVal.result) {
              cellVal = String(cellVal.result).trim();
            } else {
              cellVal = String(cellVal).trim();
            }
          } else {
            cellVal = String(cellVal).trim();
          }
        } else {
          cellVal = '';
        }

        record[key] = cellVal;
        if (cellVal !== '') hasAnyValue = true;
      });

      if (!hasAnyValue) continue;

      // Normalize status check
      const statusKey = Object.keys(record).find(k => k.toLowerCase() === 'status') || '';
      const statusVal = (record[statusKey] || '').toLowerCase();
      const isInactive = statusVal.includes('inactive') ||
        statusVal.includes('dissolved') ||
        statusVal.includes('deregistered') ||
        statusVal.includes('strike') ||
        statusVal.includes('liquidat');

      if (isInactive) {
        inactiveCount++;
        record.__status = 'Inactive';
      } else {
        activeCount++;
        record.__status = 'Active';
      }

      // Collect Industry facet
      const industryKey = Object.keys(record).find(k => k.toLowerCase().includes('industry')) || '';
      if (industryKey && record[industryKey]) {
        industriesSet.add(record[industryKey]);
      }

      // Collect City facet
      const cityKey = Object.keys(record).find(k => k.toLowerCase() === 'city') || '';
      if (cityKey && record[cityKey]) {
        citiesSet.add(record[cityKey]);
      }

      records.push(record);
    }

    return {
      fileName,
      totalRecords: records.length,
      activeRecords: activeCount,
      inactiveRecords: inactiveCount,
      columns: rawHeaders.map(h => h.key),
      industries: Array.from(industriesSet).sort(),
      cities: Array.from(citiesSet).sort(),
      records
    };
  }

  /**
   * Fallback: Convert raw database leads into the standard parsed format
   */
  convertDatabaseLeadsToParsedFormat(leads, fileName = 'Master_B2B_Leads.xlsx') {
    const columns = [
      'Company Name',
      'Registration Number',
      'Country',
      'Status',
      'Incorporation Date',
      'Company Type',
      'Address',
      'City',
      'Postal Code',
      'Director / Officers',
      'Website',
      'Email',
      'Phone',
      'Industry',
      'Source Registry',
      'Scraped Date'
    ];

    const industriesSet = new Set();
    const citiesSet = new Set();
    let activeCount = 0;
    let inactiveCount = 0;

    const records = leads.map((lead, idx) => {
      const statusVal = (lead.status || 'Active').trim();
      const isInactive = statusVal.toLowerCase().includes('inactive') ||
        statusVal.toLowerCase().includes('dissolved') ||
        statusVal.toLowerCase().includes('deregistered');

      if (isInactive) {
        inactiveCount++;
      } else {
        activeCount++;
      }

      if (lead.industry) industriesSet.add(lead.industry);
      if (lead.city) citiesSet.add(lead.city);

      let scrapedDate = '';
      if (lead.created_at) {
        scrapedDate = lead.created_at instanceof Date
          ? lead.created_at.toISOString().split('T')[0]
          : String(lead.created_at).slice(0, 10);
      }

      return {
        __rowId: idx + 1,
        __status: isInactive ? 'Inactive' : 'Active',
        'Company Name': lead.company_name || '',
        'Registration Number': lead.registration_number || '',
        'Country': lead.country || '',
        'Status': statusVal,
        'Incorporation Date': lead.incorporation_date || '',
        'Company Type': lead.company_type || '',
        'Address': lead.address || '',
        'City': lead.city || '',
        'Postal Code': lead.postal_code || '',
        'Director / Officers': lead.director || '',
        'Website': lead.website || '',
        'Email': lead.email || '',
        'Phone': lead.phone || '',
        'Industry': lead.industry || '',
        'Source Registry': lead.source || '',
        'Scraped Date': scrapedDate
      };
    });

    return {
      fileName,
      totalRecords: records.length,
      activeRecords: activeCount,
      inactiveRecords: inactiveCount,
      columns,
      industries: Array.from(industriesSet).sort(),
      cities: Array.from(citiesSet).sort(),
      records
    };
  }
}

export const excelParser = new ExcelParserService();
