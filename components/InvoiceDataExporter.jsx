'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
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
  Loader2
} from 'lucide-react';

export default function LeadDataExporter() {
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);

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

  const validColumns = useMemo(() => {
    const raw = (dataset.columns || []).filter(c => !c.startsWith('__'));
    return sortColumnsByPriority(raw);
  }, [dataset.columns]);

  const isFiltered = statusFilter !== 'active' || contactPriorityFilter !== 'all' || selectedIndustry || selectedCity || searchQuery;

  return (
    <div className="space-y-4">
      {/* Sleek Minimal Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">Export Leads</h2>
            <span className="text-xs text-slate-500 font-mono">
              ({dataset.totalRecords} leads in database)
            </span>
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select columns to export. Leads are sorted with Phone & Email first.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={exportFileName}
            onChange={(e) => setExportFileName(e.target.value)}
            placeholder="Export_File.xlsx"
            className="w-48 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleExportExcel}
            disabled={isExporting || filteredRecords.length === 0 || orderedSelectedColumns.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>Export ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {exportSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Filters Row (Unified Single Bar) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-slate-900/40 p-2.5 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, phone, email, director..."
            className="w-full rounded-lg border border-white/10 bg-slate-950/70 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
        >
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          <option value="all">All Statuses</option>
        </select>

        {/* Priority Filter */}
        <select
          value={contactPriorityFilter}
          onChange={(e) => setContactPriorityFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
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
            className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none max-w-[160px] truncate"
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
            className="rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none max-w-[130px] truncate"
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
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-slate-400 hover:text-white transition"
            title="Reset filters"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}

        <button
          onClick={loadScrapedLeads}
          className="rounded-lg border border-white/5 bg-slate-950/70 p-1.5 text-slate-400 hover:text-slate-200 transition"
          title="Refresh leads dataset"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Clean Column Selector (Minimal Pill Grid) */}
      <div className="rounded-xl border border-white/5 bg-slate-900/30 p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-300">Columns to Export:</span>
            <span className="text-[11px] text-slate-500 font-mono">
              ({selectedColumns.length} of {validColumns.length} selected)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={handleSelectAllColumns}
              className="text-slate-400 hover:text-slate-200 transition"
            >
              Select All
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={handleDeselectAllColumns}
              className="text-slate-400 hover:text-slate-200 transition"
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
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : meta.priority === 2
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-200 border border-white/10'
                    : 'bg-slate-950/40 text-slate-500 border border-white/5 hover:border-white/10 hover:text-slate-400'
                }`}
              >
                {isSelected ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <span className="h-3 w-3 shrink-0 rounded-xs border border-slate-700 inline-block" />
                )}
                <span>{col}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clean Live Preview Table */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-900/40 shadow-xl">
        <div className="overflow-x-auto max-h-[460px]">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs font-medium">No company records match your current filters.</p>
              {isFiltered && (
                <button
                  onClick={handleClearFilters}
                  className="mt-2 text-xs text-blue-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : orderedSelectedColumns.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-xs font-medium">No columns selected for export.</p>
              <button
                onClick={handleSelectAllColumns}
                className="mt-2 text-xs text-blue-400 hover:underline"
              >
                Select all columns
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-white/5 text-[11px] font-semibold text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center text-slate-500 font-normal">#</th>
                  {orderedSelectedColumns.map((col) => {
                    const meta = getColumnPriorityMeta(col);
                    return (
                      <th
                        key={col}
                        className={`px-3.5 py-2.5 whitespace-nowrap ${
                          meta.priority === 1
                            ? 'text-emerald-400 font-semibold'
                            : meta.priority === 2
                            ? 'text-cyan-400 font-semibold'
                            : ''
                        }`}
                      >
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {paginatedRecords.map((row, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={row.__rowId || idx}
                      className="hover:bg-slate-800/25 transition-colors"
                    >
                      <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-500">
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
                                <span className="text-emerald-300 font-medium">{val}</span>
                              ) : (
                                <span className="text-slate-600">—</span>
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
                                  className="text-emerald-300 hover:underline"
                                >
                                  {val}
                                </a>
                              ) : (
                                <span className="text-slate-600">—</span>
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
                                className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
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
                                className={`text-[11px] font-medium ${
                                  isInactive ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {val || (isInactive ? 'Inactive' : 'Active')}
                              </span>
                            </td>
                          );
                        }

                        // Default
                        return (
                          <td key={col} className="px-3.5 py-2 whitespace-nowrap text-slate-300">
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

        {/* Clean Table Pagination Footer */}
        {filteredRecords.length > 0 && orderedSelectedColumns.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/5 bg-slate-950/60 px-4 py-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded border border-white/10 bg-slate-900 px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none"
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
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-[11px] text-slate-400 px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
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
