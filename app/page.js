'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Globe,
  Globe2,
  Building2,
  Building,
  Mail,
  Phone,
  ExternalLink,
  RefreshCw,
  FileSpreadsheet,
  Terminal,
  Sliders,
  ShieldCheck,
  Database,
  Sparkles,
  Clock,
  Send,
  Eye,
  Check,
  Copy,
  Paperclip,
  X,
  BarChart3,
  Calendar,
  TrendingUp,
  FolderArchive,
  Layers,
  ArrowUpRight,
  Shield,
  Zap,
  ChevronRight,
  Info,
  Star
} from 'lucide-react';
import InvoiceDataExporter from '@/components/InvoiceDataExporter';

const COUNTRIES = [
  { code: 'NO', name: 'Norway', source: 'BRREG (data.brreg.no)', free: true },
  { code: 'FR', name: 'France', source: 'api.gouv.fr', free: true },
  { code: 'SG', name: 'Singapore', source: 'ACRA (data.gov.sg)', free: true },
  { code: 'US', name: 'United States', source: 'Socrata Open Data', free: true },
  { code: 'UK', name: 'United Kingdom', source: 'Companies House', free: false, note: 'Free Key' },
  { code: 'CA', name: 'Canada', source: 'Corporations Canada', free: true },
  { code: 'AU', name: 'Australia', source: 'ABN Lookup', free: false, note: 'Free GUID' }
];

function CountryFlag({ code, className = "h-3.5 w-5" }) {
  const c = code?.toUpperCase();
  if (c === 'NO' || c === 'NORWAY') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="22" height="16" fill="#BA0C2F" />
        <path d="M0 8h22M7 0v16" stroke="#fff" strokeWidth="4" />
        <path d="M0 8h22M7 0v16" stroke="#00205B" strokeWidth="2" />
      </svg>
    );
  }
  if (c === 'FR' || c === 'FRANCE') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="7.33" height="16" fill="#002654" />
        <rect x="7.33" width="7.34" height="16" fill="#fff" />
        <rect x="14.67" width="7.33" height="16" fill="#ED2939" />
      </svg>
    );
  }
  if (c === 'SG' || c === 'SINGAPORE') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="22" height="8" fill="#ED2939" />
        <rect y="8" width="22" height="8" fill="#fff" />
        <circle cx="4.5" cy="4" r="2.5" fill="#fff" />
        <circle cx="5.2" cy="4" r="2.2" fill="#ED2939" />
      </svg>
    );
  }
  if (c === 'US' || c === 'UNITED STATES' || c === 'USA') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="22" height="16" fill="#B22234" />
        <path d="M0 2.4h22M0 4.8h22M0 7.2h22M0 9.6h22M0 12h22M0 14.4h22" stroke="#fff" strokeWidth="1.2" />
        <rect width="9" height="8.4" fill="#3C3B6E" />
        <circle cx="4.5" cy="4.2" r="1.5" fill="#fff" opacity="0.9" />
      </svg>
    );
  }
  if (c === 'UK' || c === 'GB' || c === 'UNITED KINGDOM') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="22" height="16" fill="#012169" />
        <path d="M0 0l22 16M22 0L0 16" stroke="#fff" strokeWidth="3" />
        <path d="M0 0l22 16M22 0L0 16" stroke="#C8102E" strokeWidth="1.5" />
        <path d="M11 0v16M0 8h22" stroke="#fff" strokeWidth="5" />
        <path d="M11 0v16M0 8h22" stroke="#C8102E" strokeWidth="3" />
      </svg>
    );
  }
  if (c === 'CA' || c === 'CANADA') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="5.5" height="16" fill="#FF0000" />
        <rect x="5.5" width="11" height="16" fill="#fff" />
        <rect x="16.5" width="5.5" height="16" fill="#FF0000" />
        <path d="M11 3.5l1 2 2-.5-1 1.8 1.5 1.2-2 .5.5 1.8-1.5-1.2-1.5 1.2.5-1.8-2-.5 1.5-1.2-1-1.8 2 .5z" fill="#FF0000" />
      </svg>
    );
  }
  if (c === 'AU' || c === 'AUSTRALIA') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="22" height="16" fill="#00008B" />
        <rect width="10" height="8" fill="#012169" />
        <path d="M0 0l10 8M10 0L0 8" stroke="#fff" strokeWidth="1.5" />
        <path d="M5 0v8M0 4h10" stroke="#fff" strokeWidth="2.5" />
        <path d="M5 0v8M0 4h10" stroke="#C8102E" strokeWidth="1.5" />
        <circle cx="16" cy="4" r="1" fill="#fff" />
        <circle cx="18" cy="7" r="1" fill="#fff" />
        <circle cx="14" cy="9" r="1" fill="#fff" />
        <circle cx="17" cy="12" r="1" fill="#fff" />
      </svg>
    );
  }
  return <Globe className={`${className} text-slate-400`} />;
}

