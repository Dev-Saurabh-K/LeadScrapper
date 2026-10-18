'use client';

import React from 'react';
import { Globe, MapPin } from 'lucide-react';

export default function CountryFlag({ code, className = "h-3.5 w-5" }) {
  const c = (code || '').toUpperCase().trim();

  if (c === 'MAPS' || c === 'GMAPS' || c === 'GOOGLE MAPS') {
    return <MapPin className={`${className} text-rose-500 shrink-0`} />;
  }
  if (c === 'EU' || c === 'EUROPE' || c === 'EUROPEAN UNION') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="22" height="16" fill="#003399" />
        <circle cx="11" cy="4" r="0.8" fill="#FFCC00" />
        <circle cx="14" cy="5.2" r="0.8" fill="#FFCC00" />
        <circle cx="15.2" cy="8" r="0.8" fill="#FFCC00" />
        <circle cx="14" cy="10.8" r="0.8" fill="#FFCC00" />
        <circle cx="11" cy="12" r="0.8" fill="#FFCC00" />
        <circle cx="8" cy="10.8" r="0.8" fill="#FFCC00" />
        <circle cx="6.8" cy="8" r="0.8" fill="#FFCC00" />
        <circle cx="8" cy="5.2" r="0.8" fill="#FFCC00" />
      </svg>
    );
  }
  if (c === 'GLOBAL' || c === 'GL' || c === 'WORLD') {
    return <Globe className={`${className} text-emerald-500 shrink-0`} />;
  }
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
  if (c === 'IN' || c === 'INDIA') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="22" height="5.33" fill="#FF9933" />
        <rect y="5.33" width="22" height="5.34" fill="#FFFFFF" />
        <rect y="10.67" width="22" height="5.33" fill="#138808" />
        <circle cx="11" cy="8" r="1.8" fill="none" stroke="#000080" strokeWidth="0.8" />
      </svg>
    );
  }
  if (c === 'DE' || c === 'GERMANY') {
    return (
      <svg viewBox="0 0 22 16" className={`${className} rounded-xs shadow-xs shrink-0 overflow-hidden`}>
        <rect width="22" height="5.33" fill="#000000" />
        <rect y="5.33" width="22" height="5.34" fill="#DD0000" />
        <rect y="10.67" width="22" height="5.33" fill="#FFCE00" />
      </svg>
    );
  }
  return <Globe className={`${className} text-slate-400 shrink-0`} />;
}
