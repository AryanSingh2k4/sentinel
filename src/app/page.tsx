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
    <div className="min-h-screen bg-[#ffffff] dark:bg-[#000000] font-sans text-[#171717] dark:text-[#ededed] transition-colors duration-150">
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
                <Link href="/" className="text-[#171717] dark:text-[#ededed] border-b-2 border-[#171717] dark:border-[#ededed] py-[15px]">Dashboard</Link>
                <Link href="/github-scanner" className="text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors py-[15px] flex items-center gap-1.5">
                  <span>GitHub Scanner</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#fafafa] dark:bg-[#111111] text-[#171717] dark:text-[#ededed] border border-[#ebebeb] dark:border-[#222222]">Secrets</span>
                </Link>
                <Link href="/reports" className="text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors py-[15px]">Reports</Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Vercel Theme Switcher */}
              <ThemeToggle />

              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-[#fafafa] dark:hover:bg-[#111111] border border-transparent hover:border-[#ebebeb] dark:hover:border-[#222222] transition-colors focus:outline-none cursor-pointer"
                >
                  <div className="h-7 w-7 rounded-full bg-[#fafafa] dark:bg-[#111111] flex items-center justify-center border border-[#ebebeb] dark:border-[#222222]">
                    <User className="h-3.5 w-3.5 text-[#4d4d4d] dark:text-[#ededed]" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-[#8f8f8f]" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-[#ebebeb] dark:border-[#222222]">
                      <p className="text-[11px] text-[#8f8f8f] font-medium uppercase tracking-wider">Signed in as</p>
                      <p className="text-[13px] text-[#171717] dark:text-[#ededed] font-medium truncate mt-0.5">{userEmail}</p>
                    </div>
                    <div className="border-t border-[#ebebeb] dark:border-[#222222] py-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-[13px] text-[#dc2626] dark:text-[#ef4444] hover:bg-[#fef2f2] dark:hover:bg-[#ef4444]/10 transition-colors flex items-center cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5 mr-2" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-medium text-[#171717] dark:text-[#ededed] tracking-tight">Security Overview</h1>
            <p className="text-[14px] text-[#8f8f8f] mt-0.5">Autonomous security posture and threat intelligence monitoring.</p>
          </div>
          <button 
            onClick={() => {
              setScanTarget('');
              setScanError(null);
              setScanModalOpen(true);
            }}
            className="bg-[#171717] hover:bg-[#000000] dark:bg-[#ededed] dark:hover:bg-[#ffffff] text-[#ffffff] dark:text-[#000000] rounded-full h-[36px] px-5 text-[14px] font-medium transition-all shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <span>New Scan</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          
          <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] p-6 hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1]">Active Scans</h3>
              <Activity className="h-4 w-4 text-[#171717] dark:text-[#ededed]" />
            </div>
            <div className="text-[32px] font-medium tracking-tight text-[#171717] dark:text-[#ededed] mb-1 leading-none">{scans.filter(s => ['QUEUED', 'RECON', 'ATTACK'].includes(s.status)).length}</div>
            <p className="text-[13px] text-[#8f8f8f]">Running concurrently</p>
          </div>

          <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] p-6 hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1]">Critical Findings</h3>
              <AlertTriangle className={`h-4 w-4 ${findings.filter(f => f.severity === 'critical' || f.severity === 'high').length > 0 ? 'text-[#dc2626] dark:text-[#ef4444]' : 'text-[#8f8f8f]'}`} />
            </div>
            <div className="text-[32px] font-medium tracking-tight text-[#171717] dark:text-[#ededed] mb-1 leading-none">{findings.filter(f => f.severity === 'critical' || f.severity === 'high').length}</div>
            <p className="text-[13px] text-[#8f8f8f]">High & Critical severity</p>
          </div>

          <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] p-6 hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1]">Pending Reviews</h3>
              <Clock className="h-4 w-4 text-[#d97706] dark:text-[#f59e0b]" />
            </div>
            <div className="text-[32px] font-medium tracking-tight text-[#171717] dark:text-[#ededed] mb-1 leading-none">{findings.length}</div>
            <p className="text-[13px] text-[#8f8f8f]">Awaiting validation</p>
          </div>

          <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] p-6 hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1]">Verified Issues</h3>
              <FileText className="h-4 w-4 text-[#8f8f8f]" />
            </div>
            <div className="text-[32px] font-medium tracking-tight text-[#171717] dark:text-[#ededed] mb-1 leading-none">{confirmedFindings.filter(f => f.confirmed).length}</div>
            <p className="text-[13px] text-[#8f8f8f]">Confirmed vulnerabilities</p>
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* Active Scans Table */}
          <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#111111]">
              <h3 className="text-[14px] font-medium text-[#171717] dark:text-[#ededed]">Active Scans</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[#ebebeb] dark:border-[#222222] text-[#8f8f8f] dark:text-[#737373] bg-[#fafafa]/50 dark:bg-[#111111]/50 text-[12px] font-medium">
                    <th className="px-6 py-3">Scan ID</th>
                    <th className="px-6 py-3">Target</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebebeb] dark:divide-[#222222] text-[#4d4d4d] dark:text-[#a1a1a1]">
                  {scans.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-[#8f8f8f] text-[13px]">No active scans found.</td></tr>
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
                      <tr key={scan.id} className="hover:bg-[#fafafa] dark:hover:bg-[#111111] transition-colors">
                        <td className="px-6 py-4 font-mono text-[12px] text-[#8f8f8f]" title={scan.id}>{scan.id.substring(0, 8)}...</td>
                        <td className="px-6 py-4 font-medium text-[#171717] dark:text-[#ededed]">{domainName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                            scan.status === 'FAILED' ? 'bg-[#fef2f2] dark:bg-[#ef4444]/10 border-[#fecaca] dark:border-[#ef4444]/30 text-[#dc2626] dark:text-[#ef4444]' :
                            scan.status === 'QUEUED' ? 'bg-[#fafafa] dark:bg-[#111111] border-[#ebebeb] dark:border-[#222222] text-[#8f8f8f]' :
                            scan.status === 'COMPLETED' ? 'bg-[#f0fdf4] dark:bg-[#16a34a]/10 border-[#bbf7d0] dark:border-[#16a34a]/30 text-[#16a34a] dark:text-[#22c55e]' :
                            scan.status === 'SECRETS' || scan.status === 'SECRET_SCAN' ? 'bg-[#f5f3ff] dark:bg-[#7c3aed]/10 border-[#ddd6fe] dark:border-[#7c3aed]/30 text-[#7c3aed] dark:text-[#a78bfa]' :
                            'bg-[#fffbeb] dark:bg-[#d97706]/10 border-[#fde68a] dark:border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]'
                          }`}>
                            {scan.status || 'QUEUED'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <Link 
                            href={`/scans/${scan.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffffff] dark:bg-[#111111] hover:bg-[#fafafa] dark:hover:bg-[#171717] text-[12px] font-mono text-[#171717] dark:text-[#ededed] border border-[#ebebeb] dark:border-[#222222] transition-all"
                            title="Live Scan Console"
                          >
                            <Activity className="h-3 w-3 text-[#171717] dark:text-[#ededed]" />
                            <span>Console</span>
                          </Link>
                          <Link 
                            href={`/reports/${scan.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffffff] dark:bg-[#111111] hover:bg-[#fafafa] dark:hover:bg-[#171717] text-[12px] font-mono text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] border border-[#ebebeb] dark:border-[#222222] transition-all"
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
          <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#111111]">
              <h3 className="text-[14px] font-medium text-[#171717] dark:text-[#ededed]">Discovered Technologies</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[#ebebeb] dark:border-[#222222] text-[#8f8f8f] dark:text-[#737373] bg-[#fafafa]/50 dark:bg-[#111111]/50 text-[12px] font-medium">
                    <th className="px-6 py-3">Tech ID</th>
                    <th className="px-6 py-3">Technology</th>
                    <th className="px-6 py-3">Confidence</th>
                    <th className="px-6 py-3 text-right">Detected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebebeb] dark:divide-[#222222] text-[#4d4d4d] dark:text-[#a1a1a1]">
                  {techFindings.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-[#8f8f8f] text-[13px]">No technologies discovered yet.</td></tr>
                  )}
                  {(showAllTech ? techFindings : techFindings.slice(0, 5)).map((finding) => (
                    <tr key={finding.id} className="hover:bg-[#fafafa] dark:hover:bg-[#111111] transition-colors">
                      <td className="px-6 py-4 font-mono text-[12px] text-[#8f8f8f]" title={finding.id}>{finding.id.toString().substring(0, 8)}...</td>
                      <td className="px-6 py-4 font-mono text-[12px] font-medium text-[#171717] dark:text-[#ededed]">{finding.technology}</td>
                      <td className="px-6 py-4">
                        <span className="text-[12px] font-mono text-[#4d4d4d] dark:text-[#a1a1a1] px-2 py-0.5 rounded bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222]">
                          {finding.confidence}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[12px] text-[#8f8f8f]">
                        {finding.created_at ? new Date(finding.created_at).toLocaleTimeString() : 'Just now'}
                      </td>
                    </tr>
                  ))}
                  {techFindings.length > 5 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-center border-t border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#111111]">
                        <button 
                          onClick={() => setShowAllTech(!showAllTech)}
                          className="text-[12px] font-medium text-[#171717] dark:text-[#ededed] hover:underline cursor-pointer"
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
        <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#111111]">
            <h3 className="text-[14px] font-medium text-[#171717] dark:text-[#ededed]">Candidate Findings (Nuclei Engine)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#ebebeb] dark:border-[#222222] text-[#8f8f8f] dark:text-[#737373] bg-[#fafafa]/50 dark:bg-[#111111]/50 text-[12px] font-medium">
                  <th className="px-6 py-3">Finding ID</th>
                  <th className="px-6 py-3">Vulnerability</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Reasoning</th>
                  <th className="px-6 py-3 text-right">Discovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebebeb] dark:divide-[#222222] text-[#4d4d4d] dark:text-[#a1a1a1]">
                {findings.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-[#8f8f8f] text-[13px]">No candidate findings yet.</td></tr>
                )}
                {findings.map((finding) => (
                  <tr key={finding.id} className="hover:bg-[#fafafa] dark:hover:bg-[#111111] transition-colors">
                    <td className="px-6 py-4 font-mono text-[12px] text-[#8f8f8f]" title={finding.id}>{finding.id.toString().substring(0, 8)}...</td>
                    <td className="px-6 py-4 font-medium text-[#171717] dark:text-[#ededed]">{finding.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                        finding.severity === 'critical' ? 'bg-[#fef2f2] dark:bg-[#ef4444]/10 border-[#fecaca] dark:border-[#ef4444]/30 text-[#dc2626] dark:text-[#ef4444]' :
                        finding.severity === 'high' ? 'bg-[#fff7ed] dark:bg-[#ea580c]/10 border-[#ffedd5] dark:border-[#ea580c]/30 text-[#ea580c] dark:text-[#f97316]' :
                        finding.severity === 'medium' ? 'bg-[#fffbeb] dark:bg-[#d97706]/10 border-[#fde68a] dark:border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]' :
                        finding.severity === 'low' ? 'bg-[#f0f9ff] dark:bg-[#0284c7]/10 border-[#bae6fd] dark:border-[#0284c7]/30 text-[#0284c7] dark:text-[#38bdf8]' :
                        'bg-[#fafafa] dark:bg-[#111111] border-[#ebebeb] dark:border-[#222222] text-[#8f8f8f]'
                      }`}>
                        {finding.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-[#8f8f8f] max-w-[300px] truncate" title={finding.reasoning}>
                      {finding.reasoning}
                    </td>
                    <td className="px-6 py-4 text-right text-[12px] text-[#8f8f8f]">
                      {finding.created_at ? new Date(finding.created_at).toLocaleTimeString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Confirmed Findings Table */}
        <div className="bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#111111] flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-[#171717] dark:text-[#ededed] flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#171717] dark:text-[#ededed]" fill="currentColor" />
              AI Verified Findings
            </h3>
            <span className="text-[12px] text-[#8f8f8f]">Validated by Sentinel AI Triage</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#ebebeb] dark:border-[#222222] text-[#8f8f8f] dark:text-[#737373] bg-[#fafafa]/50 dark:bg-[#111111]/50 text-[12px] font-medium">
                  <th className="px-6 py-3">Finding ID</th>
                  <th className="px-6 py-3">Vulnerability</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Validated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebebeb] dark:divide-[#222222] text-[#4d4d4d] dark:text-[#a1a1a1]">
                {confirmedFindings.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-[#8f8f8f] text-[13px]">No findings verified yet.</td></tr>
                )}
                {confirmedFindings.map((finding) => (
                  <tr key={finding.id} className="hover:bg-[#fafafa] dark:hover:bg-[#111111] transition-colors">
                    <td className="px-6 py-4 font-mono text-[12px] text-[#8f8f8f]" title={finding.id}>{finding.id.toString().substring(0, 8)}...</td>
                    <td className="px-6 py-4 font-medium text-[#171717] dark:text-[#ededed]">{finding.candidate_findings?.title || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                        finding.severity === 'critical' ? 'bg-[#fef2f2] dark:bg-[#ef4444]/10 border-[#fecaca] dark:border-[#ef4444]/30 text-[#dc2626] dark:text-[#ef4444]' :
                        finding.severity === 'high' ? 'bg-[#fff7ed] dark:bg-[#ea580c]/10 border-[#ffedd5] dark:border-[#ea580c]/30 text-[#ea580c] dark:text-[#f97316]' :
                        finding.severity === 'medium' ? 'bg-[#fffbeb] dark:bg-[#d97706]/10 border-[#fde68a] dark:border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]' :
                        finding.severity === 'low' ? 'bg-[#f0f9ff] dark:bg-[#0284c7]/10 border-[#bae6fd] dark:border-[#0284c7]/30 text-[#0284c7] dark:text-[#38bdf8]' :
                        'bg-[#fafafa] dark:bg-[#111111] border-[#ebebeb] dark:border-[#222222] text-[#8f8f8f]'
                      }`}>
                        {finding.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {finding.confirmed ? (
                        <span className="text-[#dc2626] dark:text-[#ef4444] font-medium flex items-center gap-1.5 text-[12px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626] dark:bg-[#ef4444]"></div>
                          VULNERABLE
                        </span>
                      ) : (
                        <span className="text-[#16a34a] dark:text-[#22c55e] font-medium flex items-center gap-1.5 text-[12px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a] dark:bg-[#22c55e]"></div>
                          FALSE POSITIVE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-[12px] text-[#8f8f8f]">
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
          <div className="w-full max-w-[440px] bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[16px] shadow-2xl p-6 relative">
            <button 
              onClick={() => setScanModalOpen(false)}
              className="absolute top-5 right-5 text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            
            <h2 className="text-[18px] font-medium text-[#171717] dark:text-[#ededed] mb-1">Initiate Security Assessment</h2>
            <p className="text-[13px] text-[#8f8f8f] mb-5">
              {scanType === 'web' 
                ? 'Launch automated reconnaissance, fingerprinting, and vulnerability scanning.' 
                : 'Clone repository and execute TruffleHog to detect leaked API keys, tokens, and credentials.'}
            </p>

            {/* Target Type Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] rounded-full mb-4">
              <button
                type="button"
                onClick={() => setScanType('web')}
                className={`py-1.5 text-[13px] font-medium rounded-full transition-all cursor-pointer ${
                  scanType === 'web'
                    ? 'bg-[#ffffff] dark:bg-[#1f1f1f] text-[#171717] dark:text-[#ededed] shadow-xs border border-[#ebebeb] dark:border-[#333333]'
                    : 'text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed]'
                }`}
              >
                Web Application
              </button>
              <button
                type="button"
                onClick={() => setScanType('git')}
                className={`py-1.5 text-[13px] font-medium rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  scanType === 'git'
                    ? 'bg-[#ffffff] dark:bg-[#1f1f1f] text-[#171717] dark:text-[#ededed] shadow-xs border border-[#ebebeb] dark:border-[#333333]'
                    : 'text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed]'
                }`}
              >
                <span>GitHub Repo</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#fafafa] dark:bg-[#111111] text-[#171717] dark:text-[#ededed] border border-[#ebebeb] dark:border-[#222222]">Secret</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#171717] dark:text-[#ededed] mb-1.5">
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
                  placeholder={scanType === 'web' ? 'e.g. hackerone.com or app.example.com' : 'e.g. https://github.com/org/repo.git'}
                  className="w-full h-[40px] px-3 bg-[#ffffff] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] text-[#171717] dark:text-[#ededed] text-[14px] rounded-[8px] focus:outline-none focus:border-[#171717] dark:focus:border-[#ededed] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#ededed] transition-all placeholder-[#8f8f8f]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && scanTarget.trim() && !scanLoading) {
                      document.getElementById('start-scan-btn')?.click();
                    }
                  }}
                />
              </div>

              {scanError && (
                <div className="p-2.5 rounded-[8px] bg-[#fef2f2] dark:bg-[#ef4444]/10 border border-[#fecaca] dark:border-[#ef4444]/30 text-[#dc2626] dark:text-[#ef4444] text-[13px] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#dc2626] dark:text-[#ef4444]" />
                  <span>{scanError}</span>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  onClick={() => setScanModalOpen(false)}
                  disabled={scanLoading}
                  className="px-4 h-[36px] text-[14px] font-medium text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors disabled:opacity-50 cursor-pointer"
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
                  className="bg-[#171717] hover:bg-[#000000] dark:bg-[#ededed] dark:hover:bg-[#ffffff] text-[#ffffff] dark:text-[#000000] rounded-full h-[36px] px-5 text-[14px] font-medium transition-all disabled:opacity-50 flex items-center cursor-pointer shadow-none"
                >
                  {scanLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-black" fill="none" viewBox="0 0 24 24">
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
