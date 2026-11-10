'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Star,
  LayoutDashboard,
  MapPin,
  Webhook,
  Trash2
} from 'lucide-react';
import InvoiceDataExporter from '@/components/InvoiceDataExporter';
import MicrosoftExcelIcon from '@/components/MicrosoftExcelIcon';
import InstagramIcon from '@/components/InstagramIcon';
import CountryFlag from '@/components/CountryFlag';
import { GEO_COUNTRIES, buildMapsQuery, POPULAR_NICHES } from '@/lib/data/geo_locations.js';

const MAPS_ENGINE = {
  code: 'MAPS',
  name: 'Google Maps',
  source: 'Google Maps Search',
  free: true
};

const POPULAR_LI_ROLES = [
  { label: 'Founder / CEO', query: 'Founder CEO' },
  { label: 'Managing Director', query: 'Managing Director' },
  { label: 'VP of Sales', query: 'VP of Sales' },
  { label: 'Marketing Head', query: 'Marketing Director CMO' },
  { label: 'Procurement / Buyer', query: 'Procurement Purchasing Manager' },
  { label: 'Operations Lead', query: 'Head of Operations COO' },
  { label: 'HR / Talent', query: 'Head of HR Talent Acquisition' }
];

const POPULAR_LI_INDUSTRIES = [
  { label: 'SaaS & Tech', query: 'SaaS Software' },
  { label: 'Real Estate', query: 'Real Estate Commercial Property' },
  { label: 'Healthcare & Medical', query: 'Healthcare Medical Devices' },
  { label: 'Finance & Fintech', query: 'Finance Fintech Banking' },
  { label: 'E-Commerce & Retail', query: 'E-Commerce Retail Brands' },
  { label: 'Manufacturing', query: 'Manufacturing Industrial' },
  { label: 'Digital Agencies', query: 'Digital Marketing Advertising Agency' }
];

const POPULAR_IG_CATEGORIES = [
  { label: 'Fashion & Boutique', query: 'Fashion Boutique Clothing Brand' },
  { label: 'Fitness & Gym', query: 'Fitness Coach Personal Trainer Gym' },
  { label: 'Beauty & Salon', query: 'Beauty Salon Hair Stylist Makeup' },
  { label: 'Cafes & Dining', query: 'Restaurant Cafe Bakery Food' },
  { label: 'Real Estate', query: 'Realtor Real Estate Agency Properties' },
  { label: 'Photography & Media', query: 'Photographer Videographer Media Studio' },
  { label: 'Digital Marketing', query: 'Marketing Agency Digital Media Brand Strategy' },
  { label: 'E-Commerce & Retail', query: 'Shop Online Store Handmade Jewelry' }
];

const POPULAR_IG_BIO_INTENTS = [
  { label: 'Owner / Founder', query: 'Founder Owner CEO' },
  { label: 'Bookings & Inquiries', query: 'Bookings Inquiries Contact' },
  { label: 'Collabs & PR', query: 'DM for Collabs PR Inquiries' },
  { label: 'Worldwide Shipping', query: 'Worldwide Shipping Orders' },
  { label: 'Certified Coach', query: 'Certified Coach Trainer' }
];

