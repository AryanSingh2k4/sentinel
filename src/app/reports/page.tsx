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
    <div className="min-h-screen bg-[#ffffff] dark:bg-[#000000] font-sans text-[#171717] dark:text-[#ededed] pb-20 transition-colors duration-150">
      {/* Top Navigation */}
      <nav className="border-b border-[#ebebeb] dark:border-[#222222] bg-[#ffffff] dark:bg-[#000000] sticky top-0 z-40">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2.5">
                <div className="h-6 w-6 rounded-[6px] bg-[#171717] dark:bg-[#ededed] flex items-center justify-center text-white dark:text-[#000000]">
                  <Shield className="h-3.5 w-3.5" fill="currentColor" />
                </div>
                <span className="font-medium tracking-tight text-[#171717] dark:text-[#ededed] text-[15px]">Sentinel</span>
              </Link>
              <div className="hidden md:flex space-x-6 text-[14px] font-medium">
                <Link href="/" className="text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors py-[15px]">Dashboard</Link>
                <Link href="/github-scanner" className="text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors py-[15px] flex items-center gap-1.5">
                  <span>GitHub Scanner</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#fafafa] dark:bg-[#111111] text-[#171717] dark:text-[#ededed] border border-[#ebebeb] dark:border-[#222222]">Secrets</span>
                </Link>
                <Link href="/reports" className="text-[#171717] dark:text-[#ededed] border-b-2 border-[#171717] dark:border-[#ededed] py-[15px]">Reports</Link>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Link 
                href="/"
                className="flex items-center gap-1.5 text-[13px] text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[24px] font-medium tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2.5">
              <FileText className="h-6 w-6 text-[#171717] dark:text-[#ededed]" />
              Security Assessment Reports
            </h1>
            <p className="text-[14px] text-[#8f8f8f] mt-1">
              Automated audit reports synthesized by Sentinel with executive risk summaries and vulnerability breakdowns.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#8f8f8f] flex items-center justify-center gap-3 font-mono text-[14px]">
            <Activity className="h-5 w-5 animate-spin text-[#171717] dark:text-[#ededed]" />
            <span>Loading security reports...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#fecaca] dark:border-[#ef4444]/30 rounded-[16px] text-center">
            <AlertTriangle className="h-6 w-6 text-[#dc2626] dark:text-[#ef4444] mx-auto mb-2" />
            <p className="text-[14px] text-[#171717] dark:text-[#ededed]">{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[16px] text-center shadow-none">
            <FileText className="h-10 w-10 text-[#8f8f8f] mx-auto mb-3 opacity-40" />
            <h3 className="text-[16px] font-medium text-[#171717] dark:text-[#ededed]">No Reports Generated Yet</h3>
            <p className="text-[14px] text-[#8f8f8f] mt-1 max-w-md mx-auto">
              Run a scan from the dashboard. Once the scan completes, the Report Agent will automatically publish the audit here.
            </p>
            <Link 
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-[#171717] hover:bg-[#000000] dark:bg-[#ededed] dark:hover:bg-[#ffffff] text-[#ffffff] dark:text-[#000000] text-[13px] font-medium rounded-full transition-colors"
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
                  className="p-6 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 rounded-[16px] transition-all shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f0fdf4] dark:bg-[#16a34a]/10 border border-[#bbf7d0] dark:border-[#16a34a]/30 text-[#16a34a] dark:text-[#22c55e] text-[11px] font-mono uppercase tracking-wider">
                        AI Verified Audit
                      </span>
                      <span className="text-[12px] font-mono text-[#8f8f8f] flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <h2 className="text-[18px] font-medium text-[#171717] dark:text-[#ededed] tracking-tight">
                      {domainName}
                    </h2>
                    
                    <p className="text-[13px] text-[#8f8f8f] mt-2 line-clamp-2 leading-relaxed">
                      {cleanSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/reports/${r.scan_id}?download=json`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-[#ffffff] dark:bg-[#111111] hover:bg-[#fafafa] dark:hover:bg-[#171717] text-[#171717] dark:text-[#ededed] border border-[#ebebeb] dark:border-[#222222] rounded-full text-[13px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-[#8f8f8f]" />
                      <span>JSON</span>
                    </a>
                    
                    <Link
                      href={`/reports/${r.scan_id}`}
                      className="px-4 py-1.5 bg-[#171717] hover:bg-[#000000] dark:bg-[#ededed] dark:hover:bg-[#ffffff] text-[#ffffff] dark:text-[#000000] rounded-full text-[13px] font-medium transition-colors flex items-center gap-1.5 font-sans shadow-none"
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
