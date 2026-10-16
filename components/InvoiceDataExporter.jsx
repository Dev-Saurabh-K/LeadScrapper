'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Filter,
  CheckSquare,
  Square,
  Download,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Building2,
  RotateCcw,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Check,
  FileCheck,
  Layers,
  Sparkles,
  Loader2,
  Globe,
  Zap,
  Star
} from 'lucide-react';

export default function InvoiceDataExporter() {
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);

  // Parsed dataset state
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

  // Step 2: Filters state
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'
  const [contactPriorityFilter, setContactPriorityFilter] = useState('all'); // 'all' | 'p1_both' | 'p1_either' | 'p2_website'
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Step 3: Selected Columns
  const [selectedColumns, setSelectedColumns] = useState([]);

  // Step 4: Preview Pagination & Export Config
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportFileName, setExportFileName] = useState('B2B_Newspaper_Invoice_Leads.xlsx');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Helper to score column priority: Phone & Email (1st) -> Website (2nd) -> Rest (3rd)
  const getColumnPriorityMeta = (colName) => {
    const lower = colName.toLowerCase();
    if (lower.includes('phone') || lower.includes('mobile')) {
      return { priority: 1, rank: 1, label: 'P1: Phone', tag: 'Direct Contact', color: 'emerald' };
    }
    if (lower.includes('email')) {
      return { priority: 1, rank: 2, label: 'P1: Email', tag: 'Direct Contact', color: 'emerald' };
    }
    if (lower.includes('website') || lower.includes('url') || lower.includes('web')) {
      return { priority: 2, rank: 3, label: 'P2: Website', tag: 'Web Presence', color: 'cyan' };
    }
    if (lower.includes('company') || lower === 'name') {
      return { priority: 3, rank: 0, label: 'Company', tag: 'Identifier', color: 'blue' };
    }
    if (lower.includes('director') || lower.includes('officer') || lower.includes('contact')) {
      return { priority: 3, rank: 4, label: 'Director', tag: 'Management', color: 'indigo' };
    }
    if (lower.includes('registration') || lower.includes('gst')) {
      return { priority: 3, rank: 5, label: 'Reg/GST', tag: 'Legal', color: 'slate' };
    }
    return { priority: 3, rank: 6, label: 'Detail', tag: 'Corporate', color: 'slate' };
  };

  const sortColumnsByPriority = (columns) => {
    return [...columns].sort((a, b) => {
      const metaA = getColumnPriorityMeta(a);
      const metaB = getColumnPriorityMeta(b);
      if (metaA.rank !== metaB.rank) return metaA.rank - metaB.rank;
      return a.localeCompare(b);
    });
  };

  // Load scraped master excel on initial mount
  useEffect(() => {
    loadMasterLeads();
  }, []);

  const applyDataset = (data) => {
    setDataset(data);
    setError(null);
    setCurrentPage(1);

    // Filter out internal metadata keys
    const validCols = (data.columns || []).filter(c => !c.startsWith('__'));
    const sortedCols = sortColumnsByPriority(validCols);

    // Pre-select priority columns first: Company Name, Phone, Email, Website, Director, Registration, Status, Address, City
    const priorityKeywords = [
      'company', 'name', 'phone', 'email', 'website', 'director', 'officer',
      'contact', 'registration', 'gst', 'status', 'address', 'city', 'postal', 'industry'
    ];

    const defaultSelected = sortedCols.filter(col => {
      const lower = col.toLowerCase();
      return priorityKeywords.some(keyword => lower.includes(keyword));
    });

    setSelectedColumns(defaultSelected.length > 0 ? defaultSelected : sortedCols);
  };

  const loadMasterLeads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/custom-export/master');
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load master scraped Excel leads');
      }
      applyDataset(result.data);
    } catch (err) {
      console.error('[InvoiceExporter] Failed to load master leads:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/custom-export/parse', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse uploaded Excel file');
      }
      applyDataset(result.data);
    } catch (err) {
      console.error('[InvoiceExporter] File parse error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Toggle single column selection
  const toggleColumn = (colName) => {
    setSelectedColumns((prev) => {
      if (prev.includes(colName)) {
        return prev.filter(c => c !== colName);
      } else {
        return sortColumnsByPriority([...prev, colName]);
      }
    });
  };

  // Select all valid columns
  const handleSelectAllColumns = () => {
    const validCols = (dataset.columns || []).filter(c => !c.startsWith('__'));
    setSelectedColumns(sortColumnsByPriority(validCols));
  };

  // Deselect all columns
  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Clear all filters back to defaults
  const handleClearFilters = () => {
    setStatusFilter('active');
    setContactPriorityFilter('all');
    setSelectedIndustry('');
    setSelectedCity('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Helper to extract field value by partial key match
  const getRecordField = (record, keyword) => {
    const key = Object.keys(record).find(k => k.toLowerCase().includes(keyword.toLowerCase()));
    return key && record[key] ? String(record[key]).trim() : '';
  };

  // Reactive filtering & Priority Sorting (Phone & Email 1st -> Website 2nd -> Rest 3rd)
  const filteredRecords = useMemo(() => {
    if (!dataset.records || dataset.records.length === 0) return [];

    // 1. Filter
    const matched = dataset.records.filter((record) => {
      // Status Filter (Active, Inactive, All)
      if (statusFilter === 'active') {
        if (record.__status !== 'Active') return false;
      } else if (statusFilter === 'inactive') {
        if (record.__status !== 'Inactive') return false;
      }

      const emailVal = getRecordField(record, 'email');
      const phoneVal = getRecordField(record, 'phone');
      const websiteVal = getRecordField(record, 'website');

      // Contact Priority Filter
      if (contactPriorityFilter === 'p1_both') {
        if (!emailVal || !phoneVal) return false;
      } else if (contactPriorityFilter === 'p1_either') {
        if (!emailVal && !phoneVal) return false;
      } else if (contactPriorityFilter === 'p2_website') {
        if (!websiteVal) return false;
      }

      // Industry Filter
      if (selectedIndustry) {
        const indVal = getRecordField(record, 'industry');
        if (indVal !== selectedIndustry) return false;
      }

      // City Filter
      if (selectedCity) {
        const cityVal = getRecordField(record, 'city');
        if (cityVal !== selectedCity) return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const rowString = Object.values(record).join(' ').toLowerCase();
        if (!rowString.includes(query)) return false;
      }

      return true;
    });

    // 2. Priority Sorting: Phone & Email (1st) -> Website (2nd) -> Rest (3rd)
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

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, contactPriorityFilter, selectedIndustry, selectedCity, searchQuery]);

  // Paginated records for table preview
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Columns sorted in priority order for display and export
  const orderedSelectedColumns = useMemo(() => {
    return sortColumnsByPriority(selectedColumns);
  }, [selectedColumns]);

  // Metric computations for priority badges
  const priorityStats = useMemo(() => {
    if (!dataset.records) return { p1Both: 0, p1Either: 0, p2Website: 0 };
    let p1Both = 0;
    let p1Either = 0;
    let p2Website = 0;

    dataset.records.forEach((r) => {
      const hasEmail = Boolean(getRecordField(r, 'email'));
      const hasPhone = Boolean(getRecordField(r, 'phone'));
      const hasWeb = Boolean(getRecordField(r, 'website'));

      if (hasEmail && hasPhone) p1Both++;
      if (hasEmail || hasPhone) p1Either++;
      if (hasWeb) p2Website++;
    });

    return { p1Both, p1Either, p2Website };
  }, [dataset.records]);

  // Download filtered Excel
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      alert('No matching records found to export with the current filter settings.');
      return;
    }
    if (orderedSelectedColumns.length === 0) {
      alert('Please select at least one field/column to export.');
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
          fileName: exportFileName || 'B2B_Newspaper_Invoice_Leads.xlsx'
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

      setExportSuccess(`Successfully exported ${filteredRecords.length} records prioritizing Phone, Email & Website into ${exportFileName}!`);
      setTimeout(() => setExportSuccess(null), 6000);
    } catch (err) {
      console.error('[InvoiceExporter] Export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const validColumns = useMemo(() => {
    const raw = (dataset.columns || []).filter(c => !c.startsWith('__'));
    return sortColumnsByPriority(raw);
  }, [dataset.columns]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-500 shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  B2B Newspaper Invoice Data Exporter
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/25 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-emerald-400" />
                  Priority 1: Phone & Email
                </span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-400 ring-1 ring-cyan-500/25">
                  Priority 2: Website
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Auto-loads your scraped Master Excel leads. Prioritizes <strong>Phone & Email</strong> first, <strong>Website</strong> second, and filters clean invoice records for export.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadMasterLeads}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-700/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
              title="Reload exports/Master_B2B_Leads.xlsx"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Reload Scraped Master</span>
            </button>
          </div>
        </div>

        {/* Priority Hierarchy Banner Strip */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-white/5 bg-slate-950/60 p-3 text-xs">
          <span className="font-semibold text-slate-300">Hierarchy:</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/30">
            <Phone className="h-3.5 w-3.5" />
            <Mail className="h-3.5 w-3.5" />
            <span>1st Priority: Phone & Email ID</span>
          </span>
          <span className="text-slate-600">→</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-300 border border-cyan-500/30">
            <Globe className="h-3.5 w-3.5" />
            <span>2nd Priority: Website</span>
          </span>
          <span className="text-slate-600">→</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400">
            <Building2 className="h-3.5 w-3.5" />
            <span>3rd Priority: Rest of Corporate Fields</span>
          </span>
        </div>

        {/* Success Alert */}
        {exportSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 2-Column Grid: Step 1 (Upload) & Step 2 (Filter Options) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Step 1: Upload / Load Master Excel */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">
                  1
                </span>
                <h3 className="text-sm font-semibold text-white">Upload / Load Master Excel</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {dataset.fileName}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Auto-synced with <code className="text-blue-400 font-mono">exports/Master_B2B_Leads.xlsx</code> ({dataset.totalRecords} leads). Or drop an external spreadsheet below.
            </p>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-white/10 bg-slate-950/40 hover:border-blue-500/40 hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-2">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium text-slate-200">
                Drag & drop your Excel (.xlsx, .xls) or .csv
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                or click to browse from your computer
              </p>
            </div>
          </div>

          {/* Dataset Status Summary Pill */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950/60 border border-white/5 p-3 text-xs">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300 font-medium truncate max-w-[170px]">
                {dataset.fileName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                {dataset.activeRecords} Active
              </span>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                {dataset.totalRecords} Total
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Filter Options */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">
                  2
                </span>
                <h3 className="text-sm font-semibold text-white">Filter Options</h3>
              </div>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/60 hover:bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition-all"
                title="Reset all filters to defaults"
              >
                <RotateCcw className="h-3 w-3 text-slate-400" />
                <span>Clear Filters</span>
              </button>
            </div>

            {/* Filter Controls Grid */}
            <div className="mt-4 space-y-4">
              {/* Status Radio Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Company Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'active', label: 'Active Companies Only' },
                    { id: 'inactive', label: 'Inactive Companies Only' },
                    { id: 'all', label: 'All Companies' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setStatusFilter(option.id)}
                      className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-medium transition-all border ${
                        statusFilter === option.id
                          ? 'border-blue-500/50 bg-blue-500/15 text-white shadow-sm shadow-blue-500/20'
                          : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-white/15'
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full border flex items-center justify-center ${
                          statusFilter === option.id
                            ? 'border-blue-400 bg-blue-400'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {statusFilter === option.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                        )}
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Contact Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Priority Outreach Filter</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {contactPriorityFilter === 'p1_both' && 'Phone + Email Filter Active'}
                    {contactPriorityFilter === 'p2_website' && 'Website Filter Active'}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: 'All Leads', icon: Building2, color: 'text-slate-400' },
                    { id: 'p1_both', label: 'P1: Phone & Email', icon: Star, color: 'text-emerald-400' },
                    { id: 'p1_either', label: 'Phone or Email', icon: Mail, color: 'text-emerald-400' },
                    { id: 'p2_website', label: 'P2: Has Website', icon: Globe, color: 'text-cyan-400' }
                  ].map((btn) => {
                    const Icon = btn.icon;
                    const isSelected = contactPriorityFilter === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setContactPriorityFilter(btn.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all border ${
                          isSelected
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-white shadow-xs'
                            : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-white/15'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${btn.color}`} />
                        <span className="truncate">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Industry & City Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Industry Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Industry Sector
                  </label>
                  <select
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">All Industries ({dataset.industries?.length || 0})</option>
                    {dataset.industries?.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    City Location
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">All Cities ({dataset.cities?.length || 0})</option>
                    {dataset.cities?.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Query */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Search Within Records
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company name, phone, email, director, registration number..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>Filtered Results: <strong className="text-white font-mono">{filteredRecords.length}</strong> of {dataset.totalRecords}</span>
            <span className="text-[11px] text-emerald-400 font-mono">Sorted with Phone & Email first</span>
          </div>
        </div>
      </div>

      {/* Step 3: Select Fields to Export */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">
              3
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Select Fields to Export</h3>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  Priority 1: Phone & Email
                </span>
                <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                  Priority 2: Website
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Columns will be formatted and exported in the selected priority sequence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-mono font-medium text-blue-400 border border-blue-500/20">
              Selected: {selectedColumns.length} / {validColumns.length}
            </span>
            <button
              onClick={handleSelectAllColumns}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition-all"
            >
              <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
              <span>Select All</span>
            </button>
            <button
              onClick={handleDeselectAllColumns}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition-all"
            >
              <Square className="h-3.5 w-3.5 text-slate-400" />
              <span>Deselect All</span>
            </button>
          </div>
        </div>

        {/* Column Toggle Grid - Ordered by Priority */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {validColumns.map((col) => {
            const isSelected = selectedColumns.includes(col);
            const meta = getColumnPriorityMeta(col);
            return (
              <button
                key={col}
                type="button"
                onClick={() => toggleColumn(col)}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition-all border ${
                  isSelected
                    ? meta.priority === 1
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-white shadow-xs shadow-emerald-500/10'
                      : meta.priority === 2
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-white shadow-xs shadow-cyan-500/10'
                      : 'border-blue-500/40 bg-blue-500/15 text-white shadow-xs shadow-blue-500/10'
                    : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-white/10'
                }`}
              >
                <div className="truncate pr-1">
                  <div className="truncate">{col}</div>
                  <div className="text-[10px] font-mono mt-0.5">
                    {meta.priority === 1 && (
                      <span className="text-emerald-400 font-semibold">Priority 1</span>
                    )}
                    {meta.priority === 2 && (
                      <span className="text-cyan-400 font-semibold">Priority 2</span>
                    )}
                    {meta.priority === 3 && (
                      <span className="text-slate-500">Priority 3</span>
                    )}
                  </div>
                </div>
                <span
                  className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-all ${
                    isSelected
                      ? meta.priority === 1
                        ? 'border-emerald-400 bg-emerald-500 text-white'
                        : meta.priority === 2
                        ? 'border-cyan-400 bg-cyan-500 text-white'
                        : 'border-blue-400 bg-blue-500 text-white'
                      : 'border-slate-700 bg-slate-900/60'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 4: Preview & Export */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">
              4
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Preview & Export</h3>
              <p className="text-xs text-slate-400">
                Sorted by priority (Phone & Email first, Website second). Showing only selected columns.
              </p>
            </div>
          </div>

          {/* Action Bar: Filename input + Export button */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="relative">
              <input
                type="text"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
                placeholder="Export_File_Name.xlsx"
                className="w-48 sm:w-60 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <button
              onClick={handleExportExcel}
              disabled={isExporting || filteredRecords.length === 0 || orderedSelectedColumns.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 border border-emerald-400/25 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Export to Excel</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* KPI Metrics Summary Strip with Priority 1 and Priority 2 Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="text-[11px] font-medium text-slate-400">Total in File</span>
            <p className="mt-1 text-lg font-bold font-mono text-white">{dataset.totalRecords}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="text-[11px] font-medium text-blue-400">Active Companies</span>
            <p className="mt-1 text-lg font-bold font-mono text-blue-300">{dataset.activeRecords}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
              <Star className="h-3 w-3 fill-emerald-400" />
              P1: Phone & Email
            </span>
            <p className="mt-1 text-lg font-bold font-mono text-emerald-300">{priorityStats.p1Both}</p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <span className="text-[11px] font-medium text-cyan-400 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              P2: Has Website
            </span>
            <p className="mt-1 text-lg font-bold font-mono text-cyan-300">{priorityStats.p2Website}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="text-[11px] font-medium text-indigo-400">Filtered Matches</span>
            <p className="mt-1 text-lg font-bold font-mono text-indigo-300">{filteredRecords.length}</p>
          </div>
        </div>

        {/* Live Preview Table */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 shadow-inner">
          <div className="overflow-x-auto max-h-[480px]">
            {filteredRecords.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                <p className="text-sm font-medium">No matching company records found</p>
                <p className="text-xs text-slate-500 mt-1">Try clearing your filters or choosing "All Companies"</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Filters</span>
                </button>
              </div>
            ) : orderedSelectedColumns.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Square className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                <p className="text-sm font-medium">No fields selected</p>
                <p className="text-xs text-slate-500 mt-1">Select at least one field from Step 3 above to preview and export</p>
                <button
                  onClick={handleSelectAllColumns}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Select All Fields</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-900 border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-3 w-12 text-center text-slate-500">#</th>
                    {orderedSelectedColumns.map((col) => {
                      const meta = getColumnPriorityMeta(col);
                      return (
                        <th
                          key={col}
                          className={`px-4 py-3 whitespace-nowrap ${
                            meta.priority === 1
                              ? 'bg-emerald-950/40 text-emerald-300 border-b-2 border-emerald-500/50'
                              : meta.priority === 2
                              ? 'bg-cyan-950/40 text-cyan-300 border-b-2 border-cyan-500/50'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {meta.priority === 1 && <Star className="h-3 w-3 fill-emerald-400 text-emerald-400 shrink-0" />}
                            {meta.priority === 2 && <Globe className="h-3 w-3 text-cyan-400 shrink-0" />}
                            <span>{col}</span>
                            {meta.priority === 1 && (
                              <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-mono text-emerald-300">
                                P1
                              </span>
                            )}
                            {meta.priority === 2 && (
                              <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[9px] font-mono text-cyan-300">
                                P2
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedRecords.map((row, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={row.__rowId || idx}
                        className="hover:bg-blue-600/5 transition-colors odd:bg-slate-900/20 even:bg-slate-950/40"
                      >
                        <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-500">
                          {rowNumber}
                        </td>
                        {orderedSelectedColumns.map((col) => {
                          const val = row[col];
                          const lowerCol = col.toLowerCase();

                          // Format Phone Column (Priority 1)
                          if (lowerCol.includes('phone') || lowerCol.includes('mobile')) {
                            return (
                              <td key={col} className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px]">
                                {val ? (
                                  <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
                                    <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span>{val}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                            );
                          }

                          // Format Email Column (Priority 1)
                          if (lowerCol.includes('email')) {
                            return (
                              <td key={col} className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px]">
                                {val ? (
                                  <a
                                    href={`mailto:${val}`}
                                    className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 hover:underline"
                                  >
                                    <Mail className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span>{val}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                            );
                          }

                          // Format Website URL (Priority 2)
                          if ((lowerCol.includes('website') || lowerCol.includes('url')) && val) {
                            return (
                              <td key={col} className="px-4 py-2.5 whitespace-nowrap">
                                <a
                                  href={val.startsWith('http') ? val : `https://${val}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
                                >
                                  <Globe className="h-3 w-3 text-cyan-400 shrink-0" />
                                  <span className="truncate max-w-[160px]">{val}</span>
                                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                                </a>
                              </td>
                            );
                          }

                          // Format Status badge
                          if (lowerCol.includes('status')) {
                            const isInactive = (val || '').toLowerCase().includes('inactive') ||
                              (val || '').toLowerCase().includes('dissolved') ||
                              row.__status === 'Inactive';
                            return (
                              <td key={col} className="px-4 py-2.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                    isInactive
                                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      isInactive ? 'bg-rose-400' : 'bg-emerald-400'
                                    }`}
                                  />
                                  <span>{val || (isInactive ? 'Inactive' : 'Active')}</span>
                                </span>
                              </td>
                            );
                          }

                          // Default rendering
                          return (
                            <td key={col} className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-200">
                              {val !== undefined && val !== null && String(val).trim() !== '' ? (
                                String(val)
                              ) : (
                                <span className="text-slate-600">—</span>
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

          {/* Pagination Controls */}
          {filteredRecords.length > 0 && orderedSelectedColumns.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="ml-2">
                  Showing{' '}
                  <strong className="text-white">
                    {(currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-white">
                    {Math.min(currentPage * pageSize, filteredRecords.length)}
                  </strong>{' '}
                  of <strong className="text-white">{filteredRecords.length}</strong> entries
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 disabled:opacity-30 hover:bg-slate-700/80"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <span className="font-mono text-xs text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 disabled:opacity-30 hover:bg-slate-700/80"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
