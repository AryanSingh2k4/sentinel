'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Shield, 
  ArrowLeft, 
  Download, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Globe, 
  Calendar, 
  Clock, 
  Activity,
  FileText,
  Lock,
  ExternalLink
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface ReportData {
  meta: {
    reportId: string | null;
    scanId: string;
    target: string;
    baseUrl: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    generatedAt: string;
  };
  summary: {
    title: string;
    executiveSummary: string;
    urlsMapped: number;
    technologiesFound: number;
    candidateFindingsCount: number;
    confirmedVulnerabilitiesCount: number;
    falsePositivesCount: number;
    severityBreakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  technologies: Array<{ id: string; technology: string; confidence: number }>;
  verifiedFindings: Array<{
    id: string;
    severity: string;
    confirmed: boolean;
    created_at: string;
    candidate_findings: {
      id: string;
      title: string;
      reasoning: string;
      confidence: number;
    };
  }>;
  falsePositives: Array<{
    id: string;
    severity: string;
    confirmed: boolean;
    created_at: string;
    candidate_findings: {
      id: string;
      title: string;
      reasoning: string;
      confidence: number;
    };
  }>;
}

export default function ReportPage() {
  const params = useParams();
  const scanId = params?.scanId as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId) return;

    async function fetchReport() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/${scanId}`);
        if (!res.ok) {
          throw new Error(`Failed to load report (${res.status})`);
        }
        const data = await res.json();
        setReport(data);
      } catch (err: any) {
        setError(err.message || 'Error fetching report');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [scanId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    window.open(`/api/reports/${scanId}?download=json`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ffffff] dark:bg-[#000000] text-[#171717] dark:text-[#ededed] flex items-center justify-center font-sans text-[14px]">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 animate-spin text-[#171717] dark:text-[#ededed]" />
          <span>Generating Sentinel Report...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#ffffff] dark:bg-[#000000] text-[#171717] dark:text-[#ededed] p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="p-8 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#fecaca] dark:border-[#ef4444]/30 rounded-[16px] text-center shadow-sm">
            <AlertTriangle className="h-8 w-8 text-[#dc2626] dark:text-[#ef4444] mx-auto mb-3" />
            <h2 className="text-[18px] font-medium text-[#171717] dark:text-[#ededed]">Report Not Available</h2>
            <p className="text-[14px] text-[#8f8f8f] mt-2">{error || 'Could not find report for this scan.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { meta, summary, technologies, verifiedFindings, falsePositives } = report;
  const fpReductionRate = summary.candidateFindingsCount > 0 
    ? Math.round((summary.falsePositivesCount / summary.candidateFindingsCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#ffffff] dark:bg-[#000000] text-[#171717] dark:text-[#ededed] font-sans pb-20 transition-colors duration-150">
      {/* Top Action Bar (Hidden on print) */}
      <header className="border-b border-[#ebebeb] dark:border-[#222222] bg-[#ffffff]/90 dark:bg-[#000000]/90 backdrop-blur-md sticky top-0 z-50 print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-[13px] text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-[#ebebeb] dark:bg-[#222222]" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#171717] dark:text-[#ededed]" strokeWidth={2} fill="currentColor" />
              <span className="text-[13px] font-medium text-[#171717] dark:text-[#ededed]">Sentinel Audit Export</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#ffffff] dark:bg-[#111111] hover:bg-[#fafafa] dark:hover:bg-[#171717] text-[#171717] dark:text-[#ededed] border border-[#ebebeb] dark:border-[#222222] rounded-full text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#8f8f8f]" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#171717] hover:bg-[#000000] dark:bg-[#ededed] dark:hover:bg-[#ffffff] text-[#ffffff] dark:text-[#000000] rounded-full text-[13px] font-medium transition-colors cursor-pointer shadow-none"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Report Document Container */}
      <main className="max-w-6xl mx-auto px-6 pt-10">
        
        {/* Document Header Card */}
        <div className="p-8 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[16px] mb-8 relative overflow-hidden shadow-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#ebebeb] dark:border-[#222222]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#f0fdf4] dark:bg-[#16a34a]/10 border border-[#bbf7d0] dark:border-[#16a34a]/30 text-[#16a34a] dark:text-[#22c55e] text-[11px] font-mono uppercase tracking-wider">
                  Verified Security Assessment
                </span>
                <span className="text-[12px] font-mono text-[#8f8f8f]">
                  Scan ID: {meta.scanId.slice(0, 8)}
                </span>
              </div>
              <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#ededed]">
                {meta.target}
              </h1>
              <p className="text-[14px] text-[#8f8f8f] mt-1 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-[#8f8f8f]" />
                <a href={meta.baseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#4d4d4d] dark:text-[#a1a1a1]">
                  {meta.baseUrl}
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-2 font-mono text-[12px] text-[#8f8f8f] md:text-right">
              <div className="flex items-center md:justify-end gap-2">
                <Calendar className="h-3.5 w-3.5 text-[#171717] dark:text-[#ededed]" />
                <span>Generated: {new Date(meta.generatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center md:justify-end gap-2">
                <Clock className="h-3.5 w-3.5 text-[#8f8f8f]" />
                <span>Started: {new Date(meta.startedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="p-4 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] rounded-[12px]">
              <div className="text-[12px] font-mono text-[#8f8f8f]">URLs Crawled</div>
              <div className="text-[22px] font-medium text-[#171717] dark:text-[#ededed] mt-1">{summary.urlsMapped}</div>
            </div>
            <div className="p-4 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] rounded-[12px]">
              <div className="text-[12px] font-mono text-[#8f8f8f]">Tech Stack Identified</div>
              <div className="text-[22px] font-medium text-[#171717] dark:text-[#ededed] mt-1">{summary.technologiesFound}</div>
            </div>
            <div className="p-4 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] rounded-[12px]">
              <div className="text-[12px] font-mono text-[#8f8f8f]">Candidate Findings</div>
              <div className="text-[22px] font-medium text-[#171717] dark:text-[#ededed] mt-1">{summary.candidateFindingsCount}</div>
            </div>
            <div className="p-4 bg-[#fafafa] dark:bg-[#111111] border border-[#bbf7d0] dark:border-[#16a34a]/30 rounded-[12px]">
              <div className="text-[12px] font-mono text-[#16a34a] dark:text-[#22c55e]">AI Noise Reduction</div>
              <div className="text-[22px] font-medium text-[#16a34a] dark:text-[#22c55e] mt-1">{fpReductionRate}%</div>
            </div>
          </div>
        </div>

        {/* Executive Risk Summary */}
        <section className="mb-8 p-6 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[16px]">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-[#171717] dark:text-[#ededed]" />
            <h2 className="text-[14px] font-medium text-[#171717] dark:text-[#ededed] uppercase tracking-wide font-mono">
              Executive Risk Summary
            </h2>
          </div>
          <p className="text-[14px] leading-relaxed text-[#4d4d4d] dark:text-[#a1a1a1] whitespace-pre-line">
            {summary.executiveSummary?.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim()}
          </p>
        </section>

        {/* Severity Breakdown Bar */}
        <section className="mb-8">
          <h2 className="text-[12px] font-medium text-[#8f8f8f] uppercase tracking-wider font-mono mb-3">
            Vulnerability Severity Distribution
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px]">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#dc2626] dark:text-[#ef4444]">
                <span>CRITICAL</span>
                <span className="w-2 h-2 rounded-full bg-[#dc2626] dark:bg-[#ef4444]" />
              </div>
              <div className="text-[24px] font-medium text-[#171717] dark:text-[#ededed] mt-2">
                {summary.severityBreakdown.critical}
              </div>
            </div>
            <div className="p-4 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px]">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#ea580c] dark:text-[#f97316]">
                <span>HIGH</span>
                <span className="w-2 h-2 rounded-full bg-[#ea580c] dark:bg-[#f97316]" />
              </div>
              <div className="text-[24px] font-medium text-[#171717] dark:text-[#ededed] mt-2">
                {summary.severityBreakdown.high}
              </div>
            </div>
            <div className="p-4 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px]">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#d97706] dark:text-[#f59e0b]">
                <span>MEDIUM</span>
                <span className="w-2 h-2 rounded-full bg-[#d97706] dark:bg-[#f59e0b]" />
              </div>
              <div className="text-[24px] font-medium text-[#171717] dark:text-[#ededed] mt-2">
                {summary.severityBreakdown.medium}
              </div>
            </div>
            <div className="p-4 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px]">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#0284c7] dark:text-[#38bdf8]">
                <span>LOW</span>
                <span className="w-2 h-2 rounded-full bg-[#0284c7] dark:bg-[#38bdf8]" />
              </div>
              <div className="text-[24px] font-medium text-[#171717] dark:text-[#ededed] mt-2">
                {summary.severityBreakdown.low}
              </div>
            </div>
          </div>
        </section>

        {/* Identified Technologies */}
        <section className="mb-8 p-6 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[16px]">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-[#171717] dark:text-[#ededed]" />
            <h2 className="text-[14px] font-medium text-[#171717] dark:text-[#ededed] uppercase tracking-wide font-mono">
              Fingerprinted Attack Surface & Tech Stack
            </h2>
          </div>
          {technologies.length === 0 ? (
            <p className="text-[13px] text-[#8f8f8f]">No custom framework fingerprints detected.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              {technologies.map(t => (
                <span 
                  key={t.id}
                  className="px-3 py-1 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] rounded-full text-[12px] font-mono text-[#171717] dark:text-[#ededed] flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#171717] dark:bg-[#ededed]" />
                  {t.technology}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* AI-Confirmed Vulnerabilities Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#dc2626] dark:text-[#ef4444]" fill="currentColor" />
              <h2 className="text-[16px] font-medium text-[#171717] dark:text-[#ededed] tracking-tight">
                Confirmed High-Risk Vulnerabilities
              </h2>
            </div>
            <span className="text-[12px] font-mono text-[#8f8f8f]">
              {verifiedFindings.length} Confirmed Issue{verifiedFindings.length === 1 ? '' : 's'}
            </span>
          </div>

          {verifiedFindings.length === 0 ? (
            <div className="p-6 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#bbf7d0] dark:border-[#16a34a]/30 rounded-[16px] text-center">
              <CheckCircle2 className="h-8 w-8 text-[#16a34a] dark:text-[#22c55e] mx-auto mb-2" />
              <h3 className="text-[15px] font-medium text-[#171717] dark:text-[#ededed]">No Critical Flaws Confirmed</h3>
              <p className="text-[13px] text-[#8f8f8f] mt-1">
                Sentinel verified all candidate alerts and filtered out noisy findings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {verifiedFindings.map(finding => (
                <div 
                  key={finding.id}
                  className="p-6 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] hover:border-[#dc2626]/40 dark:hover:border-[#ef4444]/40 rounded-[16px] shadow-none relative overflow-hidden transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#ebebeb] dark:border-[#222222]">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase font-medium border ${
                        finding.severity === 'critical' ? 'bg-[#fef2f2] dark:bg-[#ef4444]/10 border-[#fecaca] dark:border-[#ef4444]/30 text-[#dc2626] dark:text-[#ef4444]' :
                        finding.severity === 'high' ? 'bg-[#fff7ed] dark:bg-[#ea580c]/10 border-[#ffedd5] dark:border-[#ea580c]/30 text-[#ea580c] dark:text-[#f97316]' :
                        finding.severity === 'medium' ? 'bg-[#fffbeb] dark:bg-[#d97706]/10 border-[#fde68a] dark:border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]' :
                        'bg-[#f0f9ff] dark:bg-[#0284c7]/10 border-[#bae6fd] dark:border-[#0284c7]/30 text-[#0284c7] dark:text-[#38bdf8]'
                      }`}>
                        {finding.severity}
                      </span>
                      <h3 className="text-[16px] font-medium text-[#171717] dark:text-[#ededed]">
                        {finding.candidate_findings?.title || 'Vulnerability Finding'}
                      </h3>
                    </div>
                    <span className="text-[12px] font-mono text-[#8f8f8f]">
                      ID: {finding.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-[11px] font-mono text-[#8f8f8f] uppercase tracking-wider mb-2">
                      Technical Evidence & Extraction
                    </h4>
                    <pre className="p-4 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] rounded-[8px] text-[12px] font-mono text-[#171717] dark:text-[#ededed] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {finding.candidate_findings?.reasoning || 'No raw evidence payload available.'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* False Positive AI Filtering Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#16a34a] dark:text-[#22c55e]" />
              <h2 className="text-[16px] font-medium text-[#171717] dark:text-[#ededed] tracking-tight">
                Triaged False Positives (Filtered Out by AI)
              </h2>
            </div>
            <span className="text-[12px] font-mono text-[#8f8f8f]">
              {falsePositives.length} Eliminated
            </span>
          </div>

          <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[16px] overflow-hidden shadow-none">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#ebebeb] dark:border-[#222222] text-[#8f8f8f] font-mono text-[12px] bg-[#fafafa] dark:bg-[#111111]">
                  <th className="px-6 py-3 font-medium">Candidate Alert</th>
                  <th className="px-6 py-3 font-medium">Original Severity</th>
                  <th className="px-6 py-3 font-medium">AI Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebebeb] dark:divide-[#222222] text-[#4d4d4d] dark:text-[#a1a1a1]">
                {falsePositives.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-[#8f8f8f]">
                      No false positives detected.
                    </td>
                  </tr>
                ) : (
                  falsePositives.map(fp => (
                    <tr key={fp.id} className="hover:bg-[#fafafa] dark:hover:bg-[#111111] transition-colors">
                      <td className="px-6 py-3.5 font-medium text-[#171717] dark:text-[#ededed]">
                        {fp.candidate_findings?.title || 'Unknown alert'}
                      </td>
                      <td className="px-6 py-3.5 font-mono uppercase text-[11px] text-[#8f8f8f]">
                        {fp.severity}
                      </td>
                      <td className="px-6 py-3.5 text-[#16a34a] dark:text-[#22c55e] font-mono text-[12px] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] dark:bg-[#22c55e]" />
                        Filtered (False Positive)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer Note */}
        <footer className="pt-8 border-t border-[#ebebeb] dark:border-[#222222] flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#8f8f8f] font-mono">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-[#171717] dark:text-[#ededed]" />
            <span>CONFIDENTIAL SECURITY AUDIT REPORT</span>
          </div>
          <div className="mt-2 sm:mt-0">
            Powered by Sentinel Autonomous Security Engine
          </div>
        </footer>

      </main>
    </div>
  );
}
