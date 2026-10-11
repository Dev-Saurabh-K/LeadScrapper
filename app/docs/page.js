'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Terminal, Copy, Check, ExternalLink, Code2 } from 'lucide-react';

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
    <div className="relative min-h-screen bg-[#030712] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Ambient Acrylic Glow Effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[1000px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/75 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-base font-bold text-white tracking-tight">API Reference & Documentation</h1>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 font-mono">
            OpenAPI 3.0
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
              <Code2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">B2B Lead Scraper REST API</h2>
          </div>
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
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

                return (
                  <div
                    key={`${method}-${path}`}
                    className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 shadow-xl backdrop-blur-xl transition hover:border-white/10"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 bg-slate-950/60 px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold uppercase ${methodColor}`}
                        >
                          {method}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-200">{path}</span>
                      </div>
                      <span className="text-xs text-slate-400">{details.summary}</span>
                    </div>

                    <div className="p-5 space-y-4 text-xs">
                      {details.description && (
                        <p className="text-slate-300 leading-relaxed">{details.description}</p>
                      )}

                      {/* Parameters */}
                      {details.parameters && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Query Parameters
                          </h4>
                          <div className="rounded-xl border border-white/5 bg-slate-950 divide-y divide-white/[0.04]">
                            {details.parameters.map((p) => (
                              <div key={p.name} className="flex items-center justify-between p-2.5">
                                <span className="font-mono text-slate-200">{p.name}</span>
                                <span className="text-slate-500 font-mono text-[11px]">{p.schema?.type || 'string'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Example cURL */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
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
                            className="text-slate-400 hover:text-white transition"
                          >
                            {copiedPath === `${method}-${path}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <pre className="rounded-xl bg-black/60 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto border border-white/5">
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
