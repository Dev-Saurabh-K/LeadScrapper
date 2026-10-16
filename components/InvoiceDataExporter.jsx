'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  Mail,
  Phone,
  Check,
  Star,
  Globe,
  Loader2,
  Send,
  X
} from 'lucide-react';
import MicrosoftExcelIcon from './MicrosoftExcelIcon';

export default function LeadDataExporter() {
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);

  // Email Dispatch States for this particular table & selected columns
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('saurabhkumar.sakr@gmail.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCustomNote, setEmailCustomNote] = useState('');
  const [alsoDownloadExcel, setAlsoDownloadExcel] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailResultMsg, setEmailResultMsg] = useState(null);

  // Scraped dataset state
  const [dataset, setDataset] = useState({
    fileName: 'Master_B2B_Leads.xlsx',
    totalRecords: 0,
    activeRecords: 0,
    inactiveRecords: 0,
    columns: [],
    industries: [],
    cities: [],
    records: []
  });

  // Filters state
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'
  const [contactPriorityFilter, setContactPriorityFilter] = useState('all'); // 'all' | 'p1_both' | 'p1_either' | 'p2_website'
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Columns to Export
  const [selectedColumns, setSelectedColumns] = useState([]);

  // Pagination & Export Config
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportFileName, setExportFileName] = useState('B2B_Exported_Leads.xlsx');

  // Priority metadata helper: Phone & Email (1st) -> Website (2nd) -> Rest (3rd)
  const getColumnPriorityMeta = (colName) => {
    const lower = colName.trim().toLowerCase();
    if (lower.includes('phone') || lower.includes('mobile')) {
      return { priority: 1, rank: 1 };
    }
    if (lower.includes('email')) {
      return { priority: 1, rank: 2 };
    }
    if (lower.includes('website') || lower.includes('url') || lower.includes('web')) {
      return { priority: 2, rank: 3 };
    }
    if (lower === 'company name' || lower === 'company_name' || lower === 'company') {
      return { priority: 3, rank: 0 };
    }
    if (lower.includes('director') || lower.includes('officer') || lower.includes('contact')) {
      return { priority: 3, rank: 4 };
    }
    if (lower.includes('registration') || lower.includes('gst')) {
      return { priority: 3, rank: 5 };
    }
    return { priority: 3, rank: 6 };
  };

  const sortColumnsByPriority = (columns) => {
    return [...columns].sort((a, b) => {
      const metaA = getColumnPriorityMeta(a);
      const metaB = getColumnPriorityMeta(b);
      if (metaA.rank !== metaB.rank) return metaA.rank - metaB.rank;
      return a.localeCompare(b);
    });
  };

  useEffect(() => {
    loadScrapedLeads();
  }, []);

  const applyDataset = (data) => {
    setDataset(data);
    setError(null);
    setCurrentPage(1);

    const validCols = (data.columns || []).filter(c => !c.startsWith('__'));
    const sortedCols = sortColumnsByPriority(validCols);

    // Pre-select priority fields
    const priorityKeywords = [
      'company', 'name', 'phone', 'email', 'website', 'director', 'officer',
      'contact', 'registration', 'gst', 'status', 'address', 'city', 'postal', 'industry'
    ];

    const defaultSelected = sortedCols.filter(col => {
      const lower = col.toLowerCase();
      return priorityKeywords.some(k => lower.includes(k));
    });

    setSelectedColumns(defaultSelected.length > 0 ? defaultSelected : sortedCols);
  };

  const loadScrapedLeads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/custom-export/master');
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load scraped leads dataset');
      }
      applyDataset(result.data);
    } catch (err) {
      console.error('[LeadExporter] Load error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleColumn = (colName) => {
    setSelectedColumns((prev) => {
      if (prev.includes(colName)) {
        return prev.filter(c => c !== colName);
      } else {
        return sortColumnsByPriority([...prev, colName]);
      }
    });
  };

  const handleSelectAllColumns = () => {
    const validCols = (dataset.columns || []).filter(c => !c.startsWith('__'));
    setSelectedColumns(sortColumnsByPriority(validCols));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleClearFilters = () => {
    setStatusFilter('active');
    setContactPriorityFilter('all');
    setSelectedIndustry('');
    setSelectedCity('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const getRecordField = (record, keyword) => {
    const key = Object.keys(record).find(k => k.toLowerCase().includes(keyword.toLowerCase()));
    return key && record[key] ? String(record[key]).trim() : '';
  };

  // Reactive filtering & Priority Sorting
  const filteredRecords = useMemo(() => {
    if (!dataset.records || dataset.records.length === 0) return [];

    const matched = dataset.records.filter((record) => {
      if (statusFilter === 'active') {
        if (record.__status !== 'Active') return false;
      } else if (statusFilter === 'inactive') {
        if (record.__status !== 'Inactive') return false;
      }

      const emailVal = getRecordField(record, 'email');
      const phoneVal = getRecordField(record, 'phone');
      const websiteVal = getRecordField(record, 'website');

      if (contactPriorityFilter === 'p1_both') {
        if (!emailVal || !phoneVal) return false;
      } else if (contactPriorityFilter === 'p1_either') {
        if (!emailVal && !phoneVal) return false;
      } else if (contactPriorityFilter === 'p2_website') {
        if (!websiteVal) return false;
      }

      if (selectedIndustry) {
        const indVal = getRecordField(record, 'industry');
        if (indVal !== selectedIndustry) return false;
      }

      if (selectedCity) {
        const cityVal = getRecordField(record, 'city');
        if (cityVal !== selectedCity) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const rowString = Object.values(record).join(' ').toLowerCase();
        if (!rowString.includes(query)) return false;
      }

      return true;
    });

    // Priority sort: Phone & Email (1st) -> Website (2nd) -> Rest (3rd)
    return matched.sort((a, b) => {
      const getScore = (rec) => {
        const hasEmail = Boolean(getRecordField(rec, 'email'));
        const hasPhone = Boolean(getRecordField(rec, 'phone'));
        const hasWebsite = Boolean(getRecordField(rec, 'website'));

        if (hasEmail && hasPhone) return 1;
        if (hasEmail || hasPhone) return 2;
        if (hasWebsite) return 3;
        return 4;
      };
      return getScore(a) - getScore(b);
    });
  }, [dataset.records, statusFilter, contactPriorityFilter, selectedIndustry, selectedCity, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, contactPriorityFilter, selectedIndustry, selectedCity, searchQuery]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const orderedSelectedColumns = useMemo(() => {
    return sortColumnsByPriority(selectedColumns);
  }, [selectedColumns]);

  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      alert('No matching records found to export with current filter settings.');
      return;
    }
    if (orderedSelectedColumns.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }

    setIsExporting(true);
    setExportSuccess(null);

    try {
      const res = await fetch('/api/custom-export/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: filteredRecords,
          selectedColumns: orderedSelectedColumns,
          fileName: exportFileName || 'B2B_Exported_Leads.xlsx'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error while generating Excel');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = exportFileName.endsWith('.xlsx') ? exportFileName : `${exportFileName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);

      setExportSuccess(`Exported ${filteredRecords.length} records (${orderedSelectedColumns.length} columns) to ${exportFileName}`);
      setTimeout(() => setExportSuccess(null), 5000);
    } catch (err) {
      console.error('[LeadExporter] Export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendCustomTableEmail = async (e) => {
    if (e) e.preventDefault();

    if (filteredRecords.length === 0) {
      alert('No matching records found to email with current filter settings.');
      return;
    }
    if (orderedSelectedColumns.length === 0) {
      alert('Please select at least one column for the table.');
      return;
    }
    if (!emailRecipient || !emailRecipient.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingEmail(true);
    setEmailResultMsg(null);

    try {
      const res = await fetch('/api/custom-export/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: filteredRecords,
          selectedColumns: orderedSelectedColumns,
          fileName: exportFileName || 'B2B_Exported_Leads.xlsx',
          recipient: emailRecipient,
          subject: emailSubject.trim() || undefined,
          customNote: emailCustomNote.trim(),
          attachExcel: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch email.');
      }

      setEmailResultMsg({
        type: 'success',
        text: `Table with ${orderedSelectedColumns.length} columns (${filteredRecords.length} leads) sent to ${emailRecipient}!`,
        messageId: data.messageId
      });

      // If user chose to also download Excel locally, trigger the download
      if (alsoDownloadExcel) {
        handleExportExcel();
      }

      setTimeout(() => {
        setShowEmailPanel(false);
      }, 4000);
    } catch (err) {
      console.error('[LeadExporter] Email send failed:', err);
      setEmailResultMsg({
        type: 'error',
        text: err.message
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const validColumns = useMemo(() => {
    const raw = (dataset.columns || []).filter(c => !c.startsWith('__'));
    return sortColumnsByPriority(raw);
  }, [dataset.columns]);

  const isFiltered = statusFilter !== 'active' || contactPriorityFilter !== 'all' || selectedIndustry || selectedCity || searchQuery;

  return (
    <div className="space-y-4 text-slate-900">
      {/* Sleek Minimal Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <MicrosoftExcelIcon className="h-4 w-4 shrink-0" />
            <h2 className="text-base font-bold text-black">Export Leads</h2>
            <span className="text-xs text-slate-500 font-mono">
              ({dataset.totalRecords} leads in database)
            </span>
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Select columns to export. Leads are sorted with Phone & Email first.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={exportFileName}
            onChange={(e) => setExportFileName(e.target.value)}
            placeholder="Export_File.xlsx"
            className="w-44 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-black placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
          />

          {/* Export to Excel (Download) */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting || filteredRecords.length === 0 || orderedSelectedColumns.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-40"
            title="Download Excel spreadsheet locally"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MicrosoftExcelIcon className="h-3.5 w-3.5" />}
            <span>Export ({filteredRecords.length})</span>
          </button>

          {/* Send Email of Table */}
          <button
            onClick={() => {
              setShowEmailPanel((prev) => !prev);
              if (!emailSubject) {
                setEmailSubject(`B2B Leads Table — ${filteredRecords.length} Companies (${orderedSelectedColumns.length} Columns)`);
              }
            }}
            disabled={filteredRecords.length === 0 || orderedSelectedColumns.length === 0}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-40 shadow-xs ${
              showEmailPanel
                ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-300'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
            }`}
            title="Send this table via email to recipient"
          >
            <Send className={`h-3.5 w-3.5 ${showEmailPanel ? 'text-white' : 'text-blue-600'}`} />
            <span>Email Table</span>
          </button>
        </div>
      </div>

      {/* Dispatch Custom Table via Email Panel */}
      {showEmailPanel && (
        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-1.5 border border-blue-100 text-blue-600">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-black">Send Table via Email</h3>
                <p className="text-[11px] text-slate-500">
                  Sends an email containing this exact table ({filteredRecords.length} rows, {orderedSelectedColumns.length} selected columns) with the customized Excel workbook attached.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEmailPanel(false)}
              className="rounded-lg p-1 text-slate-400 hover:text-black hover:bg-slate-100 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSendCustomTableEmail} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Recipient Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-black placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={`B2B Leads Table — ${filteredRecords.length} Companies`}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-black placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Custom Message / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={emailCustomNote}
                onChange={(e) => setEmailCustomNote(e.target.value)}
                placeholder="Hi Team, please find attached the filtered sales leads table with direct phone & email contacts..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-black placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoDownloadExcel}
                  onChange={(e) => setAlsoDownloadExcel(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="inline-flex items-center gap-1.5">
                  <MicrosoftExcelIcon className="h-3.5 w-3.5 shrink-0" />
                  Also download customized Excel file locally
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailPanel(false)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail || filteredRecords.length === 0 || orderedSelectedColumns.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending Table...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 fill-current" />
                      <span>Send Table via Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {emailResultMsg && (
            <div
              className={`rounded-xl border p-2.5 text-xs flex items-center gap-2 ${
                emailResultMsg.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {emailResultMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{emailResultMsg.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {exportSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-800 font-medium">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Filters Row (Unified Single Bar) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, phone, email, director..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-black placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
        >
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          <option value="all">All Statuses</option>
        </select>

        {/* Priority Filter */}
        <select
          value={contactPriorityFilter}
          onChange={(e) => setContactPriorityFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
        >
          <option value="all">All Contacts</option>
          <option value="p1_both">Has Phone & Email</option>
          <option value="p1_either">Has Phone or Email</option>
          <option value="p2_website">Has Website</option>
        </select>

        {/* Industry Filter */}
        {dataset.industries?.length > 0 && (
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none max-w-[160px] truncate"
          >
            <option value="">All Industries</option>
            {dataset.industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        )}

        {/* City Filter */}
        {dataset.cities?.length > 0 && (
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none max-w-[130px] truncate"
          >
            <option value="">All Cities</option>
            {dataset.cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        )}

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
            title="Reset filters"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}

        <button
          onClick={loadScrapedLeads}
          className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 transition"
          title="Refresh leads dataset"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Clean Column Selector (Minimal Pill Grid) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-xs shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black">Columns to Export:</span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({selectedColumns.length} of {validColumns.length} selected)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={handleSelectAllColumns}
              className="text-blue-600 hover:text-blue-800 font-medium transition"
            >
              Select All
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={handleDeselectAllColumns}
              className="text-slate-500 hover:text-black font-medium transition"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Clean, quiet column pill toggles */}
        <div className="flex flex-wrap gap-1.5">
          {validColumns.map((col) => {
            const isSelected = selectedColumns.includes(col);
            const meta = getColumnPriorityMeta(col);
            return (
              <button
                key={col}
                type="button"
                onClick={() => toggleColumn(col)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  isSelected
                    ? meta.priority === 1
                      ? 'bg-emerald-600 text-white border border-emerald-700 shadow-xs'
                      : meta.priority === 2
                      ? 'bg-blue-600 text-white border border-blue-700 shadow-xs'
                      : 'bg-slate-900 text-white border border-black shadow-xs'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-black hover:bg-slate-200/60'
                }`}
              >
                {isSelected ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <span className="h-3 w-3 shrink-0 rounded-xs border border-slate-300 inline-block bg-white" />
                )}
                <span>{col}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clean Live Preview Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto max-h-[460px]">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-xs font-medium">No company records match your current filters.</p>
              {isFiltered && (
                <button
                  onClick={handleClearFilters}
                  className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : orderedSelectedColumns.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-xs font-medium">No columns selected for export.</p>
              <button
                onClick={handleSelectAllColumns}
                className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
              >
                Select all columns
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center text-slate-400 font-normal">#</th>
                  {orderedSelectedColumns.map((col) => {
                    const meta = getColumnPriorityMeta(col);
                    return (
                      <th
                        key={col}
                        className={`px-3.5 py-2.5 whitespace-nowrap ${
                          meta.priority === 1
                            ? 'text-emerald-700 font-bold'
                            : meta.priority === 2
                            ? 'text-blue-700 font-bold'
                            : 'text-black font-semibold'
                        }`}
                      >
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((row, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={row.__rowId || idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                        {rowNumber}
                      </td>
                      {orderedSelectedColumns.map((col) => {
                        const val = row[col];
                        const lowerCol = col.toLowerCase();

                        // Phone
                        if (lowerCol.includes('phone') || lowerCol.includes('mobile')) {
                          return (
                            <td key={col} className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px]">
                              {val ? (
                                <span className="text-emerald-700 font-semibold">{val}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        }

                        // Email
                        if (lowerCol.includes('email')) {
                          return (
                            <td key={col} className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px]">
                              {val ? (
                                <a
                                  href={`mailto:${val}`}
                                  className="text-emerald-700 hover:underline font-semibold"
                                >
                                  {val}
                                </a>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        }

                        // Website
                        if ((lowerCol.includes('website') || lowerCol.includes('url')) && val) {
                          return (
                            <td key={col} className="px-3.5 py-2 whitespace-nowrap">
                              <a
                                href={val.startsWith('http') ? val : `https://${val}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline hover:text-blue-800"
                              >
                                <span className="truncate max-w-[150px]">{val.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            </td>
                          );
                        }

                        // Status
                        if (lowerCol.includes('status')) {
                          const isInactive = (val || '').toLowerCase().includes('inactive') ||
                            (val || '').toLowerCase().includes('dissolved') ||
                            row.__status === 'Inactive';
                          return (
                            <td key={col} className="px-3.5 py-2 whitespace-nowrap">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                  isInactive
                                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                }`}
                              >
                                {val || (isInactive ? 'Inactive' : 'Active')}
                              </span>
                            </td>
                          );
                        }

                        // Default
                        return (
                          <td key={col} className="px-3.5 py-2 whitespace-nowrap text-slate-800">
                            {val !== undefined && val !== null && String(val).trim() !== '' ? (
                              String(val)
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Clean Table Pagination Footer */}
        {filteredRecords.length > 0 && orderedSelectedColumns.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-500 ml-1">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded text-slate-500 hover:text-black hover:bg-slate-200/60 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-[11px] text-slate-700 px-1 font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-slate-500 hover:text-black hover:bg-slate-200/60 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
