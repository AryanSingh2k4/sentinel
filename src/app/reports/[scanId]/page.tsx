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
  ExternalLink,
  Terminal,
  Code2,
  GitPullRequest,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Navbar } from '@/components/Navbar';
import { MonacoDiffViewer, PatchItem } from '@/components/MonacoDiffViewer';
import { formatTargetDisplay } from '@/lib/utils/target-resolver';

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
  patches?: PatchItem[];
}

export default function ReportPage() {
  const params = useParams();
  const scanId = params?.scanId as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCurls, setCopiedCurls] = useState<Record<string, boolean>>({});
  const [expandedHttp, setExpandedHttp] = useState<Record<string, boolean>>({});

  const handleCopyCurl = (findingId: string, curlCmd: string) => {
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurls(prev => ({ ...prev, [findingId]: true }));
    setTimeout(() => {
      setCopiedCurls(prev => ({ ...prev, [findingId]: false }));
    }, 2000);
  };

  const toggleHttpExpand = (findingId: string) => {
    setExpandedHttp(prev => ({ ...prev, [findingId]: !prev[findingId] }));
  };

  const parseFindingEvidence = (raw: string) => {
    let curlCommand: string | null = null;
    let httpRequest: string | null = null;
    let httpResponse: string | null = null;
    let cleanReasoning = raw;

    // Extract cURL PoC
    const curlMatch = raw.match(/cURL PoC:\r?\n([\s\S]*?)(?=(?:\r?\n\r?\n(?:HTTP Request|HTTP Response|Template|Matched at)|$))/i);
    if (curlMatch && curlMatch[1]) {
      curlCommand = curlMatch[1].trim();
    }

    // Extract HTTP Request
    const reqMatch = raw.match(/HTTP Request:\r?\n([\s\S]*?)(?=(?:\r?\n\r?\n(?:HTTP Response|cURL PoC|Template|Matched at)|$))/i);
    if (reqMatch && reqMatch[1]) {
      httpRequest = reqMatch[1].trim();
    }

    // Extract HTTP Response
    const resMatch = raw.match(/HTTP Response:\r?\n([\s\S]*?)(?=(?:\r?\n\r?\n(?:HTTP Request|cURL PoC|Template|Matched at)|$))/i);
    if (resMatch && resMatch[1]) {
      httpResponse = resMatch[1].trim();
    }

    // Clean reasoning for general evidence display
    cleanReasoning = cleanReasoning
      .replace(/cURL PoC:\r?\n[\s\S]*?(?=(?:\r?\n\r?\n(?:HTTP Request|HTTP Response)|$))/gi, '')
      .replace(/HTTP Request:\r?\n[\s\S]*?(?=(?:\r?\n\r?\n(?:HTTP Response|cURL PoC)|$))/gi, '')
      .replace(/HTTP Response:\r?\n[\s\S]*?(?=(?:\r?\n\r?\n(?:HTTP Request|cURL PoC)|$))/gi, '')
      .trim();

    if (!cleanReasoning) {
      cleanReasoning = raw;
    }

    return { curlCommand, httpRequest, httpResponse, cleanReasoning };
  };

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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans text-[14px]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Activity className="h-5 w-5 animate-spin text-primary" />
          <span>Generating Sentinel Report...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="p-8 bg-card border border-destructive/20 rounded-[6px] text-center shadow-none">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <h2 className="text-[18px] font-semibold text-foreground">Report Not Available</h2>
            <p className="text-[14px] text-muted-foreground mt-2">{error || 'Could not find report for this scan.'}</p>
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
    <div className="min-h-screen bg-background text-foreground font-sans pb-20 transition-colors duration-150">
      {/* Unified Top Navigation */}
      <Navbar />

      {/* Top Action Bar (Hidden on print) */}
      <div className="border-b border-border bg-card/60 backdrop-blur-md sticky top-14 z-30 print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/reports" className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>All Reports</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-primary" strokeWidth={2} fill="currentColor" />
              <span className="text-[13px] font-medium text-foreground">Sentinel Audit Export</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-card hover:bg-secondary text-foreground border border-border rounded-[6px] text-[13px] font-medium transition-colors cursor-pointer shadow-none"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full text-[13px] font-medium transition-colors cursor-pointer shadow-none"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Report Document Container */}
      <main className="max-w-6xl mx-auto px-6 pt-10">
        
        {/* Document Header Card */}
        <div className="p-8 bg-card border border-border rounded-[12px] mb-8 relative overflow-hidden shadow-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono uppercase tracking-wider">
                  Verified Security Assessment
                </span>
                <span className="text-[12px] font-mono text-muted-foreground">
                  Scan ID: {meta.scanId.slice(0, 8)}
                </span>
              </div>
              <h1 className="text-[28px] md:text-[34px] font-serif font-normal tracking-tight text-foreground">
                {formatTargetDisplay(meta.target)}
              </h1>
              <p className="text-[14px] text-muted-foreground mt-1 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={meta.baseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-foreground">
                  {meta.baseUrl}
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-2 font-mono text-[12px] text-muted-foreground md:text-right">
              <div className="flex items-center md:justify-end gap-2">
                <Calendar className="h-3.5 w-3.5 text-foreground" />
                <span>Generated: {new Date(meta.generatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center md:justify-end gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Started: {new Date(meta.startedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 ${report.patches && report.patches.length > 0 ? 'lg:grid-cols-5' : ''} gap-4 pt-6`}>
            <div className="p-4 bg-[#faf9f6]/70 dark:bg-[#1f1e1c]/70 border border-border rounded-[12px]">
              <div className="text-[12px] font-mono text-muted-foreground">URLs Crawled</div>
              <div className="text-[26px] font-serif font-normal text-foreground mt-1">{summary.urlsMapped}</div>
            </div>
            <div className="p-4 bg-[#faf9f6]/70 dark:bg-[#1f1e1c]/70 border border-border rounded-[12px]">
              <div className="text-[12px] font-mono text-muted-foreground">Tech Stack Identified</div>
              <div className="text-[26px] font-serif font-normal text-foreground mt-1">{summary.technologiesFound}</div>
            </div>
            <div className="p-4 bg-[#faf9f6]/70 dark:bg-[#1f1e1c]/70 border border-border rounded-[12px]">
              <div className="text-[12px] font-mono text-muted-foreground">Candidate Findings</div>
              <div className="text-[26px] font-serif font-normal text-foreground mt-1">{summary.candidateFindingsCount}</div>
            </div>
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-[12px]">
              <div className="text-[12px] font-mono text-emerald-600 dark:text-emerald-400">AI Noise Reduction</div>
              <div className="text-[26px] font-serif font-normal text-emerald-600 dark:text-emerald-400 mt-1">{fpReductionRate}%</div>
            </div>
            {report.patches && report.patches.length > 0 && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-[12px]">
                <div className="text-[12px] font-mono text-primary">Patches & PRs</div>
                <div className="text-[26px] font-serif font-normal text-primary mt-1">{report.patches.length}</div>
              </div>
            )}
          </div>
        </div>

        {/* Executive Risk Summary */}
        <section className="mb-8 p-6 bg-card border border-border rounded-[12px] shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-[18px] font-serif font-bold tracking-tight text-foreground">
              Executive Risk Summary
            </h2>
          </div>
          <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-line">
            {summary.executiveSummary?.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim()}
          </p>
        </section>

        {/* Severity Breakdown Bar */}
        <section className="mb-8">
          <h2 className="text-[12px] font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Vulnerability Severity Distribution
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-card border border-border rounded-[12px] shadow-none">
              <div className="flex items-center justify-between text-[11px] font-mono text-destructive">
                <span>CRITICAL</span>
                <span className="w-2 h-2 rounded-full bg-destructive" />
              </div>
              <div className="text-[26px] font-serif font-normal text-foreground mt-2">
                {summary.severityBreakdown.critical}
              </div>
            </div>
            <div className="p-4 bg-card border border-border rounded-[12px] shadow-none">
              <div className="flex items-center justify-between text-[11px] font-mono text-orange-600 dark:text-orange-400">
                <span>HIGH</span>
                <span className="w-2 h-2 rounded-full bg-orange-500" />
              </div>
              <div className="text-[26px] font-serif font-normal text-foreground mt-2">
                {summary.severityBreakdown.high}
              </div>
            </div>
            <div className="p-4 bg-card border border-border rounded-[12px] shadow-none">
              <div className="flex items-center justify-between text-[11px] font-mono text-amber-600 dark:text-amber-400">
                <span>MEDIUM</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div className="text-[26px] font-serif font-normal text-foreground mt-2">
                {summary.severityBreakdown.medium}
              </div>
            </div>
            <div className="p-4 bg-card border border-border rounded-[12px] shadow-none">
              <div className="flex items-center justify-between text-[11px] font-mono text-sky-600 dark:text-sky-400">
                <span>LOW</span>
                <span className="w-2 h-2 rounded-full bg-sky-500" />
              </div>
              <div className="text-[26px] font-serif font-normal text-foreground mt-2">
                {summary.severityBreakdown.low}
              </div>
            </div>
          </div>
        </section>

        {/* Identified Technologies */}
        <section className="mb-8 p-6 bg-card border border-border rounded-[12px] shadow-none">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-[18px] font-serif font-bold tracking-tight text-foreground">
              Fingerprinted Attack Surface & Tech Stack
            </h2>
          </div>
          {technologies.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No custom framework fingerprints detected.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              {technologies.map(t => (
                <span 
                  key={t.id}
                  className="px-3 py-1 bg-secondary border border-border rounded-full text-[12px] font-mono text-foreground flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
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
              <Shield className="h-4 w-4 text-destructive" fill="currentColor" />
              <h2 className="text-[18px] font-serif font-bold text-foreground tracking-tight">
                Confirmed High-Risk Vulnerabilities
              </h2>
            </div>
            <span className="text-[12px] font-mono text-muted-foreground">
              {verifiedFindings.length} Confirmed Issue{verifiedFindings.length === 1 ? '' : 's'}
            </span>
          </div>

          {verifiedFindings.length === 0 ? (
            <div className="p-6 bg-card border border-emerald-500/20 rounded-[12px] text-center shadow-none">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <h3 className="text-[15px] font-serif font-medium text-foreground">No Critical Flaws Confirmed</h3>
              <p className="text-[13px] text-muted-foreground mt-1">
                Sentinel verified all candidate alerts and filtered out noisy findings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {verifiedFindings.map(finding => {
                const evidence = parseFindingEvidence(finding.candidate_findings?.reasoning || '');
                const relatedPatch = report.patches?.find(p => p.findingId === finding.id);

                return (
                  <div 
                    key={finding.id}
                    className="p-6 bg-card border border-border hover:border-destructive/40 rounded-[10px] shadow-none relative overflow-hidden transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-[4px] text-[11px] font-mono uppercase font-medium border ${
                          finding.severity === 'critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                          finding.severity === 'high' ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' :
                          finding.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                          'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400'
                        }`}>
                          {finding.severity}
                        </span>
                        <h3 className="text-[16px] font-medium text-foreground">
                          {finding.candidate_findings?.title || 'Vulnerability Finding'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {relatedPatch && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
                            <GitPullRequest className="h-3 w-3" /> Auto-Patch Ready
                          </span>
                        )}
                        <span className="text-[12px] font-mono text-muted-foreground">
                          ID: {finding.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>

                    {/* Technical Evidence */}
                    <div className="mt-4">
                      <h4 className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                        Technical Evidence & Extraction
                      </h4>
                      <pre className="p-4 bg-secondary/60 border border-border rounded-[8px] text-[12px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {evidence.cleanReasoning || 'No raw evidence payload available.'}
                      </pre>
                    </div>

                    {/* Deterministic cURL PoC Replay */}
                    {evidence.curlCommand && (
                      <div className="mt-4 border border-border rounded-[8px] bg-secondary/30 overflow-hidden">
                        <div className="px-4 py-2 bg-secondary/70 border-b border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[11px] font-mono font-medium text-foreground uppercase tracking-wider">
                              Reproducible cURL PoC (Deterministic Replay)
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyCurl(finding.id, evidence.curlCommand!)}
                            className="px-2.5 py-1 text-[11px] font-mono bg-card hover:bg-secondary border border-border text-foreground rounded-[4px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
                          >
                            {copiedCurls[finding.id] ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied cURL</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy cURL PoC</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3.5 bg-black/40 text-[12px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                          {evidence.curlCommand}
                        </pre>
                      </div>
                    )}

                    {/* Raw HTTP Interaction Stream (-irr) */}
                    {(evidence.httpRequest || evidence.httpResponse) && (
                      <div className="mt-3 border border-border rounded-[8px] overflow-hidden">
                        <button
                          onClick={() => toggleHttpExpand(finding.id)}
                          className="w-full px-4 py-2 bg-secondary/40 hover:bg-secondary/70 transition-colors flex items-center justify-between text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                              Raw HTTP Interaction Stream (-irr Evidence)
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[12px] text-muted-foreground font-mono">
                            <span>{expandedHttp[finding.id] ? 'Hide' : 'Inspect'} Stream</span>
                            {expandedHttp[finding.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </div>
                        </button>

                        {expandedHttp[finding.id] && (
                          <div className="p-4 bg-secondary/20 border-t border-border space-y-3">
                            {evidence.httpRequest && (
                              <div>
                                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                                  Raw HTTP Request Sent
                                </div>
                                <pre className="p-3 bg-black/40 border border-border rounded-[6px] text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                                  {evidence.httpRequest}
                                </pre>
                              </div>
                            )}
                            {evidence.httpResponse && (
                              <div>
                                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                                  Raw HTTP Response Received
                                </div>
                                <pre className="p-3 bg-black/40 border border-border rounded-[6px] text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-[260px]">
                                  {evidence.httpResponse}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Autonomous Code Fixes & GitHub Pull Requests */}
        {report.patches && report.patches.length > 0 && (
          <section className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-primary" />
                <h2 className="text-[18px] font-serif font-bold text-foreground tracking-tight">
                  Autonomous Code Fixes & Verified Patches ({report.patches.length})
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Self-Healing Sandbox Verified
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  AST Mapped & Synced
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {report.patches.map((patch, idx) => (
                <MonacoDiffViewer key={patch.findingId || idx} patch={patch} />
              ))}
            </div>
          </section>
        )}

        {/* False Positive AI Filtering Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-[18px] font-serif font-bold text-foreground tracking-tight">
                Triaged False Positives (Filtered Out by AI-assisted Triage)
              </h2>
            </div>
            <span className="text-[12px] font-mono text-muted-foreground">
              {falsePositives.length} Eliminated
            </span>
          </div>

          <div className="bg-card border border-border rounded-[6px] overflow-hidden shadow-none">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-mono text-[12px] bg-secondary/50">
                  <th className="px-6 py-3 font-medium">Candidate Alert</th>
                  <th className="px-6 py-3 font-medium">Original Severity</th>
                  <th className="px-6 py-3 font-medium">AI Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {falsePositives.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                      No false positives detected.
                    </td>
                  </tr>
                ) : (
                  falsePositives.map(fp => (
                    <tr key={fp.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">
                        {fp.candidate_findings?.title || 'Unknown alert'}
                      </td>
                      <td className="px-6 py-3.5 font-mono uppercase text-[11px] text-muted-foreground">
                        {fp.severity}
                      </td>
                      <td className="px-6 py-3.5 text-emerald-600 dark:text-emerald-400 font-mono text-[12px] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
        <footer className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between text-[12px] text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-foreground" />
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
