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
    <div className="min-h-screen bg-[#121212] font-sans text-[#fafafa] pb-20">
      {/* Top Navigation */}
      <nav className="border-b border-[#2e2e2e] bg-[#171717]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-[#3ecf8e]" strokeWidth={2} fill="currentColor" />
                <span className="font-medium tracking-tight text-[#fafafa]">Sentinel</span>
              </Link>
              <div className="hidden md:flex space-x-6 text-[14px] font-medium">
                <Link href="/" className="text-[#b4b4b4] hover:text-[#fafafa] transition-colors py-[15px]">Dashboard</Link>
                <Link href="/reports" className="text-[#fafafa] border-b-2 border-[#3ecf8e] py-[15px]">Reports</Link>
              </div>
            </div>

            <Link 
              href="/"
              className="flex items-center gap-1.5 text-[13px] text-[#898989] hover:text-[#fafafa] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[#fafafa] flex items-center gap-2.5">
              <FileText className="h-6 w-6 text-[#3ecf8e]" />
              Security Assessment Reports
            </h1>
            <p className="text-[14px] text-[#898989] mt-1">
              Automated audit reports synthesized by Sentinel AI with executive risk summaries and vulnerability breakdowns.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#898989] flex items-center justify-center gap-3 font-mono text-[14px]">
            <Activity className="h-5 w-5 animate-spin text-[#3ecf8e]" />
            <span>Loading security reports...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-[#171717] border border-[#ef4444]/30 rounded-xl text-center">
            <AlertTriangle className="h-6 w-6 text-[#ef4444] mx-auto mb-2" />
            <p className="text-[14px] text-[#fafafa]">{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 bg-[#171717] border border-[#2e2e2e] rounded-xl text-center">
            <FileText className="h-10 w-10 text-[#898989] mx-auto mb-3 opacity-40" />
            <h3 className="text-[16px] font-medium text-[#fafafa]">No Reports Generated Yet</h3>
            <p className="text-[14px] text-[#898989] mt-1 max-w-md mx-auto">
              Run a scan from the dashboard. Once the scan completes, the Report Agent will automatically publish the audit here.
            </p>
            <Link 
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-[#3ecf8e] text-[#0f0f0f] text-[13px] font-medium rounded-lg hover:bg-[#33b078] transition-colors"
            >
              Start New Scan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reports.map((r) => {
              let domainName = 'Target Application';
              if (r.scans?.targets) {
                if (Array.isArray(r.scans.targets) && r.scans.targets.length > 0) {
                  domainName = r.scans.targets[0].domain;
                } else if ((r.scans.targets as any).domain) {
                  domainName = (r.scans.targets as any).domain;
                }
              }

              // Sanitize any thought block in summary
              const cleanSummary = (r.summary || 'Security assessment completed.')
                .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
                .trim();

              return (
                <div 
                  key={r.id}
                  className="p-6 bg-[#171717] border border-[#2e2e2e] hover:border-[#3ecf8e]/40 rounded-xl transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] text-[11px] font-mono uppercase tracking-wider">
                        AI Verified Audit
                      </span>
                      <span className="text-[12px] font-mono text-[#898989] flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <h2 className="text-[18px] font-semibold text-[#fafafa] tracking-tight">
                      {domainName}
                    </h2>
                    
                    <p className="text-[13px] text-[#898989] mt-2 line-clamp-2 leading-relaxed">
                      {cleanSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/reports/${r.scan_id}?download=json`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-[#202020] hover:bg-[#282828] text-[#fafafa] border border-[#333] rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-[#898989]" />
                      <span>JSON</span>
                    </a>
                    
                    <Link
                      href={`/reports/${r.scan_id}`}
                      className="px-4 py-2 bg-[#3ecf8e] hover:bg-[#33b078] text-[#0f0f0f] rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5 font-medium"
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
