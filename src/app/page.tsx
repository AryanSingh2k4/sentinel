'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Search, 
  Settings, 
  User, 
  LogOut, 
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { Navbar } from '@/components/Navbar';

interface ScanTarget {
  domain?: string;
}

interface Scan {
  id: string;
  status: string;
  targets?: ScanTarget | ScanTarget[] | null;
}

interface TechFinding {
  id: string;
  technology: string;
  confidence: number;
  created_at?: string;
}

interface Finding {
  id: string;
  title: string;
  severity: string;
  reasoning?: string;
  created_at?: string;
}

interface ConfirmedFinding {
  id: string;
  severity: string;
  confirmed: boolean;
  created_at?: string;
  candidate_findings?: {
    title?: string;
  } | null;
}

export default function Dashboard() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [techFindings, setTechFindings] = useState<TechFinding[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [confirmedFindings, setConfirmedFindings] = useState<ConfirmedFinding[]>([]);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState('');
  const [scanType, setScanType] = useState<'web' | 'git'>('web');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showAllTech, setShowAllTech] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email || 'Operator');
    };
    fetchUser();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.scans) setScans(data.scans);
        if (data.technologies) setTechFindings(data.technologies);
        if (data.findings) setFindings(data.findings);
        if (data.confirmedFindings) setConfirmedFindings(data.confirmedFindings);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  // Fetch real-time dashboard data
  useEffect(() => {
    fetchDashboardData();

    // Set up polling interval to keep dashboard fresh every 3 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 3000);

    const debouncedFetch = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        fetchDashboardData();
      }, 500);
    };

    // Supabase Realtime Subscription (fallback)
    const supabase = createClient();
    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scans' }, () => {
        debouncedFetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discovered_technologies' }, () => {
        debouncedFetch();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-150">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-serif font-normal text-foreground tracking-tight">Security Overview</h1>
            <p className="text-[14px] text-muted-foreground mt-1">Autonomous security posture and threat intelligence monitoring.</p>
          </div>
          <button 
            onClick={() => {
              setScanTarget('');
              setScanError(null);
              setScanModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-hover text-primary-foreground rounded-full h-[36px] px-5 text-[14px] font-medium transition-all shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <span>New Scan</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          
          <div className="bg-card border border-border rounded-[12px] p-6 hover:border-primary/40 transition-all shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-[13px] font-medium text-muted-foreground">Active Scans</h3>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-[32px] font-serif font-normal tracking-tight text-foreground mb-1 leading-none">{scans.filter(s => ['QUEUED', 'RECON', 'ATTACK'].includes(s.status)).length}</div>
            <p className="text-[13px] text-muted-foreground">Running concurrently</p>
          </div>

          <div className="bg-card border border-border rounded-[12px] p-6 hover:border-primary/40 transition-all shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-[13px] font-medium text-muted-foreground">Critical Findings</h3>
              <AlertTriangle className={`h-4 w-4 ${findings.filter(f => f.severity === 'critical' || f.severity === 'high').length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div className="text-[32px] font-serif font-normal tracking-tight text-foreground mb-1 leading-none">{findings.filter(f => f.severity === 'critical' || f.severity === 'high').length}</div>
            <p className="text-[13px] text-muted-foreground">High & Critical severity</p>
          </div>

          <div className="bg-card border border-border rounded-[12px] p-6 hover:border-primary/40 transition-all shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-[13px] font-medium text-muted-foreground">Pending Reviews</h3>
              <Clock className="h-4 w-4 text-[#d97706] dark:text-[#f59e0b]" />
            </div>
            <div className="text-[32px] font-serif font-normal tracking-tight text-foreground mb-1 leading-none">{findings.length}</div>
            <p className="text-[13px] text-muted-foreground">Awaiting validation</p>
          </div>

          <div className="bg-card border border-border rounded-[12px] p-6 hover:border-primary/40 transition-all shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-[13px] font-medium text-muted-foreground">Verified Issues</h3>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-[32px] font-serif font-normal tracking-tight text-foreground mb-1 leading-none">{confirmedFindings.filter(f => f.confirmed).length}</div>
            <p className="text-[13px] text-muted-foreground">Confirmed vulnerabilities</p>
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* Active Scans Table */}
          <div className="bg-card border border-border rounded-[12px] overflow-hidden shadow-none">
            <div className="px-6 py-4 border-b border-border bg-card">
              <h3 className="text-[18px] font-serif font-bold tracking-tight text-foreground">Active Scans</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-[#faf9f6]/70 dark:bg-[#1f1e1c]/70 text-[12px] font-medium font-sans">
                    <th className="px-6 py-3">Scan ID</th>
                    <th className="px-6 py-3">Target</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {scans.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-[13px]">No active scans found.</td></tr>
                  )}
                  {scans.map((scan) => {
                    let domainName = 'Unknown Target';
                    if (scan.targets) {
                      if (Array.isArray(scan.targets)) {
                        domainName = scan.targets[0]?.domain || 'Unknown Target';
                      } else if (scan.targets.domain) {
                        domainName = scan.targets.domain;
                      }
                    }

                    return (
                      <tr key={scan.id} className="hover:bg-accent/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-[12px] text-muted-foreground" title={scan.id}>{scan.id.substring(0, 8)}...</td>
                        <td className="px-6 py-4 font-medium text-foreground">{domainName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                            scan.status === 'FAILED' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                            scan.status === 'QUEUED' ? 'bg-secondary border-border text-muted-foreground' :
                            scan.status === 'COMPLETED' ? 'bg-[#788c5d]/10 dark:bg-[#8ca36f]/10 border-[#788c5d]/30 dark:border-[#8ca36f]/30 text-[#788c5d] dark:text-[#8ca36f]' :
                            scan.status === 'SECRETS' || scan.status === 'SECRET_SCAN' ? 'bg-primary/10 border-primary/30 text-primary' :
                            'bg-[#d97706]/10 border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]'
                          }`}>
                            {scan.status || 'QUEUED'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <Link 
                            href={`/scans/${scan.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card hover:bg-muted text-[12px] font-mono text-foreground border border-border transition-all"
                            title="Live Scan Console"
                          >
                            <Activity className="h-3 w-3 text-primary" />
                            <span>Console</span>
                          </Link>
                          <Link 
                            href={`/reports/${scan.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card hover:bg-muted text-[12px] font-mono text-muted-foreground hover:text-foreground border border-border transition-all"
                            title="Audit Report"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Report</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discovered Technologies */}
          <div className="bg-card border border-border rounded-[12px] overflow-hidden shadow-none">
            <div className="px-6 py-4 border-b border-border bg-card">
              <h3 className="text-[18px] font-serif font-bold tracking-tight text-foreground">Discovered Technologies</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-[#faf9f6]/70 dark:bg-[#1f1e1c]/70 text-[12px] font-medium font-sans">
                    <th className="px-6 py-3">Tech ID</th>
                    <th className="px-6 py-3">Technology</th>
                    <th className="px-6 py-3">Confidence</th>
                    <th className="px-6 py-3 text-right">Detected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {techFindings.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-[13px]">No technologies discovered yet.</td></tr>
                  )}
                  {(showAllTech ? techFindings : techFindings.slice(0, 5)).map((finding) => (
                    <tr key={finding.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-[12px] text-muted-foreground" title={finding.id}>{finding.id.toString().substring(0, 8)}...</td>
                      <td className="px-6 py-4 font-mono text-[12px] font-medium text-foreground">{finding.technology}</td>
                      <td className="px-6 py-4">
                        <span className="text-[12px] font-mono text-foreground px-2 py-0.5 rounded-full bg-secondary border border-border">
                          {finding.confidence}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[12px] text-muted-foreground">
                        {finding.created_at ? new Date(finding.created_at).toLocaleTimeString() : 'Just now'}
                      </td>
                    </tr>
                  ))}
                  {techFindings.length > 5 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-center border-t border-border bg-card hover:bg-muted/30">
                        <button 
                          onClick={() => setShowAllTech(!showAllTech)}
                          className="text-[12px] font-medium text-foreground hover:underline cursor-pointer"
                        >
                          {showAllTech ? 'Show Less' : `Show All (${techFindings.length})`}
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Candidate Findings Table */}
        <div className="bg-card border border-border rounded-[12px] overflow-hidden shadow-none mt-8">
          <div className="px-6 py-4 border-b border-border bg-card">
            <h3 className="text-[18px] font-serif font-bold tracking-tight text-foreground">Candidate Findings (Nuclei Engine)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-[#faf9f6]/70 dark:bg-[#1f1e1c]/70 text-[12px] font-medium font-sans">
                  <th className="px-6 py-3">Finding ID</th>
                  <th className="px-6 py-3">Vulnerability</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Reasoning</th>
                  <th className="px-6 py-3 text-right">Discovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                {findings.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-[13px]">No candidate findings yet.</td></tr>
                )}
                {findings.map((finding) => (
                  <tr key={finding.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-[12px] text-muted-foreground" title={finding.id}>{finding.id.toString().substring(0, 8)}...</td>
                    <td className="px-6 py-4 font-medium text-foreground">{finding.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                        finding.severity === 'critical' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                        finding.severity === 'high' ? 'bg-[#ea580c]/10 border-[#ea580c]/30 text-[#ea580c]' :
                        finding.severity === 'medium' ? 'bg-[#d97706]/10 border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]' :
                        finding.severity === 'low' ? 'bg-[#6a9bcc]/10 border-[#6a9bcc]/30 text-[#6a9bcc]' :
                        'bg-secondary border-border text-muted-foreground'
                      }`}>
                        {finding.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-muted-foreground max-w-[300px] truncate" title={finding.reasoning}>
                      {finding.reasoning}
                    </td>
                    <td className="px-6 py-4 text-right text-[12px] text-muted-foreground">
                      {finding.created_at ? new Date(finding.created_at).toLocaleTimeString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Confirmed Findings Table */}
        <div className="bg-card border border-border rounded-[12px] overflow-hidden shadow-none mt-8">
          <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
            <h3 className="text-[18px] font-serif font-bold tracking-tight text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" fill="currentColor" />
              AI-assisted Verified Findings
            </h3>
            <span className="text-[12px] text-muted-foreground">Validated by Sentinel Triage</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-[#faf9f6]/70 dark:bg-[#1f1e1c]/70 text-[12px] font-medium font-sans">
                  <th className="px-6 py-3">Finding ID</th>
                  <th className="px-6 py-3">Vulnerability</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Validated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                {confirmedFindings.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-[13px]">No findings verified yet.</td></tr>
                )}
                {confirmedFindings.map((finding) => (
                  <tr key={finding.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-[12px] text-muted-foreground" title={finding.id}>{finding.id.toString().substring(0, 8)}...</td>
                    <td className="px-6 py-4 font-medium text-foreground">{finding.candidate_findings?.title || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                        finding.severity === 'critical' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                        finding.severity === 'high' ? 'bg-[#ea580c]/10 border-[#ea580c]/30 text-[#ea580c]' :
                        finding.severity === 'medium' ? 'bg-[#d97706]/10 border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]' :
                        finding.severity === 'low' ? 'bg-[#6a9bcc]/10 border-[#6a9bcc]/30 text-[#6a9bcc]' :
                        'bg-secondary border-border text-muted-foreground'
                      }`}>
                        {finding.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {finding.confirmed ? (
                        <span className="text-destructive font-medium flex items-center gap-1.5 text-[12px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                          VULNERABLE
                        </span>
                      ) : (
                        <span className="text-[#788c5d] dark:text-[#8ca36f] font-medium flex items-center gap-1.5 text-[12px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#788c5d] dark:bg-[#8ca36f]"></div>
                          FALSE POSITIVE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-[12px] text-muted-foreground">
                      {finding.created_at ? new Date(finding.created_at).toLocaleTimeString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Custom Scan Modal */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-[440px] bg-card border border-border rounded-[16px] shadow-none p-6 relative">
            <button 
              onClick={() => setScanModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            
            <h2 className="text-[20px] font-serif font-medium text-foreground mb-1">Initiate Security Assessment</h2>
            <p className="text-[13px] text-muted-foreground mb-5">
              {scanType === 'web' 
                ? 'Launch automated reconnaissance, fingerprinting, and vulnerability scanning.' 
                : 'Clone repository and execute TruffleHog to detect leaked API keys, tokens, and credentials.'}
            </p>

            {/* Target Type Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary border border-border rounded-full mb-4">
              <button
                type="button"
                onClick={() => setScanType('web')}
                className={`py-1.5 text-[13px] font-medium rounded-full transition-all cursor-pointer ${
                  scanType === 'web'
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Web Application
              </button>
              <button
                type="button"
                onClick={() => setScanType('git')}
                className={`py-1.5 text-[13px] font-medium rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  scanType === 'git'
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>GitHub Repo</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-foreground border border-border font-mono">Secret</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">
                  {scanType === 'web' ? 'Target Domain / URL' : 'Git Repository URL'}
                </label>
                <input 
                  autoFocus
                  type="text" 
                  value={scanTarget}
                  onChange={(e) => {
                    setScanTarget(e.target.value);
                    if (scanError) setScanError(null);
                  }}
                  placeholder={scanType === 'web' ? 'e.g. testphp.vulnweb.com or app.example.com' : 'e.g. https://github.com/org/repo.git'}
                  className="w-full h-[40px] px-3 bg-secondary/50 border border-border text-foreground text-[14px] rounded-[8px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && scanTarget.trim() && !scanLoading) {
                      document.getElementById('start-scan-btn')?.click();
                    }
                  }}
                />
              </div>

              {scanError && (
                <div className="p-2.5 rounded-[8px] bg-destructive/10 border border-destructive/30 text-destructive text-[13px] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  <span>{scanError}</span>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  onClick={() => setScanModalOpen(false)}
                  disabled={scanLoading}
                  className="px-4 h-[36px] text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  id="start-scan-btn"
                  disabled={!scanTarget.trim() || scanLoading}
                  onClick={async () => {
                    setScanError(null);
                    setScanLoading(true);
                    try {
                      const res = await fetch('/api/scans', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          target: scanTarget.trim(),
                          targetType: scanType
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setScanModalOpen(false);
                        if (data.scanId) {
                          router.push(`/scans/${data.scanId}`);
                        } else {
                          fetchDashboardData();
                        }
                      } else {
                        const errData = await res.json().catch(() => null);
                        setScanError(errData?.error || "Failed to initiate scan.");
                      }
                    } catch (e) {
                      console.error(e);
                      setScanError("Error initiating scan.");
                    } finally {
                      setScanLoading(false);
                    }
                  }}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground rounded-full h-[36px] px-5 text-[14px] font-medium transition-all disabled:opacity-50 flex items-center cursor-pointer shadow-none"
                >
                  {scanLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting...
                    </>
                  ) : scanType === 'git' ? 'Scan Repository Secrets' : 'Start Web Scan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