export default function Dashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState('explorer'); // 'explorer', 'scraper', 'history', 'api'

  // Data states
  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('');
  const [hasEmailFilter, setHasEmailFilter] = useState(false);
  const [hasPhoneFilter, setHasPhoneFilter] = useState(false);

  // Scraper form state
  const [selectedCountries, setSelectedCountries] = useState(['NO', 'FR', 'SG', 'US']);
  const [scraperQuery, setScraperQuery] = useState('technology');
  const [scraperLimit, setScraperLimit] = useState(10);
  const [enrichWebsite, setEnrichWebsite] = useState(true);
  const [delayMs, setDelayMs] = useState(1000);
  const [isScraping, setIsScraping] = useState(false);
  const [liveLogs, setLiveLogs] = useState([]);
  const [jobSummary, setJobSummary] = useState(null);
  const logsEndRef = useRef(null);

  // Dedicated Email Dispatch UI states
  const [emailRecipient, setEmailRecipient] = useState('saurabhkumar.sakr@gmail.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCustomNote, setEmailCustomNote] = useState('Hi Team, please find attached the latest verified B2B leads extracted from international corporate registries.');
  const [emailCountryFilter, setEmailCountryFilter] = useState('');
  const [emailAttachExcel, setEmailAttachExcel] = useState(true);
  const [isSendingCustomEmail, setIsSendingCustomEmail] = useState(false);
  const [customEmailResult, setCustomEmailResult] = useState(null);
  const [sentEmailHistory, setSentEmailHistory] = useState([]);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchHealth();
    fetchLeads();
    fetchJobs();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs]);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Error fetching health:', err);
    }
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCountryFilter) params.set('country', selectedCountryFilter);
      if (hasEmailFilter) params.set('hasEmail', 'true');
      if (hasPhoneFilter) params.set('hasPhone', 'true');
      params.set('limit', '200');

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  // Trigger search on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCountryFilter, hasEmailFilter, hasPhoneFilter]);

  // Country selection toggle
  const toggleCountry = (code) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Start Scrape Job via Server-Sent Events (SSE)
  const handleStartScrape = async () => {
    if (selectedCountries.length === 0) {
      alert('Please select at least one country registry.');
      return;
    }

    setIsScraping(true);
    setLiveLogs([]);
    setJobSummary(null);
    setActiveTab('scraper');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify({
          countries: selectedCountries,
          query: scraperQuery,
          limit: Number(scraperLimit),
          enrich: enrichWebsite,
          delayMs: Number(delayMs),
          stream: true
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to start scraping');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep last incomplete chunk

        for (const line of lines) {
          if (!line.trim()) continue;
          const matchEvent = line.match(/^event:\s*(\w+)/m);
          const matchData = line.match(/^data:\s*(.*)/m);

          const eventName = matchEvent ? matchEvent[1] : 'message';
          const eventData = matchData ? JSON.parse(matchData[1]) : null;

          if (eventName === 'log' && eventData) {
            setLiveLogs((prev) => [...prev, eventData]);
          } else if (eventName === 'complete' && eventData) {
            setJobSummary(eventData);
            fetchLeads();
            fetchJobs();
            fetchHealth();
          } else if (eventName === 'error' && eventData) {
            setLiveLogs((prev) => [
              ...prev,
              { timestamp: new Date().toISOString(), level: 'error', message: eventData.message }
            ]);
          }
        }
      }
    } catch (err) {
      setLiveLogs((prev) => [
        ...prev,
        { timestamp: new Date().toISOString(), level: 'error', message: err.message }
      ]);
    } finally {
      setIsScraping(false);
    }
  };

  // Manual Enrichment Trigger
  const handleEnrichLead = async (leadId) => {
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(data.lead);
        }
      } else {
        alert(data.error || 'Enrichment failed');
      }
    } catch (err) {
      alert('Enrichment error: ' + err.message);
    }
  };

  // Test Email
  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    setEmailStatusMsg(null);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobStats: { leadsCollected: 12, duplicatesSkipped: 3, errorsCount: 0 },
          countries: ['Norway', 'Singapore', 'France']
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatusMsg({ type: 'success', text: `Test email sent to ${health?.email?.recipient}!` });
      } else {
        setEmailStatusMsg({ type: 'error', text: data.result?.error || 'Email sending failed.' });
      }
    } catch (err) {
      setEmailStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Custom Leads Report Email Dispatch
  const handleSendCustomEmail = async (e) => {
    if (e) e.preventDefault();
    if (!emailRecipient || !emailRecipient.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingCustomEmail(true);
    setCustomEmailResult(null);

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: emailRecipient,
          subject: emailSubject || undefined,
          customNote: emailCustomNote,
          country: emailCountryFilter || undefined,
          attachExcel: emailAttachExcel
        })
      });

      const data = await res.json();
      if (data.success) {
        const entry = {
          recipient: emailRecipient,
          subject: emailSubject || `B2B Leads Report — ${data.leadsCount || totalLeads} Companies`,
          timestamp: new Date().toLocaleTimeString(),
          messageId: data.result?.messageId,
          leadsCount: data.leadsCount || totalLeads
        };
        setCustomEmailResult({
          type: 'success',
          text: `Leads report successfully dispatched to ${emailRecipient}!`,
          messageId: data.result?.messageId
        });
        setSentEmailHistory((prev) => [entry, ...prev]);
      } else {
        setCustomEmailResult({
          type: 'error',
          text: data.result?.error || data.error || 'Failed to send email report.'
        });
      }
    } catch (err) {
      setCustomEmailResult({ type: 'error', text: err.message });
    } finally {
      setIsSendingCustomEmail(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics
  const totalLeads = leads.length;
  const enrichedLeads = leads.filter((l) => l.email || l.phone).length;
  const enrichedPct = totalLeads > 0 ? Math.round((enrichedLeads / totalLeads) * 100) : 0;
  const activeCountries = new Set(leads.map((l) => l.country).filter(Boolean)).size;
  const previewLeadsCount = emailCountryFilter
    ? leads.filter((l) => l.country === emailCountryFilter).length
    : totalLeads;

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Ambient Acrylic Glow Effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[1000px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/75 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-400 shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">B2B Lead Scraper</h1>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400 ring-1 ring-blue-500/25">
                  Global Registries
                </span>
              </div>
              <p className="text-xs text-slate-400">Automated multi-country lead intelligence & export</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Health Indicators */}
            <div className="hidden items-center gap-2.5 rounded-full border border-white/5 bg-slate-900/60 px-3.5 py-1.5 md:flex backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-slate-300">
                DB: {health?.database?.mode === 'supabase' ? 'Supabase Cloud' : 'Local Storage'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-xs font-medium text-slate-300">
                SMTP: {health?.email?.isConfigured ? 'Ready' : 'Off'}
              </span>
            </div>

            {/* Launch Scrape CTA */}
            <button
              onClick={() => setActiveTab('scraper')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 border border-blue-400/20 transition-all active:scale-[0.98] focus:outline-none"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Run Scraper</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto flex max-w-7xl border-t border-white/5 px-4 sm:px-6">
          <nav className="flex space-x-2 py-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'explorer'
                  ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-xs shadow-blue-500/20'
                  : 'border border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Leads Explorer</span>
              <span className="rounded-full bg-slate-800/90 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
                {totalLeads}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('exporter')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'exporter'
                  ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-xs shadow-emerald-500/20'
                  : 'border border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Export Leads</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300 border border-emerald-500/20">
                Select Columns
              </span>
            </button>
            <button
              onClick={() => setActiveTab('scraper')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'scraper'
                  ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-xs shadow-blue-500/20'
                  : 'border border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Scraper Control & Live Logs</span>
              {isScraping && <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />}
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'email'
                  ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-xs shadow-blue-500/20'
                  : 'border border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Email Dispatch</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'history'
                  ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-xs shadow-blue-500/20'
                  : 'border border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Job History</span>
              <span className="rounded-full bg-slate-800/90 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
                {jobs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'api'
                  ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-xs shadow-blue-500/20'
                  : 'border border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-4 w-4" />
              <span>API Docs</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* TAB 0: B2B LEADS DATA EXPORTER */}
        {activeTab === 'exporter' && (
          <InvoiceDataExporter />
        )}

        {/* TAB 1: LEADS EXPLORER */}
        {activeTab === 'explorer' && (
          <div className="space-y-4">
            {/* Metric Cards Banner (Bento Acrylic) */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:border-white/10 hover:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Leads</span>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white">{totalLeads}</span>
                  <span className="text-xs text-slate-400">stored leads</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:border-white/10 hover:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Enriched Contacts</span>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white">{enrichedLeads}</span>
                  <span className="text-xs font-semibold text-emerald-400">{enrichedPct}% with contact</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:border-white/10 hover:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Countries Covered</span>
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
                    <Globe className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white">{activeCountries}</span>
                  <span className="text-xs text-slate-400">of 7 supported</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:border-white/10 hover:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Scrape Jobs Run</span>
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white">{jobs.length}</span>
                  <span className="text-xs text-cyan-400">automated tasks</span>
                </div>
              </div>
            </section>
            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-xl backdrop-blur-xl md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search company, director, or registration number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-2 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 backdrop-blur-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCountryFilter}
                  onChange={(e) => setSelectedCountryFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Countries</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setHasEmailFilter(!hasEmailFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    hasEmailFilter
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                      : 'border-white/10 bg-slate-950/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Has Email
                </button>

                <button
                  onClick={() => setHasPhoneFilter(!hasPhoneFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    hasPhoneFilter
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                      : 'border-white/10 bg-slate-950/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Has Phone
                </button>

                <button
                  onClick={() => {
                    fetchLeads();
                    fetchHealth();
                  }}
                  className="rounded-xl border border-white/10 bg-slate-950/80 p-2 text-slate-400 hover:text-slate-200 transition"
                  title="Refresh Leads"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingLeads ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Leads Table */}
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/5 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 font-semibold">Company Name</th>
                      <th className="px-3 py-3.5 font-semibold text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <Star className="h-3 w-3 fill-emerald-400 text-emerald-400" />
                          <span>Phone & Email (P1)</span>
                        </span>
                      </th>
                      <th className="px-3 py-3.5 font-semibold text-cyan-400">
                        <span className="flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-cyan-400" />
                          <span>Website (P2)</span>
                        </span>
                      </th>
                      <th className="px-3 py-3.5 font-semibold">Country</th>
                      <th className="px-3 py-3.5 font-semibold">Reg. Number</th>
                      <th className="px-3 py-3.5 font-semibold">Director / Officers</th>
                      <th className="px-3 py-3.5 font-semibold">Industry / Type</th>
                      <th className="py-3.5 pl-3 pr-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-normal">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-400">
                          {loadingLeads ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                              <span>Loading leads from database...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Building2 className="h-8 w-8 text-slate-600" />
                              <span className="font-medium text-slate-300">No leads found</span>
                              <p className="text-xs text-slate-500">
                                Launch a scrape job using the button above to populate your database!
                              </p>
                              <button
                                onClick={() => setActiveTab('scraper')}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-blue-500 hover:to-indigo-500"
                              >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                Start Scraping Now
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead.id} className="transition hover:bg-slate-800/30">
                          <td className="py-3.5 pl-4 pr-3">
                            <div className="font-semibold text-white">{lead.company_name}</div>
                          </td>
                          {/* Priority 1: Phone & Email */}
                          <td className="px-3 py-3.5">
                            <div className="flex flex-col gap-1">
                              {lead.phone ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium font-mono text-[11px]">
                                  <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                                  <span>{lead.phone}</span>
                                </span>
                              ) : null}
                              {lead.email ? (
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 hover:underline font-mono text-[11px]"
                                >
                                  <Mail className="h-3 w-3 text-emerald-400 shrink-0" />
                                  <span>{lead.email}</span>
                                </a>
                              ) : null}
                              {!lead.email && !lead.phone && (
                                <span className="text-[11px] text-slate-600 font-mono">None discovered</span>
                              )}
                            </div>
                          </td>
                          {/* Priority 2: Website */}
                          <td className="px-3 py-3.5">
                            {lead.website ? (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                <Globe className="h-3 w-3 text-cyan-400 shrink-0" />
                                <span className="truncate max-w-[150px]">{lead.website.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                              </a>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-slate-900/60 px-2 py-1 text-xs text-slate-200">
                              <CountryFlag code={lead.country} className="h-3 w-4.5" />
                              <span className="font-medium">{lead.country}</span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 font-mono text-slate-300">
                            {lead.registration_number || <span className="text-slate-600">—</span>}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-3.5 text-slate-300">
                            {lead.director || <span className="text-slate-600">—</span>}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-3.5 text-slate-400">
                            {lead.industry || lead.company_type || <span className="text-slate-600">—</span>}
                          </td>
                          <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                                title="View Lead Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {lead.website && (
                                <button
                                  onClick={() => handleEnrichLead(lead.id)}
                                  className="rounded p-1 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                                  title="Crawl Website for Contact Info"
                                >
                                  <Sparkles className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-400">
                <span>Showing {leads.length} leads</span>
                <span className="font-mono">Export: exports/Master_B2B_Leads.xlsx</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCRAPER CONTROL PANEL & LIVE LOGS */}
        {activeTab === 'scraper' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Configuration Form */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl lg:col-span-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Scraper Settings</h2>
                  <p className="text-xs text-slate-400">Target free public corporate registries</p>
                </div>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/20">
                  Polite Rate Limiting
                </span>
              </div>

              <div className="space-y-4">
                {/* Country Checkboxes */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Select Target Registries
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {COUNTRIES.map((c) => {
                      const isSelected = selectedCountries.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => toggleCountry(c.code)}
                          className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition ${
                            isSelected
                              ? 'border-blue-500/50 bg-blue-500/15 text-white shadow-xs shadow-blue-500/20'
                              : 'border-white/5 bg-slate-950/60 text-slate-400 hover:border-white/10 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <CountryFlag code={c.code} className="h-4 w-5" />
                            <div>
                              <div className="font-medium text-slate-200">{c.name}</div>
                              <div className="text-[10px] text-slate-500">{c.source}</div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Query / Industry */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Industry / Keyword Search Query
                  </label>
                  <input
                    type="text"
                    value={scraperQuery}
                    onChange={(e) => setScraperQuery(e.target.value)}
                    placeholder="e.g. software, logistics, finance (leave blank for latest)"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Limit and Delay */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Limit per Country
                    </label>
                    <select
                      value={scraperLimit}
                      onChange={(e) => setScraperLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="5">5 records</option>
                      <option value="10">10 records</option>
                      <option value="20">20 records (Standard)</option>
                      <option value="50">50 records</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Polite Delay (ms)
                    </label>
                    <select
                      value={delayMs}
                      onChange={(e) => setDelayMs(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="500">500 ms</option>
                      <option value="1000">1000 ms (Recommended)</option>
                      <option value="2000">2000 ms (High politeness)</option>
                    </select>
                  </div>
                </div>

                {/* Enrichment Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/60 p-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Enrich Company Websites</div>
                    <div className="text-[11px] text-slate-400">
                      Politely crawl Contact/About page for publicly visible emails & phones
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enrichWebsite}
                    onChange={(e) => setEnrichWebsite(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  disabled={isScraping}
                  onClick={handleStartScrape}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-lg transition active:scale-[0.98] ${
                    isScraping
                      ? 'cursor-not-allowed bg-blue-800/80 opacity-60'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/25'
                  }`}
                >
                  {isScraping ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Scraping in Progress...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Start Lead Scraping Job</span>
                    </>
                  )}
                </button>
              </div>

              {/* Email summary test trigger */}
              <div className="mt-6 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-300">SMTP Notification Test</div>
                    <div className="text-[11px] text-slate-500">
                      Recipient: {health?.email?.recipient || 'Not set'}
                    </div>
                  </div>
                  <button
                    onClick={handleSendTestEmail}
                    disabled={sendingTestEmail}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-850 hover:text-white transition"
                  >
                    <Send className="h-3 w-3" />
                    <span>{sendingTestEmail ? 'Sending...' : 'Test Email'}</span>
                  </button>
                </div>
                {emailStatusMsg && (
                  <div
                    className={`mt-2 rounded-lg p-2 text-xs ${
                      emailStatusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {emailStatusMsg.text}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Activity Stream Terminal */}
            <div className="flex flex-col rounded-2xl border border-white/5 bg-slate-950/80 p-4 shadow-xl backdrop-blur-xl lg:col-span-7">
              {/* Terminal Window Header (Mac Glass Style) */}
              <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-blue-400" />
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      Live Scraping Console (SSE Stream)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isScraping && (
                    <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 ring-1 ring-blue-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                      Streaming
                    </span>
                  )}
                  <button
                    onClick={() => setLiveLogs([])}
                    className="text-[11px] text-slate-500 hover:text-slate-300 transition"
                  >
                    Clear Console
                  </button>
                </div>
              </div>

              {/* Terminal Logs Window */}
              <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed max-h-[460px] min-h-[360px] rounded-xl bg-black/60 p-3 space-y-1 border border-white/5 shadow-inner">
                {liveLogs.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-16 text-slate-600">
                    <Terminal className="h-8 w-8 mb-2 opacity-40 text-slate-500" />
                    <span>Terminal idle. Ready to receive scrape stream.</span>
                    <span className="text-[10px] text-slate-700">Live SSE events stream here in real-time.</span>
                  </div>
                ) : (
                  liveLogs.map((log, idx) => {
                    const time = log.timestamp ? log.timestamp.split('T')[1].slice(0, 8) : '';
                    let levelColor = 'text-slate-300';
                    if (log.level === 'success') levelColor = 'text-emerald-400 font-semibold';
                    if (log.level === 'warn') levelColor = 'text-amber-400';
                    if (log.level === 'error') levelColor = 'text-rose-400 font-semibold';
                    if (log.level === 'info') levelColor = 'text-slate-300';

                    return (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-600 select-none">[{time}]</span>
                        <span className={levelColor}>{log.message}</span>
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </div>

              {/* Job Completed Summary Banner */}
              {jobSummary && (
                <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Scrape Job Complete (All Data Saved in Supabase)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('exporter')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-600/30 transition active:scale-[0.98]"
                      >
                        <Sliders className="h-3 w-3" />
                        <span>Select Columns & Export / Email Table →</span>
                      </button>
                      <a
                        href="/api/export"
                        download="Master_B2B_Leads.xlsx"
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700 shadow-sm"
                      >
                        <Download className="h-3 w-3" />
                        <span>All Columns (.xlsx)</span>
                      </a>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="rounded-lg bg-black/40 p-1.5 border border-white/5">
                      <div className="font-bold text-white">{jobSummary.leadsCollected}</div>
                      <div className="text-slate-400">New Leads</div>
                    </div>
                    <div className="rounded-lg bg-black/40 p-1.5 border border-white/5">
                      <div className="font-bold text-amber-300">{jobSummary.duplicatesSkipped}</div>
                      <div className="text-slate-400">Duplicates Skipped</div>
                    </div>
                    <div className="rounded-lg bg-black/40 p-1.5 border border-white/5">
                      <div className="font-bold text-slate-300">{jobSummary.errorsCount}</div>
                      <div className="text-slate-400">Errors</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: EMAIL DISPATCH & NOTIFICATION CENTER */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            {/* Header / Overview card */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Email Leads Dispatch & Notification Center</h2>
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400 ring-1 ring-blue-500/20">
                      SMTP Ready
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Dispatch customized executive lead reports with <code className="text-slate-300">Master_B2B_Leads.xlsx</code> attached directly to any email address.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={sendingTestEmail}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                  >
                    {sendingTestEmail ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5 text-blue-400" />
                    )}
                    <span>{sendingTestEmail ? 'Sending Test...' : 'Send Quick Ping'}</span>
                  </button>
                </div>
              </div>

              {emailStatusMsg && (
                <div
                  className={`mt-4 flex items-center justify-between rounded-xl p-3 text-xs ${
                    emailStatusMsg.type === 'success'
                      ? 'border border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                      : 'border border-rose-500/30 bg-rose-950/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {emailStatusMsg.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    )}
                    <span>{emailStatusMsg.text}</span>
                  </div>
                  <button onClick={() => setEmailStatusMsg(null)} className="text-slate-400 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Main Grid: Form Composer (left) + Live Inbox Preview (right) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT: Composer Form (7 cols) */}
              <div className="space-y-5 lg:col-span-7">
                <form
                  onSubmit={handleSendCustomEmail}
                  className="space-y-4 rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl"
                >
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <Send className="h-4 w-4 text-blue-400" />
                    Compose Leads Dispatch
                  </h3>

                  {/* Recipient Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Recipient Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="saurabhkumar.sakr@gmail.com"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {/* Quick-fill Pills */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500">Quick select:</span>
                      <button
                        type="button"
                        onClick={() => setEmailRecipient('saurabhkumar.sakr@gmail.com')}
                        className={`rounded-lg px-2.5 py-0.5 transition ${
                          emailRecipient === 'saurabhkumar.sakr@gmail.com'
                            ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500/40'
                            : 'bg-slate-950/60 text-slate-400 border border-white/5 hover:border-white/10 hover:text-slate-200'
                        }`}
                      >
                        saurabhkumar.sakr@gmail.com (Recipient)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailRecipient('saurabh7739278614@gmail.com')}
                        className={`rounded-lg px-2.5 py-0.5 transition ${
                          emailRecipient === 'saurabh7739278614@gmail.com'
                            ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500/40'
                            : 'bg-slate-950/60 text-slate-400 border border-white/5 hover:border-white/10 hover:text-slate-200'
                        }`}
                      >
                        saurabh7739278614@gmail.com (Sender)
                      </button>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Subject Line <span className="text-slate-500 font-normal">(optional — default auto-computed)</span>
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={`B2B Leads Report — ${previewLeadsCount} Companies (Master_B2B_Leads.xlsx)`}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Filter Scope & Attach Toggle (Grid) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Geographic Scope Filter
                      </label>
                      <select
                        value={emailCountryFilter}
                        onChange={(e) => setEmailCountryFilter(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">All Scraped Countries ({totalLeads} leads)</option>
                        {Array.from(new Set(leads.map((l) => l.country).filter(Boolean))).map((c) => {
                          const count = leads.filter((l) => l.country === c).length;
                          return (
                            <option key={c} value={c}>
                              {c} ({count} leads)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Attachment Option
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 cursor-pointer hover:border-white/20 transition">
                        <input
                          type="checkbox"
                          checked={emailAttachExcel}
                          onChange={(e) => setEmailAttachExcel(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-200">Attach Master_B2B_Leads.xlsx</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Message / Personal Note */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Personal Message / Cover Note
                    </label>
                    <textarea
                      rows={3}
                      value={emailCustomNote}
                      onChange={(e) => setEmailCustomNote(e.target.value)}
                      placeholder="Add personal notes, instructions or executive commentary..."
                      className="w-full rounded-xl border border-white/10 bg-slate-950/80 p-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Action Row */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">{previewLeadsCount}</span> leads queued
                      {emailAttachExcel && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 ring-1 ring-emerald-500/20">
                          <Paperclip className="h-3 w-3" />
                          Excel attached
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingCustomEmail}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 border border-blue-400/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSendingCustomEmail ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Dispatching Email...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Send Leads Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Status / Alert feedback */}
                {customEmailResult && (
                  <div
                    className={`rounded-2xl border p-4 text-xs ${
                      customEmailResult.type === 'success'
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {customEmailResult.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-400 shrink-0" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold text-sm">
                          {customEmailResult.type === 'success' ? 'Email Dispatched Successfully' : 'Email Dispatch Failed'}
                        </div>
                        <div>{customEmailResult.text}</div>
                        {customEmailResult.messageId && (
                          <div className="font-mono text-[11px] text-slate-400">
                            Message-ID: {customEmailResult.messageId}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setCustomEmailResult(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Live Inbox Preview (5 cols) */}
              <div className="space-y-4 lg:col-span-5">
                <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-xl backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <Eye className="h-4 w-4 text-blue-400" />
                      <span>Live Recipient Inbox Preview</span>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">HTML Format</span>
                  </div>

                  {/* Email Envelope Container */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/90 p-4 text-xs shadow-inner">
                    {/* Meta Header */}
                    <div className="space-y-1 border-b border-white/5 pb-3 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">From:</span>
                        <span className="font-medium text-slate-300">
                          B2B Lead Scraper &lt;{health?.email?.from || 'saurabh7739278614@gmail.com'}&gt;
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">To:</span>
                        <span className="font-medium text-blue-400">{emailRecipient || 'recipient@domain.com'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subject:</span>
                        <span className="font-semibold text-slate-200 truncate max-w-[240px]">
                          {emailSubject || `B2B Leads Report — ${previewLeadsCount} Companies (Master_B2B_Leads.xlsx)`}
                        </span>
                      </div>
                    </div>

                    {/* Email Body Mockup */}
                    <div className="mt-3.5 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
                      {/* Header inside email */}
                      <div className="border-b-2 border-blue-600 pb-2 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-bold text-slate-900 leading-none">B2B Sales Leads Report</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">International Corporate Registry Extraction</div>
                        </div>
                      </div>

                      {/* Personal Note */}
                      {emailCustomNote && (
                        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-2 text-[11px] text-slate-700">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Message from Sender:</div>
                          <div className="mt-0.5 whitespace-pre-wrap">{emailCustomNote}</div>
                        </div>
                      )}

                      {/* Metrics card inside email */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px]">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr className="border-b border-slate-200/60">
                              <td className="py-1 text-slate-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span>Generated:</span>
                              </td>
                              <td className="py-1 text-right font-medium text-slate-800">Today, Just now</td>
                            </tr>
                            <tr className="border-b border-slate-200/60">
                              <td className="py-1 text-slate-500 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-600" />
                                <span>Total Companies:</span>
                              </td>
                              <td className="py-1 text-right font-bold text-emerald-600">{previewLeadsCount} leads</td>
                            </tr>
                            <tr className="border-b border-slate-200/60">
                              <td className="py-1 text-slate-500 flex items-center gap-1">
                                <Globe2 className="h-3 w-3 text-slate-400" />
                                <span>Coverage:</span>
                              </td>
                              <td className="py-1 text-right font-medium text-slate-800">
                                {emailCountryFilter || 'All Countries'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 text-slate-500 flex items-center gap-1">
                                <FolderArchive className="h-3 w-3 text-blue-600" />
                                <span>Attached Workbook:</span>
                              </td>
                              <td className="py-1 text-right font-medium text-blue-600">
                                {emailAttachExcel ? 'Master_B2B_Leads.xlsx' : 'None'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Excel Attachment Chip */}
                      {emailAttachExcel && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="flex-1 truncate">
                            <div className="font-semibold text-emerald-950">Master_B2B_Leads.xlsx</div>
                            <div className="text-[10px] text-emerald-700">Excel Spreadsheet • {previewLeadsCount} verified rows</div>
                          </div>
                          <span className="rounded bg-emerald-200/60 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase">
                            Ready
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch History Card */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Recent Email Dispatches
                </h3>
                <span className="text-xs text-slate-400">
                  {sentEmailHistory.length} sent in this session
                </span>
              </div>

              {sentEmailHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                  No email reports dispatched in this session yet. Compose an email above to send the Master Excel report.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/5 bg-slate-900/80 text-slate-400">
                      <tr>
                        <th className="px-3.5 py-2.5 font-medium">Recipient</th>
                        <th className="px-3.5 py-2.5 font-medium">Subject</th>
                        <th className="px-3.5 py-2.5 font-medium">Leads</th>
                        <th className="px-3.5 py-2.5 font-medium">Time</th>
                        <th className="px-3.5 py-2.5 font-medium">Status / Message-ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-slate-300">
                      {sentEmailHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 transition">
                          <td className="px-3.5 py-2.5 font-medium text-white">{item.recipient}</td>
                          <td className="px-3.5 py-2.5 text-slate-400 max-w-xs truncate">{item.subject}</td>
                          <td className="px-3.5 py-2.5 font-mono text-emerald-400">{item.leadsCount}</td>
                          <td className="px-3.5 py-2.5 text-slate-400">{item.timestamp}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-blue-400">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400 mr-1.5 ring-1 ring-emerald-500/20">
                              <Check className="h-3 w-3" /> Sent
                            </span>
                            {item.messageId ? `${item.messageId.slice(0, 18)}...` : 'Delivered'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: JOB HISTORY */}
        {activeTab === 'history' && (
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl">
            <h2 className="mb-4 text-base font-bold text-white">Scrape Job History</h2>
            {jobs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No jobs run yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {jobs.map((job) => (
                  <div key={job.id} className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          Job #{job.id.slice(0, 8)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                            job.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                          }`}
                        >
                          {job.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          Started: {new Date(job.started_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Countries: {Array.isArray(job.countries) ? job.countries.join(', ') : 'All'}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-emerald-400 font-semibold">
                        +{job.leads_collected} leads
                      </div>
                      <div className="text-amber-400">
                        {job.duplicates_skipped} duplicates
                      </div>
                      <div className="text-slate-400">
                        {job.errors_count} errors
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: API DOCUMENTATION & INTEGRATION */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl backdrop-blur-xl">
              <h2 className="text-base font-bold text-white">REST API Endpoints</h2>
              <p className="text-xs text-slate-400 mb-4">
                Full programmatic access to run scrapers, query leads, and stream Excel files.
              </p>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-blue-500/20 px-2 py-0.5 font-bold text-blue-400 border border-blue-500/30">POST</span>
                    <span className="text-slate-200">/api/scrape</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Triggers a multi-country scrape job. Supports Server-Sent Events with <code>Accept: text/event-stream</code>.
                  </p>
                  <pre className="mt-2 rounded-lg bg-black/60 p-2.5 font-mono text-[11px] text-slate-300 border border-white/5">
{`curl -X POST http://localhost:3000/api/scrape \\
  -H "Content-Type: application/json" \\
  -d '{"countries": ["NO", "FR", "SG", "US"], "query": "technology", "limit": 20, "enrich": true}'`}
                  </pre>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">GET</span>
                    <span className="text-slate-200">/api/leads</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Query stored leads with search, country, hasEmail, and hasPhone filters.
                  </p>
                  <pre className="mt-2 rounded-lg bg-black/60 p-2.5 font-mono text-[11px] text-slate-300 border border-white/5">
{`curl "http://localhost:3000/api/leads?country=Norway&hasEmail=true&limit=50"`}
                  </pre>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">GET</span>
                    <span className="text-slate-200">/api/export</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Streams the generated <code>Master_B2B_Leads.xlsx</code> Excel workbook for download.
                  </p>
                  <pre className="mt-2 rounded-lg bg-black/60 p-2.5 font-mono text-[11px] text-slate-300 border border-white/5">
{`curl -O http://localhost:3000/api/export`}
                  </pre>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">GET</span>
                    <span className="text-slate-200">/api/custom-export/master</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Returns structured records, available columns, and metrics parsed from <code>exports/Master_B2B_Leads.xlsx</code>.
                  </p>
                  <pre className="mt-2 rounded-lg bg-black/60 p-2.5 font-mono text-[11px] text-slate-300 border border-white/5">
{`curl "http://localhost:3000/api/custom-export/master"`}
                  </pre>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-blue-500/20 px-2 py-0.5 font-bold text-blue-400 border border-blue-500/30">POST</span>
                    <span className="text-slate-200">/api/custom-export/download</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Generates and streams a custom-filtered Excel file with only the user-selected columns and filtered rows.
                  </p>
                  <pre className="mt-2 rounded-lg bg-black/60 p-2.5 font-mono text-[11px] text-slate-300 border border-white/5">
{`curl -X POST http://localhost:3000/api/custom-export/download \\
  -H "Content-Type: application/json" \\
  -d '{"rows": [...], "selectedColumns": ["Company Name", "Phone", "Email"], "fileName": "Invoices.xlsx"}' \\
  --output Invoices.xlsx`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* LEAD DETAILS MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-start justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedLead.company_name}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <CountryFlag code={selectedLead.country} className="h-3 w-4.5" />
                  <span>{selectedLead.country}</span>
                  <span>•</span>
                  <span className="text-emerald-400">{selectedLead.status || 'Active'}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-2.5">
                  <div className="text-slate-500">Registration Number</div>
                  <div className="font-mono font-medium text-slate-200">
                    {selectedLead.registration_number || 'N/A'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-2.5">
                  <div className="text-slate-500">Company Type</div>
                  <div className="font-medium text-slate-200">{selectedLead.company_type || 'N/A'}</div>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/80 p-2.5">
                <div className="text-slate-500">Director / Officers</div>
                <div className="font-medium text-slate-200">{selectedLead.director || 'None recorded'}</div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/80 p-2.5">
                <div className="text-slate-500">Registered Address</div>
                <div className="text-slate-200">{selectedLead.address || 'N/A'}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-2.5">
                  <div className="text-slate-500">Email Contact</div>
                  <div className="font-mono text-emerald-400">
                    {selectedLead.email || 'None discovered'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-2.5">
                  <div className="text-slate-500">Phone Contact</div>
                  <div className="font-mono text-cyan-400">{selectedLead.phone || 'None recorded'}</div>
                </div>
              </div>

              {selectedLead.website && (
                <div className="rounded-xl border border-white/5 bg-slate-950/80 p-2.5">
                  <div className="text-slate-500">Website</div>
                  <a
                    href={selectedLead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-400 hover:underline mt-0.5"
                  >
                    <span>{selectedLead.website}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-white/5 pt-3">
              {selectedLead.website && (
                <button
                  onClick={() => handleEnrichLead(selectedLead.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Enrich Contacts</span>
                </button>
              )}
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-xl border border-white/10 bg-slate-800 px-3.5 py-1.5 text-xs text-slate-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