export default function Dashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState('explorer'); // 'explorer', 'scraper', 'history', 'api'

  // Scraper Mode: 'MAPS' (Google Maps) or 'LINKEDIN' (LinkedIn Leads)
  const [selectedEngine, setSelectedEngine] = useState('MAPS');

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
  const [previewFilter, setPreviewFilter] = useState('ALL');

  // Scraper form state
  const [scraperQuery, setScraperQuery] = useState('');
  const [scraperLimit, setScraperLimit] = useState(10);
  const [enrichWebsite, setEnrichWebsite] = useState(true);
  const [delayMs, setDelayMs] = useState(1000);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [liveLogs, setLiveLogs] = useState([]);
  const [jobSummary, setJobSummary] = useState(null);
  const logContainerRef = useRef(null);
  const [autoScrollLogs, setAutoScrollLogs] = useState(false);

  // Google Maps Hyper-Local Location Builder states
  const [mapsCountryCode, setMapsCountryCode] = useState('US');
  const [mapsCity, setMapsCity] = useState('New York');
  const [mapsCustomCity, setMapsCustomCity] = useState('');
  const [mapsLocality, setMapsLocality] = useState('');
  const [mapsCategory, setMapsCategory] = useState('school');
  const [mapsFreeform, setMapsFreeform] = useState(false);

  const activeCountryObj = GEO_COUNTRIES.find((c) => c.code === mapsCountryCode) || GEO_COUNTRIES[0];
  const activeCity = mapsCity === 'Custom City' ? mapsCustomCity : mapsCity;
  const activeCountryName = activeCountryObj.code === 'CUSTOM' ? '' : activeCountryObj.name;
  const synthesizedMapsQuery = buildMapsQuery({
    category: mapsCategory,
    locality: mapsLocality,
    city: activeCity,
    country: activeCountryName
  });

  // LinkedIn Business & Decision Maker Search States (aligned with Google Maps location flow)
  const [liCountryCode, setLiCountryCode] = useState('US');
  const [liCity, setLiCity] = useState('San Francisco');
  const [liCustomCity, setLiCustomCity] = useState('');
  const [liLocality, setLiLocality] = useState('');
  const [liIndustry, setLiIndustry] = useState('SaaS Software');
  const [liRole, setLiRole] = useState('Founder CEO');
  const [liCompany, setLiCompany] = useState('');
  const [liFreeform, setLiFreeform] = useState(false);
  const [liCustomQuery, setLiCustomQuery] = useState('');

  const activeLiCountryObj = GEO_COUNTRIES.find((c) => c.code === liCountryCode) || GEO_COUNTRIES[0];
  const activeLiCity = liCity === 'Custom City' ? liCustomCity : liCity;
  const activeLiCountryName = activeLiCountryObj.code === 'CUSTOM' ? '' : activeLiCountryObj.name;
  const activeLiLocation = [liLocality.trim(), activeLiCity.trim(), activeLiCountryName.trim()].filter(Boolean).join(', ');

  const synthesizedLinkedInQuery = [
    'site:linkedin.com/in',
    liIndustry ? liIndustry.trim() : '',
    activeLiLocation ? activeLiLocation.trim() : '',
    liRole ? liRole.trim() : '',
    liCompany ? liCompany.trim() : ''
  ].filter(Boolean).join(' ');

  // Instagram Business & Creator Search States
  const [igCountryCode, setIgCountryCode] = useState('US');
  const [igCity, setIgCity] = useState('Miami');
  const [igCustomCity, setIgCustomCity] = useState('');
  const [igLocality, setIgLocality] = useState('');
  const [igCategory, setIgCategory] = useState('Fitness Coach Gym');
  const [igBioIntent, setIgBioIntent] = useState('DM for Collabs');
  const [igBrand, setIgBrand] = useState('');
  const [igFreeform, setIgFreeform] = useState(false);
  const [igCustomQuery, setIgCustomQuery] = useState('');

  const activeIgCountryObj = GEO_COUNTRIES.find((c) => c.code === igCountryCode) || GEO_COUNTRIES[0];
  const activeIgCity = igCity === 'Custom City' ? igCustomCity : igCity;
  const activeIgCountryName = activeIgCountryObj.code === 'CUSTOM' ? '' : activeIgCountryObj.name;
  const activeIgLocation = [igLocality.trim(), activeIgCity.trim(), activeIgCountryName.trim()].filter(Boolean).join(', ');

  const synthesizedInstagramQuery = [
    'site:instagram.com',
    igCategory ? igCategory.trim() : '',
    activeIgLocation ? activeIgLocation.trim() : '',
    igBioIntent ? igBioIntent.trim() : '',
    igBrand ? igBrand.trim() : ''
  ].filter(Boolean).join(' ');

  const filteredPreviewLeads = useMemo(() => {
    let list = leads;
    if (previewFilter === 'P1') {
      list = leads.filter((l) => l.email && l.phone);
    } else if (previewFilter === 'LINKEDIN') {
      list = leads.filter((l) => (l.source || '').toLowerCase().includes('linkedin') || (l.registration_number || '').startsWith('LI:'));
    } else if (previewFilter === 'INSTAGRAM') {
      list = leads.filter((l) => (l.source || '').toLowerCase().includes('instagram') || (l.registration_number || '').startsWith('IG:'));
    } else if (previewFilter === 'MAPS') {
      list = leads.filter((l) => (l.source || '').toLowerCase().includes('maps'));
    }
    return list.slice(0, 8);
  }, [leads, previewFilter]);

  // Dedicated Email Dispatch UI states
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCustomNote, setEmailCustomNote] = useState('Hi Team, please find attached the latest verified B2B leads extracted from international corporate registries.');
  const [emailCountryFilter, setEmailCountryFilter] = useState('');
  const [emailAttachExcel, setEmailAttachExcel] = useState(true);
  const [isSendingCustomEmail, setIsSendingCustomEmail] = useState(false);
  const [customEmailResult, setCustomEmailResult] = useState(null);
  const [sentEmailHistory, setSentEmailHistory] = useState([]);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Error fetching health:', err);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
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
  }, [searchQuery, selectedCountryFilter, hasEmailFilter, hasPhoneFilter]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  }, []);

  // Fetch initial data that does not depend on the lead filters.
  useEffect(() => {
    void fetchHealth();
    void fetchJobs();
  }, [fetchHealth, fetchJobs]);

  // Confine log scrolling strictly inside the terminal box if explicitly enabled (never scrolls browser window)
  useEffect(() => {
    if (autoScrollLogs && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveLogs, autoScrollLogs]);

  // Trigger search on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  // Start Scrape Job via Server-Sent Events (SSE)
  const handleStartScrape = async () => {
    let payload = {};
    if (selectedEngine === 'INSTAGRAM') {
      const queryToUse = igFreeform ? igCustomQuery.trim() : synthesizedInstagramQuery.trim();
      if (!queryToUse) {
        alert('Please specify a category, location, or enter an Instagram search query.');
        return;
      }
      payload = {
        engine: 'INSTAGRAM',
        countries: ['INSTAGRAM'],
        query: queryToUse,
        category: igCategory,
        bioIntent: igBioIntent,
        location: activeIgLocation,
        brand: igBrand,
        limit: Number(scraperLimit),
        enrich: enrichWebsite,
        delayMs: Number(delayMs),
        stream: true,
        notificationEmail: notificationEmail.trim(),
        webhookUrl: webhookUrl.trim()
      };
    } else if (selectedEngine === 'LINKEDIN') {
      const queryToUse = liFreeform ? liCustomQuery.trim() : synthesizedLinkedInQuery.trim();
      if (!queryToUse) {
        alert('Please specify a business category, location, or enter a LinkedIn search query.');
        return;
      }
      payload = {
        engine: 'LINKEDIN',
        countries: ['LINKEDIN'],
        query: queryToUse,
        role: liRole,
        industry: liIndustry,
        location: activeLiLocation,
        company: liCompany,
        limit: Number(scraperLimit),
        enrich: enrichWebsite,
        delayMs: Number(delayMs),
        stream: true,
        notificationEmail: notificationEmail.trim(),
        webhookUrl: webhookUrl.trim()
      };
    } else {
      const queryToUse = mapsFreeform ? scraperQuery.trim() : synthesizedMapsQuery.trim();
      if (!queryToUse) {
        alert('Please specify a business category/niche or enter a search query.');
        return;
      }
      payload = {
        engine: 'MAPS',
        countries: ['MAPS'],
        query: queryToUse,
        limit: Number(scraperLimit),
        enrich: enrichWebsite,
        delayMs: Number(delayMs),
        stream: true,
        notificationEmail: notificationEmail.trim(),
        webhookUrl: webhookUrl.trim()
      };
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
        body: JSON.stringify(payload)
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

  const handleCopyText = (text, key) => {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedLead(null);
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
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
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Ambient Glow Effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[1000px] bg-gradient-to-b from-blue-200/30 via-slate-200/20 to-transparent blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/20 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-black">B2B Lead Scraper</h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                  Google Maps & LinkedIn
                </span>
              </div>
              <p className="text-xs text-slate-600">Find local businesses and decision-makers with direct phone and email contacts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Indicators */}
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-700">
                Database: {health?.database?.status === 'ok' || health?.database?.mode ? 'Connected' : 'Ready'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-medium text-slate-700">
                Email Delivery: {health?.email?.isConfigured ? 'Ready' : 'Optional'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto flex max-w-7xl border-t border-slate-200 px-4 sm:px-6">
          <nav className="flex space-x-2 py-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'explorer'
                  ? 'border border-blue-200 bg-blue-50 text-blue-700 shadow-xs font-semibold'
                  : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-black'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-700 border border-slate-200">
                {totalLeads}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('exporter')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'exporter'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs font-semibold'
                  : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-black'
              }`}
            >
              <MicrosoftExcelIcon className="h-4 w-4" />
              <span>Leads Explorer</span>
            </button>
            <button
              onClick={() => setActiveTab('scraper')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'scraper'
                  ? 'border border-rose-200 bg-rose-50 text-rose-700 shadow-xs font-semibold'
                  : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-black'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Find Leads</span>
              {isScraping && <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />}
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'email'
                  ? 'border border-blue-200 bg-blue-50 text-blue-700 shadow-xs font-semibold'
                  : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-black'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Email Dispatch</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'history'
                  ? 'border border-slate-300 bg-white text-black shadow-xs font-semibold'
                  : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-black'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Search History</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-700 border border-slate-200">
                {jobs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === 'api'
                  ? 'border border-slate-300 bg-white text-black shadow-xs font-semibold'
                  : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-black'
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
            {/* Metric Cards Banner (Off-White & Red/Blue/Green/Black Accents) */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Leads</span>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-black">{totalLeads}</span>
                  <span className="text-xs text-slate-500">stored leads</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Direct Contacts Found</span>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-emerald-600">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-black">{enrichedLeads}</span>
                  <span className="text-xs font-semibold text-emerald-700">{enrichedPct}% phone or email</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Countries Covered</span>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600">
                    <Globe className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-black">{activeCountries}</span>
                  <span className="text-xs text-slate-500">Global Coverage</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Scrape Jobs Run</span>
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-black">{jobs.length}</span>
                  <span className="text-xs text-rose-700 font-semibold">automated tasks</span>
                </div>
              </div>
            </section>

            {/* Contact Quality Breakdown & Quick Actions */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Quality Funnel */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Contact Info Summary</h3>
                    <p className="text-xs text-slate-500">Breakdown of available phone numbers, emails, and websites</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('exporter')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    <span>View All In Explorer</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <Star className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
                      <span>Both Phone & Email</span>
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-emerald-900">
                      {leads.filter((l) => l.email && l.phone).length}
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Ready for calls and email outreach</p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      <span>Phone or Email Found</span>
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-blue-900">
                      {leads.filter((l) => (l.email && !l.phone) || (!l.email && l.phone)).length}
                    </div>
                    <p className="text-[11px] text-blue-700 mt-0.5">Direct contact available</p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                      <Globe className="h-3.5 w-3.5 text-amber-600" />
                      <span>Website Available</span>
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-amber-900">
                      {leads.filter((l) => !l.email && !l.phone && l.website).length}
                    </div>
                    <p className="text-[11px] text-amber-700 mt-0.5">Can check website for email & phone</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-slate-700">Clean Data Verified:</span>
                    <span className="text-slate-500">Invalid emails, fake numbers, and temporary inboxes are filtered out.</span>
                  </div>
                  <span className="font-bold text-emerald-700">Verified</span>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
                  <p className="text-xs text-slate-500">Accelerate your lead prospecting workflow</p>
                </div>

                <div className="my-3 space-y-2">
                  <button
                    onClick={() => setActiveTab('scraper')}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50/50 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-blue-100 p-1.5 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                        <Play className="h-4 w-4 fill-current" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Start New Lead Search</div>
                        <div className="text-[11px] text-slate-500">Find verified contacts on Google Maps or LinkedIn</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
                  </button>

                  <button
                    onClick={() => setActiveTab('exporter')}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <MicrosoftExcelIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Explore & Export Dataset</div>
                        <div className="text-[11px] text-slate-500">Filter, select columns & export Excel</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition" />
                  </button>

                  <button
                    onClick={() => setActiveTab('email')}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:border-purple-300 hover:bg-purple-50/50 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-purple-100 p-1.5 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
                        <Send className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Dispatch Email Report</div>
                        <div className="text-[11px] text-slate-500">Deliver Excel attachments via SMTP</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition" />
                  </button>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center text-xs text-blue-700">
                  <div className="font-semibold mb-1">Master Dataset: <code className="font-mono text-[11px]">exports/Master_B2B_Leads.xlsx</code> ({leads.length} leads)</div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <a
                      href="/api/export?format=xlsx"
                      download="Master_B2B_Leads.xlsx"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-xs transition"
                      title="Download Master Excel Spreadsheet"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download Excel</span>
                    </a>
                    <a
                      href="/api/export?format=csv"
                      download="Master_B2B_Leads.csv"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 shadow-xs transition"
                      title="Download Master CSV Spreadsheet"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download CSV</span>
                    </a>
                    <a
                      href="/api/export?format=json"
                      download="Master_B2B_Leads.json"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 shadow-xs transition"
                      title="Download Master JSON Dataset"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download JSON</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Leads Preview & Full Table Link */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Verified Leads Preview</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('ALL')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                        previewFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      All ({leads.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('P1')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                        previewFilter === 'P1'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      Both Phone & Email ({leads.filter((l) => l.email && l.phone).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('LINKEDIN')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                        previewFilter === 'LINKEDIN'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      LinkedIn ({leads.filter((l) => (l.source || '').toLowerCase().includes('linkedin') || (l.registration_number || '').startsWith('LI:')).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('INSTAGRAM')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition inline-flex items-center gap-1.5 ${
                        previewFilter === 'INSTAGRAM'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs'
                          : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-50'
                      }`}
                    >
                      <InstagramIcon className="h-3 w-3" />
                      <span>Instagram ({leads.filter((l) => (l.source || '').toLowerCase().includes('instagram') || (l.registration_number || '').startsWith('IG:')).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('MAPS')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                        previewFilter === 'MAPS'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                      }`}
                    >
                      Google Maps ({leads.filter((l) => (l.source || '').toLowerCase().includes('maps')).length})
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('exporter')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition shrink-0 self-start sm:self-auto"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Open Full Leads Explorer ({leads.length} Records)</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-800 table-auto">
                  <thead className="border-b border-slate-200 bg-slate-100 text-[11px] uppercase tracking-wider text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 pl-3.5 pr-2 text-black font-bold">Company Name</th>
                      <th className="px-2.5 py-2.5 font-bold text-emerald-700">Phone & Email</th>
                      <th className="px-2.5 py-2.5 font-bold text-blue-700">Website</th>
                      <th className="px-2.5 py-2.5">Country</th>
                      <th className="px-2.5 py-2.5">Reg. Number</th>
                      <th className="px-2.5 py-2.5">Director / Officers</th>
                      <th className="py-2.5 pl-1 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-500">
                          {loadingLeads ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                              <span className="font-medium text-slate-700">Loading leads...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Building2 className="h-6 w-6 text-slate-400" />
                              <span className="font-bold text-black">No leads found yet</span>
                              <button
                                onClick={() => setActiveTab('scraper')}
                                className="mt-1 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                <Play className="h-3 w-3 fill-current" />
                                Start Scraping Now
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewLeads.map((lead) => (
                        <tr key={lead.id} className="transition-colors hover:bg-slate-50">
                          <td className="py-2.5 pl-3.5 pr-2 font-bold text-black truncate max-w-[170px]" title={lead.company_name}>
                            {lead.company_name}
                          </td>
                          <td className="px-2.5 py-2.5">
                            <div className="flex flex-col gap-0.5 max-w-[190px]">
                              {lead.phone && (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold font-mono text-[11px] truncate">
                                  <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{lead.phone}</span>
                                </span>
                              )}
                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline font-semibold font-mono text-[11px] truncate"
                                >
                                  <Mail className="h-3 w-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{lead.email}</span>
                                </a>
                              )}
                              {!lead.email && !lead.phone && (
                                <span className="text-[11px] text-slate-400 font-mono">None discovered</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5">
                            {lead.website ? (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium truncate max-w-[130px]"
                              >
                                <Globe className="h-3 w-3 text-blue-600 shrink-0" />
                                <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-2.5">
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-800">
                              <CountryFlag code={lead.country} className="h-3 w-4.5" />
                              <span className="font-medium">{lead.country}</span>
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-2.5 font-mono text-[11px] text-slate-800">
                            {lead.registration_number || <span className="text-slate-400">—</span>}
                          </td>
                          <td className="max-w-[140px] truncate px-2.5 py-2.5 text-slate-700 text-[11px]">
                            {lead.director || <span className="text-slate-400">—</span>}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pl-1 pr-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-black transition"
                                title="View Lead Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {lead.website && !lead.website.includes('linkedin.com') && !lead.website.includes('instagram.com') && (
                                <button
                                  onClick={() => handleEnrichLead(lead.id)}
                                  className="rounded p-1 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition"
                                  title="Check Website for Contact Info"
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

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
                <span>Showing <strong>{filteredPreviewLeads.length}</strong> of <strong>{leads.length}</strong> total leads ({previewFilter === 'ALL' ? 'All' : previewFilter === 'P1' ? 'Both Phone & Email' : previewFilter === 'LINKEDIN' ? 'LinkedIn' : previewFilter === 'INSTAGRAM' ? 'Instagram' : 'Google Maps'})</span>
                <button
                  onClick={() => setActiveTab('exporter')}
                  className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Go to Leads Explorer for pagination, custom columns & filters</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCRAPER CONTROL PANEL & LIVE LOGS */}
        {activeTab === 'scraper' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Configuration Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedEngine === 'INSTAGRAM'
                      ? 'Search Instagram Leads'
                      : selectedEngine === 'LINKEDIN'
                      ? 'Search LinkedIn Leads'
                      : 'Search Google Maps'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedEngine === 'INSTAGRAM'
                      ? 'Find creators, brands, and local business accounts on Instagram'
                      : selectedEngine === 'LINKEDIN'
                      ? 'Find businesses, companies, and decision makers on LinkedIn'
                      : 'Find local businesses, phone numbers, addresses, and websites'}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 flex items-center gap-1.5 ${
                  selectedEngine === 'INSTAGRAM'
                    ? 'bg-pink-50 text-pink-700 ring-pink-200'
                    : selectedEngine === 'LINKEDIN'
                    ? 'bg-blue-50 text-blue-700 ring-blue-200'
                    : 'bg-rose-50 text-rose-700 ring-rose-200'
                }`}>
                  {selectedEngine === 'INSTAGRAM' ? (
                    <>
                      <InstagramIcon className="h-3 w-3" />
                      <span>Instagram</span>
                    </>
                  ) : selectedEngine === 'LINKEDIN' ? (
                    <>
                      <Building2 className="h-3 w-3 text-blue-600" />
                      <span>LinkedIn</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3 w-3 text-rose-600" />
                      <span>Google Maps</span>
                    </>
                  )}
                </span>
              </div>

              {/* Engine Switcher: Google Maps vs LinkedIn vs Instagram */}
              <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200 text-[11px] sm:text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedEngine('MAPS')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
                    selectedEngine === 'MAPS'
                      ? 'bg-white text-rose-700 shadow-xs border border-rose-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span className="truncate">Google Maps</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEngine('LINKEDIN')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
                    selectedEngine === 'LINKEDIN'
                      ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">LinkedIn Leads</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEngine('INSTAGRAM')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
                    selectedEngine === 'INSTAGRAM'
                      ? 'bg-white text-pink-700 shadow-xs border border-pink-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <InstagramIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Instagram Leads</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* GOOGLE MAPS FORM CONTROLS */}
                {selectedEngine === 'MAPS' && (
                  <>
                    {/* Mode Selector: Location Builder vs Freeform */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setMapsFreeform(false)}
                        className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
                          !mapsFreeform ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-rose-600" />
                          <span>Choose by Location & Niche</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapsFreeform(true)}
                        className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
                          mapsFreeform ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Search className="h-3.5 w-3.5 text-slate-500" />
                          <span>Type Custom Search</span>
                        </span>
                      </button>
                    </div>

                    {!mapsFreeform ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-3">
                        {/* Row 1: Target Country & City Dropdowns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <CountryFlag code={mapsCountryCode} className="h-3.5 w-4.5 shrink-0 rounded-xs" />
                              <label className="block text-[11px] font-semibold text-slate-700">
                                Country
                              </label>
                            </div>
                            <select
                              value={mapsCountryCode}
                              onChange={(e) => {
                                const nextCode = e.target.value;
                                setMapsCountryCode(nextCode);
                                const found = GEO_COUNTRIES.find(c => c.code === nextCode);
                                if (found && found.cities.length > 0) {
                                  setMapsCity(found.cities[0]);
                                }
                              }}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                            >
                              {GEO_COUNTRIES.map(c => (
                                <option key={c.code} value={c.code}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                              City
                            </label>
                            <select
                              value={mapsCity}
                              onChange={(e) => setMapsCity(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                            >
                              {(activeCountryObj?.cities || []).map(city => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                              <option value="Custom City">Custom City / Other...</option>
                            </select>
                          </div>
                        </div>

                        {/* Write-in input if Custom City is selected */}
                        {mapsCity === 'Custom City' && (
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                              Enter Custom City Name
                            </label>
                            <input
                              type="text"
                              value={mapsCustomCity}
                              onChange={(e) => setMapsCustomCity(e.target.value)}
                              placeholder="e.g. Asansol, Siliguri, Nagpur, Surat..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {/* Row 2: Neighborhood / Locality / Suburb */}
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                            Area / Neighborhood <span className="font-normal text-slate-500">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={mapsLocality}
                            onChange={(e) => setMapsLocality(e.target.value)}
                            placeholder="e.g. Brooklyn, Manhattan, Camden, Soho, Indiranagar, Beverly Hills..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                          />
                        </div>

                        {/* Row 3: Business Category / Niche */}
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                            Business Type / Category
                          </label>
                          <input
                            type="text"
                            value={mapsCategory}
                            onChange={(e) => setMapsCategory(e.target.value)}
                            placeholder="e.g. school, dentist, plumber, restaurant, software company..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                          />
                          {/* Quick Niche Selection Pills */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {POPULAR_NICHES.map(niche => (
                              <button
                                key={niche.label}
                                type="button"
                                onClick={() => setMapsCategory(niche.query)}
                                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
                                  mapsCategory.toLowerCase() === niche.query.toLowerCase()
                                    ? 'bg-rose-600 text-white font-semibold shadow-xs'
                                    : 'bg-white border border-rose-200 text-rose-800 hover:bg-rose-100'
                                }`}
                              >
                                {niche.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live Query Preview Badge */}
                        <div className="mt-1 rounded-lg border border-rose-200/90 bg-white p-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-0.5">
                            <Search className="h-3 w-3 text-rose-600 shrink-0" />
                            <span>Search Phrase Preview:</span>
                          </div>
                          <div className="font-mono text-xs font-semibold text-slate-900 break-all">
                            &quot;{synthesizedMapsQuery}&quot;
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Type Your Search Phrase
                        </label>
                        <input
                          type="text"
                          value={scraperQuery}
                          onChange={(e) => setScraperQuery(e.target.value)}
                          placeholder="e.g. bakeries in Brooklyn NY, dentists in Camden London, cafes in Shibuya Tokyo..."
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-600"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* LINKEDIN FORM CONTROLS */}
                {selectedEngine === 'LINKEDIN' && (
                  <>
                    {/* Mode Selector for LinkedIn: Guided Criteria vs Freeform */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setLiFreeform(false)}
                        className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
                          !liFreeform ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-blue-600" />
                          <span>Choose by Location & Business Niche</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiFreeform(true)}
                        className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
                          liFreeform ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Search className="h-3.5 w-3.5 text-slate-500" />
                          <span>Type Custom Search</span>
                        </span>
                      </button>
                    </div>

                    {!liFreeform ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-3">
                        {/* Row 1: Target Country & City Dropdowns (Aligned with Google Maps) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <CountryFlag code={liCountryCode} className="h-3.5 w-4.5 shrink-0 rounded-xs" />
                              <label className="block text-[11px] font-semibold text-slate-700">
                                Country
                              </label>
                            </div>
                            <select
                              value={liCountryCode}
                              onChange={(e) => {
                                const nextCode = e.target.value;
                                setLiCountryCode(nextCode);
                                const found = GEO_COUNTRIES.find(c => c.code === nextCode);
                                if (found && found.cities.length > 0) {
                                  setLiCity(found.cities[0]);
                                }
                              }}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                            >
                              {GEO_COUNTRIES.map(c => (
                                <option key={c.code} value={c.code}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                              City
                            </label>
                            <select
                              value={liCity}
                              onChange={(e) => setLiCity(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                            >
                              {(activeLiCountryObj?.cities || []).map(city => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                              <option value="Custom City">Custom City / Other...</option>
                            </select>
                          </div>
                        </div>

                        {/* Write-in input if Custom City is selected */}
                        {liCity === 'Custom City' && (
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                              Enter Custom City Name
                            </label>
                            <input
                              type="text"
                              value={liCustomCity}
                              onChange={(e) => setLiCustomCity(e.target.value)}
                              placeholder="e.g. Asansol, Siliguri, Austin, Manchester..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {/* Row 2: Neighborhood / Locality / Suburb */}
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                            Area / Neighborhood <span className="font-normal text-slate-500">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={liLocality}
                            onChange={(e) => setLiLocality(e.target.value)}
                            placeholder="e.g. Silicon Valley, Manhattan, Canary Wharf, Whitefield, Soho..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Row 3: Business Type / Industry Niche */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-700">
                              Business Type / Category
                            </label>
                            <span className="text-[10px] text-blue-700 font-medium">Business Niche</span>
                          </div>
                          <input
                            type="text"
                            value={liIndustry}
                            onChange={(e) => setLiIndustry(e.target.value)}
                            placeholder="e.g. SaaS, Real Estate, Healthcare, Digital Agency, Manufacturing..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                          />
                          {/* Quick Industry Pills */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {POPULAR_LI_INDUSTRIES.map((ind) => (
                              <button
                                key={ind.label}
                                type="button"
                                onClick={() => setLiIndustry(ind.query)}
                                className={`rounded-md px-2 py-0.5 text-[10px] transition ${
                                  liIndustry.toLowerCase() === ind.query.toLowerCase()
                                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                    : 'bg-white border border-blue-200 text-blue-800 hover:bg-blue-100'
                                }`}
                              >
                                {ind.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 4: Target Decision Maker / Role (Optional) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Target Decision Maker / Role <span className="font-normal text-slate-500">(Optional)</span>
                            </label>
                            <span className="text-[10px] text-blue-700 font-medium">Leadership</span>
                          </div>
                          <input
                            type="text"
                            value={liRole}
                            onChange={(e) => setLiRole(e.target.value)}
                            placeholder="e.g. Founder, CEO, Owner, Managing Director (or leave blank for all)"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                          />
                          {/* Quick Role Pills */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {POPULAR_LI_ROLES.map((r) => (
                              <button
                                key={r.label}
                                type="button"
                                onClick={() => setLiRole(r.query)}
                                className={`rounded-md px-2 py-0.5 text-[10px] transition ${
                                  liRole.toLowerCase() === r.query.toLowerCase()
                                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                    : 'bg-white border border-blue-200 text-blue-800 hover:bg-blue-100'
                                }`}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 5: Specific Target Company (Optional) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Specific Target Company <span className="font-normal text-slate-500">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={liCompany}
                            onChange={(e) => setLiCompany(e.target.value)}
                            placeholder="e.g. Stripe, Amazon, or leave blank to search all businesses in this category"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Live Query Preview Badge */}
                        <div className="mt-1 rounded-lg border border-blue-200/90 bg-white p-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-0.5">
                            <Search className="h-3 w-3 text-blue-600 shrink-0" />
                            <span>Search Phrase Preview:</span>
                          </div>
                          <div className="font-mono text-xs font-semibold text-slate-900 break-all">
                            &quot;{synthesizedLinkedInQuery}&quot;
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Type Your LinkedIn Search Phrase
                        </label>
                        <input
                          type="text"
                          value={liCustomQuery}
                          onChange={(e) => setLiCustomQuery(e.target.value)}
                          placeholder="e.g. SaaS Founders San Francisco, Real Estate Brokers London, School Directors New York..."
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* INSTAGRAM FORM CONTROLS */}
                {selectedEngine === 'INSTAGRAM' && (
                  <>
                    {/* Mode Selector for Instagram: Guided Criteria vs Freeform */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setIgFreeform(false)}
                        className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
                          !igFreeform ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <InstagramIcon className="h-3.5 w-3.5" />
                          <span>Choose by Location & Niche</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIgFreeform(true)}
                        className={`flex-1 rounded-lg py-1.5 font-semibold transition ${
                          igFreeform ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Search className="h-3.5 w-3.5 text-slate-500" />
                          <span>Type Custom Search</span>
                        </span>
                      </button>
                    </div>

                    {!igFreeform ? (
                      <div className="rounded-xl border border-pink-200 bg-pink-50/40 p-3.5 space-y-3">
                        {/* Row 1: Target Country & City Dropdowns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <CountryFlag code={igCountryCode} className="h-3.5 w-4.5 shrink-0 rounded-xs" />
                              <label className="block text-[11px] font-semibold text-slate-700">
                                Country
                              </label>
                            </div>
                            <select
                              value={igCountryCode}
                              onChange={(e) => {
                                const nextCode = e.target.value;
                                setIgCountryCode(nextCode);
                                const found = GEO_COUNTRIES.find(c => c.code === nextCode);
                                if (found && found.cities.length > 0) {
                                  setIgCity(found.cities[0]);
                                }
                              }}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-pink-500 focus:outline-none"
                            >
                              {GEO_COUNTRIES.map(c => (
                                <option key={c.code} value={c.code}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                              City
                            </label>
                            <select
                              value={igCity}
                              onChange={(e) => setIgCity(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-pink-500 focus:outline-none"
                            >
                              {(activeIgCountryObj?.cities || []).map(city => (
                                <option key={city} value={city}>{city}</option>
                              ))}
                              <option value="Custom City">Custom City / Other...</option>
                            </select>
                          </div>
                        </div>

                        {/* Write-in input if Custom City is selected */}
                        {igCity === 'Custom City' && (
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                              Enter Custom City Name
                            </label>
                            <input
                              type="text"
                              value={igCustomCity}
                              onChange={(e) => setIgCustomCity(e.target.value)}
                              placeholder="e.g. Asansol, Siliguri, Austin, Manchester..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-pink-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {/* Row 2: Neighborhood / Locality / Suburb */}
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                            Area / Neighborhood <span className="font-normal text-slate-500">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={igLocality}
                            onChange={(e) => setIgLocality(e.target.value)}
                            placeholder="e.g. South Beach, Brooklyn, Soho, Indiranagar, Beverly Hills..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-pink-500 focus:outline-none"
                          />
                        </div>

                        {/* Row 3: Business Category / Niche */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-700">
                              Business Type / Niche
                            </label>
                            <span className="text-[10px] text-pink-700 font-medium">Category</span>
                          </div>
                          <input
                            type="text"
                            value={igCategory}
                            onChange={(e) => setIgCategory(e.target.value)}
                            placeholder="e.g. Fitness Coach, Fashion Boutique, Beauty Salon, Cafe..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-pink-500 focus:outline-none"
                          />
                          {/* Quick Category Pills */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {POPULAR_IG_CATEGORIES.map((cat) => (
                              <button
                                key={cat.label}
                                type="button"
                                onClick={() => setIgCategory(cat.query)}
                                className={`rounded-md px-2 py-0.5 text-[10px] transition ${
                                  igCategory.toLowerCase() === cat.query.toLowerCase()
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-xs'
                                    : 'bg-white border border-pink-200 text-pink-800 hover:bg-pink-100/70'
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 4: Bio Focus / Intent / Role */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Bio Focus / Role / Intent <span className="font-normal text-slate-500">(Optional)</span>
                            </label>
                            <span className="text-[10px] text-pink-700 font-medium">Bio Intent</span>
                          </div>
                          <input
                            type="text"
                            value={igBioIntent}
                            onChange={(e) => setIgBioIntent(e.target.value)}
                            placeholder="e.g. DM for Collabs, Founder Owner, Bookings, Contact, Orders"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-pink-500 focus:outline-none"
                          />
                          {/* Quick Bio Intent Pills */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {POPULAR_IG_BIO_INTENTS.map((intent) => (
                              <button
                                key={intent.label}
                                type="button"
                                onClick={() => setIgBioIntent(intent.query)}
                                className={`rounded-md px-2 py-0.5 text-[10px] transition ${
                                  igBioIntent.toLowerCase() === intent.query.toLowerCase()
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-xs'
                                    : 'bg-white border border-pink-200 text-pink-800 hover:bg-pink-100/70'
                                }`}
                              >
                                {intent.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 5: Specific Brand or Handle (Optional) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Specific Brand / Handle <span className="font-normal text-slate-500">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={igBrand}
                            onChange={(e) => setIgBrand(e.target.value)}
                            placeholder="e.g. Gymshark, or leave blank to search all accounts in this category"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-pink-500 focus:outline-none"
                          />
                        </div>

                        {/* Live Query Preview Badge */}
                        <div className="mt-1 rounded-lg border border-pink-200/90 bg-white p-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-pink-700 mb-0.5">
                            <Search className="h-3 w-3 text-pink-600 shrink-0" />
                            <span>Search Phrase Preview:</span>
                          </div>
                          <div className="font-mono text-xs font-semibold text-slate-900 break-all">
                            &quot;{synthesizedInstagramQuery}&quot;
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Type Your Instagram Search Phrase
                        </label>
                        <input
                          type="text"
                          value={igCustomQuery}
                          onChange={(e) => setIgCustomQuery(e.target.value)}
                          placeholder="e.g. fitness coaches Miami, boutique bakery Soho, fashion designer Paris..."
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-pink-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-600"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Limit and Delay */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Number of Results (Limit)
                    </label>
                    <select
                      value={scraperLimit}
                      onChange={(e) => setScraperLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="5">5 results</option>
                      <option value="10">10 results (Recommended)</option>
                      <option value="20">20 results</option>
                      <option value="50">50 results</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Search Speed
                    </label>
                    <select
                      value={delayMs}
                      onChange={(e) => setDelayMs(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="500">Fast (0.5s pause)</option>
                      <option value="1000">Standard (1s pause) — Recommended</option>
                      <option value="2000">Safe & Steady (2s pause)</option>
                    </select>
                  </div>
                </div>

                {/* Website Contact Enrichment Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Find Email on Website</div>
                    <div className="text-[11px] text-slate-500">
                      Automatically check company websites for contact emails and extra phone numbers
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enrichWebsite}
                    onChange={(e) => setEnrichWebsite(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 bg-white text-rose-600 focus:ring-rose-500"
                  />
                </div>

                {/* Optional Email Notification */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      <span>Send Summary Email to (Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                  </div>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="Enter email to auto-send results, or leave blank to skip"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    If left blank, no email is sent. You can always dispatch emails manually from the Dispatch Email tab.
                  </p>
                </div>

                {/* Outbound Webhook Input (Optional) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Webhook className="h-3.5 w-3.5 text-slate-500" />
                      <span>Dispatch Webhook to (Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                  </div>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/... or Zapier/Make URL"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    POSTs JSON completion payload to Slack, Discord, Zapier, Make, or any webhook upon completion.
                  </p>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  disabled={isScraping}
                  onClick={handleStartScrape}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition active:scale-[0.98] ${
                    isScraping
                      ? 'cursor-not-allowed bg-slate-800 opacity-60'
                      : selectedEngine === 'INSTAGRAM'
                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:from-purple-700 hover:via-pink-700 hover:to-rose-600 shadow-pink-500/25'
                      : selectedEngine === 'LINKEDIN'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {isScraping ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>
                        {selectedEngine === 'INSTAGRAM'
                          ? 'Searching Instagram Profiles...'
                          : selectedEngine === 'LINKEDIN'
                          ? 'Searching LinkedIn Profiles...'
                          : 'Searching Google Maps...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>
                        {selectedEngine === 'INSTAGRAM'
                          ? 'Start Instagram Search'
                          : selectedEngine === 'LINKEDIN'
                          ? 'Start LinkedIn Search'
                          : 'Start Google Maps Search'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Live Activity Stream Terminal */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-7">
              {/* Terminal Window Header */}
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-mono text-xs font-semibold text-slate-900">
                    Search Activity & Progress
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {isScraping && (
                    <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                      Active
                    </span>
                  )}
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoScrollLogs}
                      onChange={(e) => setAutoScrollLogs(e.target.checked)}
                      className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Auto-scroll</span>
                  </label>
                  <button
                    onClick={() => setLiveLogs([])}
                    className="text-[11px] text-slate-500 hover:text-slate-800 transition"
                  >
                    Clear Updates
                  </button>
                </div>
              </div>

              {/* Terminal Logs Window (High-contrast Developer Dark Screen) */}
              <div
                ref={logContainerRef}
                className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed max-h-[460px] min-h-[360px] rounded-xl bg-slate-950 p-3 space-y-1 border border-slate-900 shadow-inner"
              >
                {liveLogs.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-16 text-slate-500">
                    <Terminal className="h-8 w-8 mb-2 opacity-40 text-slate-500" />
                    <span className="font-medium text-slate-400">No active search right now.</span>
                    <span className="text-[10px] text-slate-500 mt-1">Select a location and business type above, then click Find Leads Now.</span>
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
              </div>

              {/* Job Completed Summary Banner */}
              {jobSummary && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Search Complete (All Leads Saved to Database)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('exporter')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition active:scale-[0.98]"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Select Columns & Export / Email Table</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="rounded-lg bg-white p-1.5 border border-emerald-200">
                      <div className="font-bold text-slate-900">{jobSummary.leadsCollected}</div>
                      <div className="text-slate-500">New Leads</div>
                    </div>
                    <div className="rounded-lg bg-white p-1.5 border border-emerald-200">
                      <div className="font-bold text-amber-600">{jobSummary.duplicatesSkipped}</div>
                      <div className="text-slate-500">Duplicates Skipped</div>
                    </div>
                    <div className="rounded-lg bg-white p-1.5 border border-emerald-200">
                      <div className="font-bold text-rose-600">{jobSummary.errorsCount}</div>
                      <div className="text-slate-500">Errors</div>
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Email Leads Dispatch & Notification Center</h2>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                      SMTP Ready
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Dispatch customized executive lead reports with <code className="text-slate-700 font-semibold">Master_B2B_Leads.xlsx</code> attached directly to any email address.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={sendingTestEmail}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                  >
                    {sendingTestEmail ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    <span>{sendingTestEmail ? 'Sending Test...' : 'Send Quick Ping'}</span>
                  </button>
                </div>
              </div>

              {emailStatusMsg && (
                <div
                  className={`mt-4 flex items-center justify-between rounded-xl p-3 text-xs ${
                    emailStatusMsg.type === 'success'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {emailStatusMsg.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    )}
                    <span>{emailStatusMsg.text}</span>
                  </div>
                  <button onClick={() => setEmailStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
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
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Send className="h-4 w-4 text-blue-600" />
                    Compose Leads Dispatch
                  </h3>

                  {/* Recipient Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Recipient Email Address <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="e.g. client@company.com"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    {/* Quick-fill Pills */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500">Quick select:</span>
                      <button
                        type="button"
                        onClick={() => setEmailRecipient('saurabhkumar.sakr@gmail.com')}
                        className={`rounded-lg px-2.5 py-0.5 transition ${
                          emailRecipient === 'saurabhkumar.sakr@gmail.com'
                            ? 'bg-blue-50 text-blue-700 border border-blue-300 font-medium'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        saurabhkumar.sakr@gmail.com (Recipient)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailRecipient('saurabh7739278614@gmail.com')}
                        className={`rounded-lg px-2.5 py-0.5 transition ${
                          emailRecipient === 'saurabh7739278614@gmail.com'
                            ? 'bg-blue-50 text-blue-700 border border-blue-300 font-medium'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        saurabh7739278614@gmail.com (Sender)
                      </button>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Subject Line <span className="text-slate-500 font-normal">(optional — default auto-computed)</span>
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={`B2B Leads Report — ${previewLeadsCount} Companies (Master_B2B_Leads.xlsx)`}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  {/* Filter Scope & Attach Toggle (Grid) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Geographic Scope Filter
                      </label>
                      <select
                        value={emailCountryFilter}
                        onChange={(e) => setEmailCountryFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Attachment Option
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 cursor-pointer hover:border-slate-300 transition">
                        <input
                          type="checkbox"
                          checked={emailAttachExcel}
                          onChange={(e) => setEmailAttachExcel(e.target.checked)}
                          className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
                        />
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-800">
                          <MicrosoftExcelIcon className="h-3.5 w-3.5 shrink-0" />
                          Attach Master_B2B_Leads.xlsx
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Message / Personal Note */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Personal Message / Cover Note
                    </label>
                    <textarea
                      rows={3}
                      value={emailCustomNote}
                      onChange={(e) => setEmailCustomNote(e.target.value)}
                      placeholder="Add personal notes, instructions or executive commentary..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  {/* Action Row */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-900">{previewLeadsCount}</span> leads queued
                      {emailAttachExcel && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          <MicrosoftExcelIcon className="h-3 w-3" />
                          Excel attached
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingCustomEmail}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
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
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-rose-200 bg-rose-50 text-rose-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {customEmailResult.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600 shrink-0" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold text-sm">
                          {customEmailResult.type === 'success' ? 'Email Dispatched Successfully' : 'Email Dispatch Failed'}
                        </div>
                        <div>{customEmailResult.text}</div>
                        {customEmailResult.messageId && (
                          <div className="font-mono text-[11px] text-slate-600">
                            Message-ID: {customEmailResult.messageId}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setCustomEmailResult(null)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Live Inbox Preview (5 cols) */}
              <div className="space-y-4 lg:col-span-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span>Live Recipient Inbox Preview</span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">HTML Format</span>
                  </div>

                  {/* Email Envelope Container */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs shadow-inner">
                    {/* Meta Header */}
                    <div className="space-y-1 border-b border-slate-200 pb-3 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">From:</span>
                        <span className="font-medium text-slate-800">
                          B2B Lead Scraper &lt;{health?.email?.from || 'saurabh7739278614@gmail.com'}&gt;
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">To:</span>
                        <span className="font-medium text-blue-600">{emailRecipient || 'recipient@domain.com'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subject:</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[240px]">
                          {emailSubject || `B2B Leads Report — ${previewLeadsCount} Companies (Master_B2B_Leads.xlsx)`}
                        </span>
                      </div>
                    </div>

                    {/* Email Body Mockup */}
                    <div className="mt-3.5 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xs">
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
                            <tr className="border-b border-slate-200">
                              <td className="py-1 text-slate-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span>Generated:</span>
                              </td>
                              <td className="py-1 text-right font-medium text-slate-800">Today, Just now</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1 text-slate-500 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-600" />
                                <span>Total Companies:</span>
                              </td>
                              <td className="py-1 text-right font-bold text-emerald-600">{previewLeadsCount} leads</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1 text-slate-500 flex items-center gap-1">
                                <Globe2 className="h-3 w-3 text-slate-400" />
                                <span>Coverage:</span>
                              </td>
                              <td className="py-1 text-right font-medium text-slate-800">
                                {emailCountryFilter || 'All Countries'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 text-slate-500 flex items-center gap-1.5">
                                <MicrosoftExcelIcon className="h-3.5 w-3.5 shrink-0" />
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
                        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-900">
                          <MicrosoftExcelIcon className="h-4 w-4 shrink-0" />
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Recent Email Dispatches
                </h3>
                <span className="text-xs text-slate-500">
                  {sentEmailHistory.length} sent in this session
                </span>
              </div>

              {sentEmailHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                  No email reports dispatched in this session yet. Compose an email above to send the Master Excel report.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Recipient</th>
                        <th className="px-3.5 py-2.5">Subject</th>
                        <th className="px-3.5 py-2.5">Leads</th>
                        <th className="px-3.5 py-2.5">Time</th>
                        <th className="px-3.5 py-2.5">Status / Message-ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {sentEmailHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="px-3.5 py-2.5 font-medium text-slate-900">{item.recipient}</td>
                          <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate">{item.subject}</td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-emerald-600">{item.leadsCount}</td>
                          <td className="px-3.5 py-2.5 text-slate-500">{item.timestamp}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-blue-600">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 mr-1.5 ring-1 ring-emerald-200">
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-4 text-base font-bold text-slate-900">Scrape Job History</h2>
            {jobs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No jobs run yet.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {jobs.map((job) => (
                  <div key={job.id} className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          Job #{job.id.slice(0, 8)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                            job.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-blue-50 text-blue-700 ring-blue-200'
                          }`}
                        >
                          {job.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          Started: {new Date(job.started_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Countries: {Array.isArray(job.countries) ? job.countries.join(', ') : 'All'}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-emerald-600 font-semibold">
                        +{job.leads_collected} leads
                      </div>
                      <div className="text-amber-600">
                        {job.duplicates_skipped} duplicates
                      </div>
                      <div className="text-slate-500">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-bold text-slate-900">REST API Endpoints</h2>
              <p className="text-xs text-slate-500 mb-4">
                Full programmatic access to run scrapers, query leads, and stream Excel files.
              </p>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-700 border border-blue-200">POST</span>
                    <span className="text-slate-900 font-semibold">/api/scrape</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Triggers a Google Maps scrape job. Supports live updates with <code>Accept: text/event-stream</code>.
                  </p>
                  <pre className="mt-2 rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 border border-slate-900 shadow-inner">
{`curl -X POST http://localhost:3000/api/scrape \\
  -H "Content-Type: application/json" \\
  -d '{"query": "bakery in Brooklyn, New York", "limit": 20, "enrich": true}'`}
                  </pre>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">GET</span>
                    <span className="text-slate-900 font-semibold">/api/leads</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Query stored leads with search, country, hasEmail, and hasPhone filters.
                  </p>
                  <pre className="mt-2 rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 border border-slate-900 shadow-inner">
{`curl "http://localhost:3000/api/leads?country=Norway&hasEmail=true&limit=50"`}
                  </pre>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">GET</span>
                    <span className="text-slate-900 font-semibold">/api/export</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Streams the generated <code>Master_B2B_Leads.xlsx</code> Excel workbook for download.
                  </p>
                  <pre className="mt-2 rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 border border-slate-900 shadow-inner">
{`curl -O http://localhost:3000/api/export`}
                  </pre>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">GET</span>
                    <span className="text-slate-900 font-semibold">/api/custom-export/master</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Returns structured records, available columns, and metrics parsed from <code>exports/Master_B2B_Leads.xlsx</code>.
                  </p>
                  <pre className="mt-2 rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 border border-slate-900 shadow-inner">
{`curl "http://localhost:3000/api/custom-export/master"`}
                  </pre>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-700 border border-blue-200">POST</span>
                    <span className="text-slate-900 font-semibold">/api/custom-export/download</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Generates and streams a custom-filtered Excel file with only the user-selected columns and filtered rows.
                  </p>
                  <pre className="mt-2 rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 border border-slate-900 shadow-inner">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedLead.company_name}</h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <CountryFlag code={selectedLead.country} className="h-3 w-4.5" />
                  <span className="text-slate-600 font-medium">{selectedLead.country}</span>
                  <span className="text-slate-300">•</span>
                  <select
                    value={selectedLead.status || 'Active'}
                    onChange={(e) => handleUpdateLeadStatus(selectedLead.id, e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Meeting Scheduled">Meeting Scheduled</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Unqualified">Unqualified</option>
                    <option value="Converted">Converted</option>
                  </select>
                  <span className="text-slate-300">•</span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                    (selectedLead.source || '').toLowerCase().includes('instagram')
                      ? 'bg-pink-50 text-pink-700 ring-1 ring-pink-200'
                      : (selectedLead.source || '').toLowerCase().includes('linkedin')
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {(selectedLead.source || '').toLowerCase().includes('instagram') && (
                      <InstagramIcon className="h-2.5 w-2.5 shrink-0" />
                    )}
                    {(selectedLead.source || '').toLowerCase().includes('linkedin') && (
                      <Building2 className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                    )}
                    <span>{selectedLead.source || 'Scraped Lead'}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-slate-500">Registration Number</div>
                  <div className="font-mono font-medium text-slate-900">
                    {selectedLead.registration_number || 'N/A'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-slate-500">Company Type</div>
                  <div className="font-medium text-slate-900">{selectedLead.company_type || 'N/A'}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <div className="text-slate-500">Director / Officers</div>
                <div className="font-medium text-slate-900">{selectedLead.director || 'None recorded'}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <div className="text-slate-500">Registered Address</div>
                <div className="text-slate-900">{selectedLead.address || 'N/A'}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email (Priority 1)</span>
                    {selectedLead.email && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(selectedLead.email, 'modal_email')}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                        title="Copy Email"
                      >
                        {copiedId === 'modal_email' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedId === 'modal_email' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-emerald-600 font-semibold mt-1 truncate" title={selectedLead.email}>
                    {selectedLead.email || 'None discovered'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone (Priority 1)</span>
                    {selectedLead.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(selectedLead.phone, 'modal_phone')}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                        title="Copy Phone"
                      >
                        {copiedId === 'modal_phone' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedId === 'modal_phone' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-emerald-600 font-semibold mt-1 truncate" title={selectedLead.phone}>
                    {selectedLead.phone || 'None recorded'}
                  </div>
                </div>
              </div>

              {selectedLead.website && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-slate-500">
                    {selectedLead.website.includes('instagram.com')
                      ? 'Instagram Profile'
                      : selectedLead.website.includes('linkedin.com')
                      ? 'LinkedIn Profile'
                      : 'Website (Priority 2)'}
                  </div>
                  <a
                    href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:underline mt-0.5 font-medium truncate"
                  >
                    <span className="truncate">{selectedLead.website}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <div className="flex items-center gap-2">
                {selectedLead.phone && (
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100 transition"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call</span>
                  </a>
                )}
                {selectedLead.email && (
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 text-xs font-semibold hover:bg-blue-100 transition"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Send Email</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedLead.website && !selectedLead.website.includes('linkedin.com') && !selectedLead.website.includes('instagram.com') && (
                  <button
                    onClick={() => handleEnrichLead(selectedLead.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Find Website Contacts</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-xs"
                  title="Delete this lead"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
