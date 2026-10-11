'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Terminal, Copy, Check, ExternalLink } from 'lucide-react';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);
  const [copiedPath, setCopiedPath] = useState(null);

  useEffect(() => {
    fetch('/api/docs')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error(err));
  }, []);

  const copyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(id);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-base font-bold text-white">API Reference & Documentation</h1>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            OpenAPI 3.0
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold text-white">B2B Lead Scraper REST API</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            All endpoints are accessible over standard HTTP/HTTPS. Built with Next.js 16 Route Handlers,
            offering high concurrency, polite multi-country scraping, and direct file streaming.
          </p>
        </div>

        <div className="space-y-6">
          {spec &&
            Object.entries(spec.paths).map(([path, methods]) =>
              Object.entries(methods).map(([method, details]) => {
                const methodColor =
                  method.toUpperCase() === 'POST'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

                return (
                  <div
                    key={`${method}-${path}`}
                    className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-xs font-bold uppercase ${methodColor}`}
                        >
                          {method}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-200">{path}</span>
                      </div>
                      <span className="text-xs text-slate-400">{details.summary}</span>
                    </div>

                    <div className="p-4 space-y-3 text-xs">
                      {details.description && (
                        <p className="text-slate-300 leading-relaxed">{details.description}</p>
                      )}

                      {/* Parameters */}
                      {details.parameters && (
                        <div>
                          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Query Parameters
                          </h4>
                          <div className="rounded-lg border border-slate-800/80 bg-slate-950 divide-y divide-slate-800/60">
                            {details.parameters.map((p) => (
                              <div key={p.name} className="flex items-center justify-between p-2">
                                <span className="font-mono text-slate-200">{p.name}</span>
                                <span className="text-slate-500">{p.schema?.type || 'string'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Example cURL */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            cURL Example
                          </span>
                          <button
                            onClick={() =>
                              copyCode(
                                method.toUpperCase() === 'GET'
                                  ? `curl "http://localhost:3000${path}"`
                                  : `curl -X POST "http://localhost:3000${path}" -H "Content-Type: application/json" -d '{}'`,
                                `${method}-${path}`
                              )
                            }
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedPath === `${method}-${path}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <pre className="rounded-lg bg-black/50 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto">
                          {method.toUpperCase() === 'GET'
                            ? `curl "http://localhost:3000${path}"`
                            : `curl -X POST "http://localhost:3000${path}" \\
  -H "Content-Type: application/json" \\
  -d '{"countries": ["NO", "FR", "SG", "US"], "limit": 20}'`}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
        </div>
      </main>
    </div>
  );
}
