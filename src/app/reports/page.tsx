'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  ArrowLeft, 
  FileText, 
  Download, 
  ExternalLink, 
  Calendar, 
  Globe, 
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Navbar } from '@/components/Navbar';

interface ReportListItem {
  id: string;
  scan_id: string;
  title: string;
  summary: string;
  created_at: string;
  scans: {
    id: string;
    status: string;
    started_at: string;
    completed_at: string;
    targets: {
      domain: string;
      base_url: string;
    } | Array<{ domain: string; base_url: string }>;
  };
}

export default function ReportsListPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const res = await fetch('/api/reports');
        if (!res.ok) throw new Error('Failed to fetch reports');
        const data = await res.json();
        setReports(data.reports || []);
      } catch (err: any) {
        setError(err.message || 'Error loading reports');
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20 transition-colors duration-150">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[24px] font-serif font-medium tracking-tight text-foreground flex items-center gap-2.5">
              <FileText className="h-6 w-6 text-primary" />
              Security Assessment Reports
            </h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              Automated audit reports synthesized by Sentinel with executive risk summaries and vulnerability breakdowns.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-3 font-mono text-[14px]">
            <Activity className="h-5 w-5 animate-spin text-primary" />
            <span>Loading security reports...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-card border border-destructive/20 rounded-[16px] text-center shadow-xs">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-[14px] text-foreground">{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 bg-card border border-border rounded-[16px] text-center shadow-xs">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-[16px] font-serif font-medium text-foreground">No Reports Generated Yet</h3>
            <p className="text-[14px] text-muted-foreground mt-1 max-w-md mx-auto">
              Run a scan from the dashboard. Once the scan completes, the Report Agent will automatically publish the audit here.
            </p>
            <Link 
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-[13px] font-medium rounded-full transition-colors shadow-xs"
            >
              Start New Scan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reports.map((r) => {
              const domainName =
                (Array.isArray(r.scans?.targets)
                  ? r.scans?.targets?.[0]?.domain
                  : (r.scans?.targets as any)?.domain) || 'Target Application';

              // Sanitize any thought block in summary
              const cleanSummary = (r.summary || 'Security assessment completed.')
                .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
                .trim();

              return (
                <div 
                  key={r.id}
                  className="p-6 bg-card border border-border hover:border-primary/40 rounded-[16px] transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono uppercase tracking-wider">
                        AI Verified Audit
                      </span>
                      <span className="text-[12px] font-mono text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <h2 className="text-[18px] font-serif font-medium text-foreground tracking-tight">
                      {domainName}
                    </h2>
                    
                    <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {cleanSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/reports/${r.scan_id}?download=json`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-card hover:bg-secondary text-foreground border border-border rounded-full text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>JSON</span>
                    </a>
                    
                    <Link
                      href={`/reports/${r.scan_id}`}
                      className="px-4 py-1.5 bg-primary hover:opacity-90 text-primary-foreground rounded-full text-[13px] font-medium transition-colors flex items-center gap-1.5 font-sans shadow-xs"
                    >
                      <span>View Full Report</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
