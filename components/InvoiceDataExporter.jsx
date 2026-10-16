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
  Loader2
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

  // Step 2: Filters state (Mockup Default: Active Companies Only)
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'
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

  // Load scraped master excel on initial mount
  useEffect(() => {
    loadMasterLeads();
  }, []);

  const applyDataset = (data) => {
    setDataset(data);
    setError(null);
    setCurrentPage(1);

    // Filter out internal metadata keys
    const validColumns = (data.columns || []).filter(c => !c.startsWith('__'));

    // Intelligent default selection matching the mockup
    const priorityKeywords = [
      'company', 'name', 'registration', 'gst', 'director', 'officer',
      'contact', 'phone', 'email', 'address', 'city', 'postal', 'pincode',
      'industry', 'website', 'status'
    ];

    const defaultSelected = validColumns.filter(col => {
      const lower = col.toLowerCase();
      return priorityKeywords.some(keyword => lower.includes(keyword));
    });

    setSelectedColumns(defaultSelected.length > 0 ? defaultSelected : validColumns);
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
        return [...prev, colName];
      }
    });
  };

  // Select all valid columns
  const handleSelectAllColumns = () => {
    const validColumns = (dataset.columns || []).filter(c => !c.startsWith('__'));
    setSelectedColumns(validColumns);
  };

  // Deselect all columns
  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Clear all filters back to mockup defaults
  const handleClearFilters = () => {
    setStatusFilter('active');
    setSelectedIndustry('');
    setSelectedCity('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Reactive filtering
  const filteredRecords = useMemo(() => {
    if (!dataset.records || dataset.records.length === 0) return [];

    return dataset.records.filter((record) => {
      // 1. Status Filter (Active, Inactive, All)
      if (statusFilter === 'active') {
        if (record.__status !== 'Active') return false;
      } else if (statusFilter === 'inactive') {
        if (record.__status !== 'Inactive') return false;
      }

      // 2. Industry Filter
      if (selectedIndustry) {
        const indKey = Object.keys(record).find(k => k.toLowerCase().includes('industry'));
        const val = indKey ? record[indKey] : '';
        if (val !== selectedIndustry) return false;
      }

      // 3. City Filter
      if (selectedCity) {
        const cityKey = Object.keys(record).find(k => k.toLowerCase().includes('city'));
        const val = cityKey ? record[cityKey] : '';
        if (val !== selectedCity) return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const rowString = Object.values(record).join(' ').toLowerCase();
        if (!rowString.includes(query)) return false;
      }

      return true;
    });
  }, [dataset.records, statusFilter, selectedIndustry, selectedCity, searchQuery]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedIndustry, selectedCity, searchQuery]);

  // Paginated records for table preview
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Download filtered Excel
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      alert('No matching records found to export with the current filter settings.');
      return;
    }
    if (selectedColumns.length === 0) {
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
          selectedColumns,
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

      setExportSuccess(`Successfully downloaded ${filteredRecords.length} records with ${selectedColumns.length} customized columns!`);
      setTimeout(() => setExportSuccess(null), 6000);
    } catch (err) {
      console.error('[InvoiceExporter] Export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const validColumns = (dataset.columns || []).filter(c => !c.startsWith('__'));

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
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  B2B Newspaper Invoice Data Exporter
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
                  Production Tool
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Auto-loads your scraped Master Excel leads or accepts custom spreadsheets. Select invoice columns, apply business filters, and export tailored Excel workbooks.
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
        {/* Step 1: Upload / Load Master Excel (Mockup Step 1) */}
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
              Auto-synced with <code className="text-blue-400 font-mono">exports/Master_B2B_Leads.xlsx</code> ({dataset.totalRecords} leads). Or drop an external Excel file.
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
              <span className="text-slate-300 font-medium truncate max-w-[180px]">
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

        {/* Step 2: Filter Options (Mockup Step 2) */}
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
              {/* Status Radio Filter (Active Companies Only default) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
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
                    placeholder="Search by company name, registration number, director..."
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
            <span className="text-[11px] text-slate-500">Live preview updates automatically</span>
          </div>
        </div>
      </div>

      {/* Step 3: Select Fields to Export (Mockup Step 3) */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">
              3
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Select Fields to Export</h3>
              <p className="text-xs text-slate-400">
                Choose the exact columns required for your newspaper invoice or CRM export
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

        {/* Column Toggle Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {validColumns.map((col) => {
            const isSelected = selectedColumns.includes(col);
            return (
              <button
                key={col}
                type="button"
                onClick={() => toggleColumn(col)}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition-all border ${
                  isSelected
                    ? 'border-blue-500/40 bg-blue-500/15 text-white shadow-xs shadow-blue-500/10'
                    : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-white/10'
                }`}
              >
                <span className="truncate pr-1">{col}</span>
                <span
                  className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-blue-500 text-white'
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

      {/* Step 4: Preview & Export (Mockup Step 4) */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">
              4
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Preview & Export</h3>
              <p className="text-xs text-slate-400">
                Live interactive data preview showing only your selected fields
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
              disabled={isExporting || filteredRecords.length === 0 || selectedColumns.length === 0}
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

        {/* KPI Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="text-[11px] font-medium text-slate-400">Total in File</span>
            <p className="mt-1 text-lg font-bold font-mono text-white">{dataset.totalRecords}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="text-[11px] font-medium text-emerald-400">Active Companies</span>
            <p className="mt-1 text-lg font-bold font-mono text-emerald-300">{dataset.activeRecords}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="text-[11px] font-medium text-blue-400">Filtered Matches</span>
            <p className="mt-1 text-lg font-bold font-mono text-blue-300">{filteredRecords.length}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="text-[11px] font-medium text-indigo-400">Selected Fields</span>
            <p className="mt-1 text-lg font-bold font-mono text-indigo-300">{selectedColumns.length}</p>
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
            ) : selectedColumns.length === 0 ? (
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
                    {selectedColumns.map((col) => (
                      <th key={col} className="px-4 py-3 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
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
                        {selectedColumns.map((col) => {
                          const val = row[col];
                          const lowerCol = col.toLowerCase();

                          // Format status badge
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

                          // Format Website URL
                          if (lowerCol.includes('website') && val) {
                            return (
                              <td key={col} className="px-4 py-2.5 whitespace-nowrap">
                                <a
                                  href={val.startsWith('http') ? val : `https://${val}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                                >
                                  <span className="truncate max-w-[160px]">{val}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </td>
                            );
                          }

                          // Format Email
                          if (lowerCol.includes('email') && val) {
                            return (
                              <td key={col} className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px]">
                                <a
                                  href={`mailto:${val}`}
                                  className="inline-flex items-center gap-1 text-slate-300 hover:text-white hover:underline"
                                >
                                  <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                                  <span>{val}</span>
                                </a>
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
          {filteredRecords.length > 0 && selectedColumns.length > 0 && (
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
