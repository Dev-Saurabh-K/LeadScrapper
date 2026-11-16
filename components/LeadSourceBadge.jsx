'use client';

import React from 'react';
import { MapPin, Building2, Landmark, ExternalLink } from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import FacebookIcon from './FacebookIcon';
import { detectLeadSource } from '@/lib/utils/source_detector';

/**
 * Renders a branded origin badge with SVG icon and platform handle
 * STRICT RULE: Zero emojis. Only SVG vector icons.
 *
 * @param {object} props
 * @param {object} props.lead - Full lead object or { source, registration_number, website }
 * @param {'sm'|'md'|'lg'} [props.size='sm'] - Badge size
 * @param {boolean} [props.showHandle=true] - Whether to show the handle/reg pill
 * @param {boolean} [props.clickable=true] - Whether handle links to external profile if available
 * @param {string} [props.className=''] - Additional custom class
 */
export default function LeadSourceBadge({
  lead,
  size = 'sm',
  showHandle = true,
  clickable = true,
  className = ''
}) {
  if (!lead) return null;

  const meta = detectLeadSource(lead);

  const renderIcon = (iconSizeClass) => {
    switch (meta.engine) {
      case 'INSTAGRAM':
        return <InstagramIcon className={`${iconSizeClass} shrink-0`} />;
      case 'FACEBOOK':
        return <FacebookIcon className={`${iconSizeClass} shrink-0`} />;
      case 'LINKEDIN':
        return <Building2 className={`${iconSizeClass} text-[#0A66C2] shrink-0`} />;
      case 'MAPS':
        return <MapPin className={`${iconSizeClass} text-rose-600 shrink-0`} />;
      case 'REGISTRY':
      default:
        return <Landmark className={`${iconSizeClass} text-indigo-600 shrink-0`} />;
    }
  };

  if (size === 'lg') {
    return (
      <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} shadow-2xs`}
        >
          {renderIcon('h-3.5 w-3.5')}
          <span>{meta.label}</span>
        </span>
        {showHandle && meta.handle && (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
            <span>{meta.handle}</span>
            {clickable && meta.url && (
              <a
                href={meta.url.startsWith('http') ? meta.url : `https://${meta.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 transition"
                title={`Open ${meta.label} Page`}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </span>
        )}
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
        >
          {renderIcon('h-3 w-3')}
          <span>{meta.label}</span>
        </span>
        {showHandle && meta.handle && (
          <span className="font-mono text-[10px] text-slate-600 truncate max-w-[120px]">
            {meta.handle}
          </span>
        )}
      </div>
    );
  }

  // size === 'sm' (Compact for table cells)
  return (
    <div className={`inline-flex flex-col gap-0.5 max-w-[150px] ${className}`}>
      <span
        className={`inline-flex items-center gap-1 w-fit rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
      >
        {renderIcon('h-2.5 w-2.5')}
        <span>{meta.label}</span>
      </span>
      {showHandle && meta.handle && (
        <span
          className="font-mono text-[10px] text-slate-600 truncate max-w-[140px] leading-tight"
          title={meta.handle}
        >
          {meta.handle}
        </span>
      )}
    </div>
  );
}
