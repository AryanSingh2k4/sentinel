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
      <div className="min-h-screen bg-[#0f0f0f] text-[#fafafa] flex items-center justify-center font-mono text-[14px]">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 animate-spin text-[#3ecf8e]" />
          <span>Generating Sentinel Report...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-[#fafafa] p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#898989] hover:text-[#fafafa] mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="p-6 bg-[#171717] border border-[#ef4444]/30 rounded-xl text-center">
            <AlertTriangle className="h-8 w-8 text-[#ef4444] mx-auto mb-3" />
            <h2 className="text-[18px] font-medium text-[#fafafa]">Report Not Available</h2>
            <p className="text-[14px] text-[#898989] mt-2">{error || 'Could not find report for this scan.'}</p>
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
    <div className="min-h-screen bg-[#0f0f0f] text-[#fafafa] font-sans selection:bg-[#3ecf8e]/20 pb-20">
      {/* Top Action Bar (Hidden on print) */}
      <header className="border-b border-[#2e2e2e] bg-[#171717]/80 backdrop-blur-md sticky top-0 z-50 print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-[13px] text-[#898989] hover:text-[#fafafa] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-[#2e2e2e]" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#3ecf8e]" strokeWidth={2} fill="currentColor" />
              <span className="text-[13px] font-medium text-[#fafafa]">Sentinel Audit Export</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#242424] hover:bg-[#2c2c2c] text-[#fafafa] border border-[#393939] rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#3ecf8e]" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#3ecf8e] hover:bg-[#33b078] text-[#0f0f0f] rounded-lg text-[13px] font-medium transition-colors cursor-pointer font-sans"
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
        <div className="p-8 bg-[#171717] border border-[#2e2e2e] rounded-2xl mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#3ecf8e]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#2e2e2e]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] text-[11px] font-mono uppercase tracking-wider">
                  Verified Security Assessment
                </span>
                <span className="text-[12px] font-mono text-[#898989]">
                  Scan ID: {meta.scanId.slice(0, 8)}
                </span>
              </div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#fafafa]">
                {meta.target}
              </h1>
              <p className="text-[14px] text-[#898989] mt-1 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-[#898989]" />
                <a href={meta.baseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#b4b4b4]">
                  {meta.baseUrl}
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-2 font-mono text-[12px] text-[#898989] md:text-right">
              <div className="flex items-center md:justify-end gap-2">
                <Calendar className="h-3.5 w-3.5 text-[#3ecf8e]" />
                <span>Generated: {new Date(meta.generatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center md:justify-end gap-2">
                <Clock className="h-3.5 w-3.5 text-[#898989]" />
                <span>Started: {new Date(meta.startedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="p-4 bg-[#202020] border border-[#2e2e2e] rounded-xl">
              <div className="text-[12px] font-mono text-[#898989]">URLs Crawled</div>
              <div className="text-[22px] font-bold text-[#fafafa] mt-1">{summary.urlsMapped}</div>
            </div>
            <div className="p-4 bg-[#202020] border border-[#2e2e2e] rounded-xl">
              <div className="text-[12px] font-mono text-[#898989]">Tech Stack Identified</div>
              <div className="text-[22px] font-bold text-[#fafafa] mt-1">{summary.technologiesFound}</div>
            </div>
            <div className="p-4 bg-[#202020] border border-[#2e2e2e] rounded-xl">
              <div className="text-[12px] font-mono text-[#898989]">Candidate Findings</div>
              <div className="text-[22px] font-bold text-[#fafafa] mt-1">{summary.candidateFindingsCount}</div>
            </div>
            <div className="p-4 bg-[#202020] border border-[#3ecf8e]/20 rounded-xl">
              <div className="text-[12px] font-mono text-[#3ecf8e]">AI Noise Reduction</div>
              <div className="text-[22px] font-bold text-[#3ecf8e] mt-1">{fpReductionRate}%</div>
            </div>
          </div>
        </div>

        {/* Executive Risk Summary */}
        <section className="mb-8 p-6 bg-[#171717] border border-[#2e2e2e] rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-[#3ecf8e]" />
            <h2 className="text-[15px] font-semibold text-[#fafafa] uppercase tracking-wide font-mono">
              Executive Risk Summary
            </h2>
          </div>
          <p className="text-[14px] leading-relaxed text-[#b4b4b4] whitespace-pre-line">
            {summary.executiveSummary?.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim()}
          </p>
        </section>

        {/* Severity Breakdown Bar */}
        <section className="mb-8">
          <h2 className="text-[13px] font-semibold text-[#898989] uppercase tracking-wider font-mono mb-3">
            Vulnerability Severity Distribution
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[#171717] border border-[#ef4444]/30 rounded-xl">
              <div className="flex items-center justify-between text-[12px] font-mono text-[#ef4444]">
                <span>CRITICAL</span>
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              </div>
              <div className="text-[24px] font-bold text-[#fafafa] mt-2">
                {summary.severityBreakdown.critical}
              </div>
            </div>
            <div className="p-4 bg-[#171717] border border-[#f97316]/30 rounded-xl">
              <div className="flex items-center justify-between text-[12px] font-mono text-[#f97316]">
                <span>HIGH</span>
                <span className="w-2 h-2 rounded-full bg-[#f97316]" />
              </div>
              <div className="text-[24px] font-bold text-[#fafafa] mt-2">
                {summary.severityBreakdown.high}
              </div>
            </div>
            <div className="p-4 bg-[#171717] border border-[#eab308]/30 rounded-xl">
              <div className="flex items-center justify-between text-[12px] font-mono text-[#eab308]">
                <span>MEDIUM</span>
                <span className="w-2 h-2 rounded-full bg-[#eab308]" />
              </div>
              <div className="text-[24px] font-bold text-[#fafafa] mt-2">
                {summary.severityBreakdown.medium}
              </div>
            </div>
            <div className="p-4 bg-[#171717] border border-[#3b82f6]/30 rounded-xl">
              <div className="flex items-center justify-between text-[12px] font-mono text-[#3b82f6]">
                <span>LOW</span>
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              </div>
              <div className="text-[24px] font-bold text-[#fafafa] mt-2">
                {summary.severityBreakdown.low}
              </div>
            </div>
          </div>
        </section>

        {/* Identified Technologies */}
        <section className="mb-8 p-6 bg-[#171717] border border-[#2e2e2e] rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-[#3ecf8e]" />
            <h2 className="text-[14px] font-semibold text-[#fafafa] uppercase tracking-wide font-mono">
              Fingerprinted Attack Surface & Tech Stack
            </h2>
          </div>
          {technologies.length === 0 ? (
            <p className="text-[13px] text-[#898989]">No custom framework fingerprints detected.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              {technologies.map(t => (
                <span 
                  key={t.id}
                  className="px-3 py-1 bg-[#202020] border border-[#2e2e2e] rounded-md text-[13px] font-mono text-[#fafafa] flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
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
              <Shield className="h-5 w-5 text-[#ef4444]" fill="currentColor" />
              <h2 className="text-[16px] font-semibold text-[#fafafa] tracking-tight">
                Confirmed High-Risk Vulnerabilities
              </h2>
            </div>
            <span className="text-[12px] font-mono text-[#898989]">
              {verifiedFindings.length} Confirmed Issue{verifiedFindings.length === 1 ? '' : 's'}
            </span>
          </div>

          {verifiedFindings.length === 0 ? (
            <div className="p-6 bg-[#171717] border border-[#3ecf8e]/30 rounded-xl text-center">
              <CheckCircle2 className="h-8 w-8 text-[#3ecf8e] mx-auto mb-2" />
              <h3 className="text-[15px] font-medium text-[#fafafa]">No Critical Flaws Confirmed</h3>
              <p className="text-[13px] text-[#898989] mt-1">
                Sentinel AI verified all candidate alerts and filtered out noisy findings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {verifiedFindings.map(finding => (
                <div 
                  key={finding.id}
                  className="p-6 bg-[#171717] border border-[#ef4444]/30 rounded-xl shadow-lg relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#2e2e2e]">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono uppercase font-bold border ${
                        finding.severity === 'critical' ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]' :
                        finding.severity === 'high' ? 'bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]' :
                        finding.severity === 'medium' ? 'bg-[#eab308]/10 border-[#eab308]/30 text-[#eab308]' :
                        'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]'
                      }`}>
                        {finding.severity}
                      </span>
                      <h3 className="text-[16px] font-medium text-[#fafafa]">
                        {finding.candidate_findings?.title || 'Vulnerability Finding'}
                      </h3>
                    </div>
                    <span className="text-[12px] font-mono text-[#898989]">
                      ID: {finding.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-[12px] font-mono text-[#898989] uppercase tracking-wider mb-2">
                      Technical Evidence & Extraction
                    </h4>
                    <pre className="p-4 bg-[#0a0a0a] border border-[#242424] rounded-lg text-[12px] font-mono text-[#3ecf8e] overflow-x-auto whitespace-pre-wrap leading-relaxed">
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
              <CheckCircle2 className="h-5 w-5 text-[#3ecf8e]" />
              <h2 className="text-[16px] font-semibold text-[#fafafa] tracking-tight">
                Triaged False Positives (Filtered Out by AI)
              </h2>
            </div>
            <span className="text-[12px] font-mono text-[#898989]">
              {falsePositives.length} Eliminated
            </span>
          </div>

          <div className="bg-[#171717] border border-[#2e2e2e] rounded-xl overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#2e2e2e] text-[#898989] font-mono text-[12px]">
                  <th className="px-6 py-3 font-normal">Candidate Alert</th>
                  <th className="px-6 py-3 font-normal">Original Severity</th>
                  <th className="px-6 py-3 font-normal">AI Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242424] text-[#b4b4b4]">
                {falsePositives.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-[#898989]">
                      No false positives detected.
                    </td>
                  </tr>
                ) : (
                  falsePositives.map(fp => (
                    <tr key={fp.id} className="hover:bg-[#1f1f1f] transition-colors">
                      <td className="px-6 py-3.5 font-medium text-[#fafafa]">
                        {fp.candidate_findings?.title || 'Unknown alert'}
                      </td>
                      <td className="px-6 py-3.5 font-mono uppercase text-[11px] text-[#898989]">
                        {fp.severity}
                      </td>
                      <td className="px-6 py-3.5 text-[#3ecf8e] font-mono text-[12px] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
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
        <footer className="pt-8 border-t border-[#2e2e2e] flex flex-col sm:flex-row items-center justify-between text-[12px] text-[#898989] font-mono">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-[#3ecf8e]" />
            <span>CONFIDENTIAL SECURITY AUDIT REPORT</span>
          </div>
          <div className="mt-2 sm:mt-0">
            Powered by Sentinel AI Autonomous Security Engine
          </div>
        </footer>

      </main>
    </div>
  );
}
