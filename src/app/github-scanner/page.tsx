'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Key, 
  Lock, 
  GitBranch, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Copy,
  Check,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  FileCode,
  User,
  Clock,
  Activity,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  LogOut,
  Settings,
  GitCommit,
  Flame,
  ArrowRight,
  Filter,
  X,
  AlertOctagon,
  FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';

interface SecretItem {
  id: string;
  scanId: string;
  title: string;
  severity: string;
  confidence: number;
  reasoning: string;
  detector: string;
  fileLocation: string;
  commit: string | null;
  author: string | null;
  secretSnippet: string | null;
  verifiedLive: boolean;
  triageStatus: 'CONFIRMED' | 'FALSE_POSITIVE' | 'PENDING';
  confirmed: boolean | null;
  isFalsePositive: boolean;
  repoTarget: string;
  createdAt: string;
}

interface ScanItem {
  id: string;
  target: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration: string;
  secretsCount: number;
  verifiedCount: number;
}

interface Metrics {
  totalRepositoriesAudited: number;
  verifiedActiveKeysCount: number;
  totalSecretsCount: number;
  falsePositivesFilteredCount: number;
  detectorBreakdown: Record<string, number>;
}

export default function GitHubScannerPage() {
  const router = useRouter();
  
  // Data States
  const [metrics, setMetrics] = useState<Metrics>({
    totalRepositoriesAudited: 0,
    verifiedActiveKeysCount: 0,
    totalSecretsCount: 0,
    falsePositivesFilteredCount: 0,
    detectorBreakdown: {},
  });
  const [secrets, setSecrets] = useState<SecretItem[]>([]);
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Scan Launcher State
  const [repoUrl, setRepoUrl] = useState('');
  const [startingScan, setStartingScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Filter & Navigation States
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [selectedDetector, setSelectedDetector] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pattern' | 'fp'>('all');
  
  // UI Helpers
  const [selectedSecret, setSelectedSecret] = useState<SecretItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email || 'SecOps Operator');
    }
    loadUser();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch all Secret Telemetry from API
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/secrets');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {
          totalRepositoriesAudited: 0,
          verifiedActiveKeysCount: 0,
          totalSecretsCount: 0,
          falsePositivesFilteredCount: 0,
          detectorBreakdown: {},
        });
        setSecrets(data.secrets || []);
        setScans(data.scans || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch secret scanner telemetry:', err?.message || err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 5s for active scan updates
    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Start Secret Scan Handler
  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = repoUrl.trim();
    if (!target) return;

    setStartingScan(true);
    setScanError(null);

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          targetType: 'git',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.scanId) {
          router.push(`/scans/${data.scanId}`);
        } else {
          setRepoUrl('');
          fetchData();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setScanError(err.error || 'Failed to initiate secret scan.');
      }
    } catch (err: any) {
      setScanError(err?.message || 'Network error initiating secret scan.');
    } finally {
      setStartingScan(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Filtered Secrets List
  const filteredSecrets = useMemo(() => {
    return secrets.filter(secret => {
      // Detector Filter
      if (selectedDetector !== 'all' && secret.detector.toLowerCase() !== selectedDetector.toLowerCase()) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'verified' && !secret.verifiedLive) return false;
      if (statusFilter === 'pattern' && (secret.verifiedLive || secret.isFalsePositive)) return false;
      if (statusFilter === 'fp' && !secret.isFalsePositive) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesFile = secret.fileLocation.toLowerCase().includes(q);
        const matchesRepo = secret.repoTarget.toLowerCase().includes(q);
        const matchesDetector = secret.detector.toLowerCase().includes(q);
        const matchesAuthor = secret.author?.toLowerCase().includes(q);
        const matchesCommit = secret.commit?.toLowerCase().includes(q);
        const matchesSnippet = secret.secretSnippet?.toLowerCase().includes(q);
        return matchesFile || matchesRepo || matchesDetector || matchesAuthor || matchesCommit || matchesSnippet;
      }

      return true;
    });
  }, [secrets, selectedDetector, statusFilter, searchQuery]);

  // Detector Breakdown Sorted List
  const detectorList = useMemo(() => {
    const entries = Object.entries(metrics.detectorBreakdown || {});
    return entries.sort((a, b) => b[1] - a[1]);
  }, [metrics.detectorBreakdown]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-150">
      {/* Top Header Navigation */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            
            {/* Left Brand & Links */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2.5">
                <div className="h-6 w-6 rounded-[6px] bg-primary flex items-center justify-center text-primary-foreground">
                  <Shield className="h-3.5 w-3.5" fill="currentColor" />
                </div>
                <span className="font-medium tracking-tight text-foreground text-[15px]">Sentinel</span>
              </Link>

              <div className="hidden md:flex space-x-6 text-[14px] font-medium">
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors py-[15px]">
                  Dashboard
                </Link>
                <Link 
                  href="/github-scanner" 
                  className="text-foreground border-b-2 border-primary py-[15px] flex items-center gap-1.5"
                >
                  <span>GitHub Scanner</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                    Secrets
                  </span>
                </Link>
                <Link href="/reports" className="text-muted-foreground hover:text-foreground transition-colors py-[15px]">
                  Reports
                </Link>
              </div>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />

              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                title="Refresh secret scanner telemetry"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full border border-transparent hover:border-border transition-all cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-foreground' : ''}`} />
              </button>

              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-secondary border border-transparent hover:border-border transition-colors focus:outline-none cursor-pointer"
                >
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center border border-border">
                    <User className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-[6px] shadow-none py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Signed in as</p>
                      <p className="text-[13px] text-foreground font-medium truncate mt-0.5">{userEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link 
                        href="/" 
                        className="w-full text-left px-4 py-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2"
                      >
                        <Shield className="h-3.5 w-3.5 text-foreground" />
                        <span>Security Overview</span>
                      </Link>
                      <Link 
                        href="/reports" 
                        className="w-full text-left px-4 py-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Assessment Reports</span>
                      </Link>
                    </div>
                    <div className="border-t border-border py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Scanner Hero / Input Card */}
        <div className="bg-card border border-border rounded-[6px] p-6 md:p-8 shadow-none relative overflow-hidden">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary border border-border text-foreground text-[12px] font-mono mb-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Deep Git History + Live TruffleHog Engine</span>
            </div>

            <h1 className="text-[26px] md:text-[32px] font-medium text-foreground tracking-tight leading-tight mb-2">
              GitHub & Git Repository Secret Scanner
            </h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
              Detect leaked API keys, tokens, SSH private keys, and cloud credentials across full Git commit histories. Verified active keys are flagged in real-time, with LLM false-positive triage to keep your signal clean.
            </p>

            {/* Input Form */}
            <form onSubmit={handleStartScan} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <GitBranch className="h-4 w-4 text-primary" />
                  </div>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo or git@github.com:org/repo.git"
                    className="w-full h-[44px] pl-10 pr-4 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-full text-[14px] text-foreground placeholder:text-muted-foreground outline-none transition-all font-mono"
                    disabled={startingScan}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!repoUrl.trim() || startingScan}
                  className="h-[44px] px-6 bg-primary hover:bg-[#0000cd] dark:hover:bg-[#9ec5ff] text-primary-foreground rounded-[6px] text-[14px] font-semibold transition-all shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {startingScan ? (
                    <>
                      <Activity className="h-4 w-4 animate-spin text-primary-foreground" />
                      <span>Initiating Scan...</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      <span>Start Secret Scan</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-80" />
                    </>
                  )}
                </button>
              </div>

              {/* Sample Targets */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px] text-muted-foreground">
                <span>Sample repos:</span>
                <button
                  type="button"
                  onClick={() => setRepoUrl('https://github.com/trufflesecurity/test-keys')}
                  className="px-2.5 py-0.5 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-full font-mono text-[11px] transition-colors cursor-pointer"
                >
                  trufflesecurity/test-keys
                </button>
                <button
                  type="button"
                  onClick={() => setRepoUrl('https://github.com/expressjs/express')}
                  className="px-2.5 py-0.5 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-full font-mono text-[11px] transition-colors cursor-pointer"
                >
                  expressjs/express
                </button>
                <button
                  type="button"
                  onClick={() => setRepoUrl('https://github.com/facebook/react')}
                  className="px-2.5 py-0.5 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-full font-mono text-[11px] transition-colors cursor-pointer"
                >
                  facebook/react
                </button>
              </div>

              {scanError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-[8px] text-destructive text-[13px] flex items-center gap-2 mt-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Repositories Audited */}
          <div className="bg-card border border-border hover:border-primary/40 rounded-[6px] p-5 transition-all shadow-none">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-muted-foreground">Repositories Audited</span>
              <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-primary border border-border">
                <GitBranch className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-[28px] font-medium text-foreground tracking-tight mb-1">
              {metrics.totalRepositoriesAudited}
            </div>
            <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Full git commit histories analyzed
            </p>
          </div>

          {/* Verified Live Keys (Critical Exposure) */}
          <div className="bg-card border border-destructive/30 hover:border-destructive/50 rounded-[6px] p-5 transition-all shadow-none">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-destructive flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5" />
                Verified Live Keys
              </span>
              <div className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/30">
                <Key className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-[28px] font-medium text-destructive tracking-tight mb-1">
              {metrics.verifiedActiveKeysCount}
            </div>
            <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Active credentials callable right now
            </p>
          </div>

          {/* Total Secrets Detected */}
          <div className="bg-card border border-border hover:border-primary/40 rounded-[6px] p-5 transition-all shadow-none">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-muted-foreground">Total Secrets Detected</span>
              <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-foreground border border-border">
                <Lock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-[28px] font-medium text-foreground tracking-tight mb-1">
              {metrics.totalSecretsCount}
            </div>
            <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d97706] dark:bg-[#f59e0b]" />
              Across all detectors and branches
            </p>
          </div>

          {/* False Positives Filtered */}
          <div className="bg-card border border-border hover:border-primary/40 rounded-[6px] p-5 transition-all shadow-none">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-muted-foreground">False Positives Filtered</span>
              <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[#788c5d] dark:text-[#8ca36f] border border-border">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-[28px] font-medium text-[#788c5d] dark:text-[#8ca36f] tracking-tight mb-1">
              {metrics.falsePositivesFilteredCount}
            </div>
            <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#788c5d] dark:bg-[#8ca36f]" />
              Dismissed by Sentinel triage
            </p>
          </div>

        </div>

        {/* Detector Breakdown Pills */}
        {detectorList.length > 0 && (
          <div className="p-4 bg-secondary/60 border border-border rounded-[6px] flex flex-col md:flex-row md:items-center gap-3">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-foreground" />
              <span>Detector Spectrum:</span>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedDetector('all')}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                  selectedDetector === 'all'
                    ? 'bg-primary text-primary-foreground shadow-none'
                    : 'bg-card text-foreground hover:bg-muted border border-border'
                }`}
              >
                All Detectors ({secrets.length})
              </button>

              {detectorList.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => setSelectedDetector(selectedDetector === name ? 'all' : name)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedDetector === name
                      ? 'bg-primary text-primary-foreground shadow-none'
                      : 'bg-card text-foreground hover:bg-muted border border-border'
                  }`}
                >
                  <span>{name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedDetector === name ? 'bg-primary-foreground/20 text-current' : 'bg-secondary text-muted-foreground border border-border'
                  }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Section Header with Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
            
            {/* Primary Tab Switcher */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 text-[13px] font-medium rounded-full transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-card text-foreground border border-border shadow-none'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Key className={`h-3.5 w-3.5 ${activeTab === 'inventory' ? 'text-primary' : ''}`} />
                <span>Exposed Secrets Inventory</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-foreground border border-border font-mono">
                  {secrets.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-[13px] font-medium rounded-full transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-card text-foreground border border-border shadow-none'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GitBranch className={`h-3.5 w-3.5 ${activeTab === 'history' ? 'text-primary' : ''}`} />
                <span>Repository Scan History</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground border border-border font-mono">
                  {scans.length}
                </span>
              </button>
            </div>

            {/* Quick Filters for Secrets Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Box */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search file, commit, key..."
                    className="h-[34px] pl-8 pr-3 bg-background border border-border rounded-full text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary w-48 sm:w-60"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Verification Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as any)}
                  className="h-[34px] px-3 bg-background border border-border rounded-full text-[13px] text-foreground focus:border-primary outline-none cursor-pointer"
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="verified">Live Active Keys Only</option>
                  <option value="pattern">Pattern Matches Only</option>
                  <option value="fp">False Positives Filtered</option>
                </select>
              </div>
            )}
          </div>

          {/* TAB 1: EXPOSED SECRETS INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="bg-card border border-border rounded-[6px] overflow-hidden shadow-none">
              {loading ? (
                <div className="p-16 text-center text-muted-foreground flex items-center justify-center gap-3 font-mono text-[14px]">
                  <Activity className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading secret telemetry...</span>
                </div>
              ) : filteredSecrets.length === 0 ? (
                <div className="p-16 text-center">
                  <Key className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <h3 className="text-[16px] font-medium text-foreground">
                    {searchQuery || selectedDetector !== 'all' || statusFilter !== 'all'
                      ? 'No Secrets Matched Current Filters'
                      : 'No Exposed Secrets Detected Yet'}
                  </h3>
                  <p className="text-[13px] text-muted-foreground mt-1 max-w-md mx-auto">
                    {searchQuery || selectedDetector !== 'all' || statusFilter !== 'all'
                      ? 'Try clearing the search query or detector filter to view all findings.'
                      : 'Run a new secret scan using the hero input above to audit a repository.'}
                  </p>
                  {(searchQuery || selectedDetector !== 'all' || statusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedDetector('all');
                        setStatusFilter('all');
                      }}
                      className="mt-4 px-4 py-1.5 bg-primary hover:bg-[#0000cd] dark:hover:bg-[#9ec5ff] text-primary-foreground text-[13px] font-semibold rounded-[6px] transition-colors cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary text-muted-foreground text-[12px] font-medium">
                        <th className="px-5 py-3">Detector Type</th>
                        <th className="px-5 py-3">Target Repo</th>
                        <th className="px-5 py-3">File Location</th>
                        <th className="px-5 py-3">Author / Commit</th>
                        <th className="px-5 py-3">Secret Snippet</th>
                        <th className="px-5 py-3">Live Verification</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-muted-foreground">
                      {filteredSecrets.map((secret) => {
                        const isRevealed = revealedSecrets[secret.id];

                        return (
                          <tr 
                            key={secret.id}
                            className="hover:bg-accent/40 transition-colors group"
                          >
                            {/* Detector Type */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                <span className="font-medium text-foreground">
                                  {secret.detector}
                                </span>
                              </div>
                              <span className={`inline-block mt-1 px-2 py-0.2 text-[10px] font-mono uppercase rounded-full ${
                                secret.severity === 'critical' 
                                  ? 'bg-destructive/10 text-destructive border border-destructive/30' 
                                  : 'bg-[#d97706]/10 text-[#d97706] dark:text-[#f59e0b] border border-[#d97706]/30'
                              }`}>
                                {secret.severity}
                              </span>
                            </td>

                            {/* Target Repo */}
                            <td className="px-5 py-4 max-w-[200px] truncate">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate font-mono text-[12px]" title={secret.repoTarget}>
                                  {secret.repoTarget.replace(/^https?:\/\/(github\.com\/)?/, '')}
                                </span>
                              </div>
                            </td>

                            {/* File Location */}
                            <td className="px-5 py-4 max-w-[220px]">
                              <div className="flex items-center gap-1.5">
                                <FileCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span 
                                  className="font-mono text-[12px] text-foreground truncate"
                                  title={secret.fileLocation}
                                >
                                  {secret.fileLocation}
                                </span>
                                <button
                                  onClick={() => handleCopy(secret.fileLocation, `file-${secret.id}`)}
                                  title="Copy file path"
                                  className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                                >
                                  {copiedKey === `file-${secret.id}` ? (
                                    <Check className="h-3 w-3 text-[#788c5d] dark:text-[#8ca36f]" />
                                  ) : (
                                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Author / Commit */}
                            <td className="px-5 py-4 max-w-[180px]">
                              <div className="space-y-1">
                                {secret.author && (
                                  <div className="text-[12px] text-muted-foreground truncate flex items-center gap-1" title={secret.author}>
                                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{secret.author}</span>
                                  </div>
                                )}
                                {secret.commit && (
                                  <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                                    <GitCommit className="h-3 w-3 text-foreground" />
                                    <span>{secret.commit.substring(0, 7)}</span>
                                  </div>
                                )}
                                {!secret.author && !secret.commit && (
                                  <span className="text-[11px] text-muted-foreground font-mono">Working Tree</span>
                                )}
                              </div>
                            </td>

                            {/* Secret Snippet */}
                            <td className="px-5 py-4 max-w-[200px]">
                              {secret.secretSnippet ? (
                                <div className="flex items-center gap-1.5 bg-secondary px-2.5 py-1 rounded-full border border-border font-mono text-[11px] text-foreground">
                                  <span className="truncate">
                                    {isRevealed ? secret.secretSnippet : '••••••••••••••••••••'}
                                  </span>
                                  <button
                                    onClick={() => toggleReveal(secret.id)}
                                    title={isRevealed ? 'Hide secret' : 'Reveal redacted preview'}
                                    className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                                  >
                                    {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={() => handleCopy(secret.secretSnippet || '', `snippet-${secret.id}`)}
                                    title="Copy snippet"
                                    className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                                  >
                                    {copiedKey === `snippet-${secret.id}` ? (
                                      <Check className="h-3 w-3 text-[#788c5d] dark:text-[#8ca36f]" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground font-mono text-[11px]">Redacted by detector</span>
                              )}
                            </td>

                            {/* Live Verification Badge */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              {secret.isFalsePositive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground text-[11px] font-mono">
                                  <CheckCircle2 className="h-3 w-3 text-[#788c5d] dark:text-[#8ca36f]" />
                                  <span>AI FILTERED (FP)</span>
                                </span>
                              ) : secret.verifiedLive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-[11px] font-mono font-medium tracking-wide">
                                  <Flame className="h-3 w-3" />
                                  <span>LIVE ACTIVE KEY</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d97706]/10 border border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b] text-[11px] font-mono">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>PATTERN MATCH</span>
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedSecret(secret)}
                                  className="px-3 py-1 bg-card hover:bg-muted text-foreground rounded-[6px] text-[12px] font-normal border border-border transition-colors cursor-pointer shadow-none"
                                >
                                  Inspect
                                </button>
                                {secret.scanId && (
                                  <Link
                                    href={`/reports/${secret.scanId}`}
                                    title="View Audit Report"
                                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REPOSITORY SCAN HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-card border border-border rounded-[6px] overflow-hidden shadow-none">
              {loading ? (
                <div className="p-16 text-center text-muted-foreground flex items-center justify-center gap-3 font-mono text-[14px]">
                  <Activity className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading scan history...</span>
                </div>
              ) : scans.length === 0 ? (
                <div className="p-16 text-center">
                  <GitBranch className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <h3 className="text-[16px] font-medium text-foreground">No Repository Scans Found</h3>
                  <p className="text-[13px] text-muted-foreground mt-1 max-w-md mx-auto">
                    Start a scan by entering a GitHub repository URL above.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary text-muted-foreground text-[12px] font-medium">
                        <th className="px-5 py-3">Scan ID</th>
                        <th className="px-5 py-3">Repository Target</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Secrets Found</th>
                        <th className="px-5 py-3">Duration</th>
                        <th className="px-5 py-3">Started Date</th>
                        <th className="px-5 py-3 text-right">Console / Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-muted-foreground">
                      {scans.map((scan) => {
                        const isActive = ['QUEUED', 'SECRETS', 'VALIDATION', 'REPORTING'].includes(scan.status);

                        return (
                          <tr key={scan.id} className="hover:bg-accent/40 transition-colors">
                            {/* Scan ID */}
                            <td className="px-5 py-4 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{scan.id.substring(0, 8)}...</span>
                                <button
                                  onClick={() => handleCopy(scan.id, `scan-${scan.id}`)}
                                  title="Copy Scan ID"
                                  className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                                >
                                  {copiedKey === `scan-${scan.id}` ? (
                                    <Check className="h-3 w-3 text-[#788c5d] dark:text-[#8ca36f]" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Repo Target */}
                            <td className="px-5 py-4 max-w-[240px]">
                              <div className="flex items-center gap-1.5 text-foreground font-mono text-[12px] truncate">
                                <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate" title={scan.target}>
                                  {scan.target}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${
                                scan.status === 'COMPLETED'
                                  ? 'bg-[#788c5d]/10 border-[#788c5d]/30 text-[#788c5d] dark:text-[#8ca36f]'
                                  : scan.status === 'FAILED'
                                  ? 'bg-destructive/10 border-destructive/30 text-destructive'
                                  : scan.status === 'SECRETS'
                                  ? 'bg-secondary border-border text-foreground'
                                  : scan.status === 'VALIDATION'
                                  ? 'bg-[#d97706]/10 border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]'
                                  : 'bg-secondary border-border text-muted-foreground'
                              }`}>
                                {isActive && <Activity className="h-3 w-3 animate-spin text-primary" />}
                                <span>{scan.status}</span>
                              </span>
                            </td>

                            {/* Secrets Found */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-foreground">
                                  {scan.secretsCount}
                                </span>
                                {scan.verifiedCount > 0 && (
                                  <span className="px-2 py-0.2 rounded-full bg-destructive/10 text-destructive border border-destructive/30 text-[10px] font-mono font-medium">
                                    {scan.verifiedCount} live
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Duration */}
                            <td className="px-5 py-4 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{scan.duration}</span>
                              </div>
                            </td>

                            {/* Started Date */}
                            <td className="px-5 py-4 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                              {scan.started_at
                                ? new Date(scan.started_at).toLocaleString()
                                : 'Pending'}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              {isActive ? (
                                <Link
                                  href={`/scans/${scan.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary hover:bg-[#0000cd] dark:hover:bg-[#9ec5ff] text-primary-foreground rounded-[6px] text-[12px] font-semibold transition-colors"
                                >
                                  <Terminal className="h-3 w-3" />
                                  <span>Live Console</span>
                                </Link>
                              ) : (
                                <Link
                                  href={`/reports/${scan.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-card hover:bg-muted text-foreground border border-border rounded-full text-[12px] font-medium transition-colors"
                                >
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  <span>Report</span>
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </main>

      {/* Secret Detail Inspection Modal */}
      {selectedSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-[6px] shadow-none overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-secondary">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center text-primary">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-foreground tracking-tight">
                    {selectedSecret.detector} Secret Details
                  </h3>
                  <p className="text-[12px] text-muted-foreground font-mono">
                    ID: {selectedSecret.id.substring(0, 16)}...
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSecret(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              
              {/* Status Banner */}
              <div className={`p-4 rounded-[6px] border flex items-start gap-3 ${
                selectedSecret.isFalsePositive
                  ? 'bg-secondary border-border text-muted-foreground'
                  : selectedSecret.verifiedLive
                  ? 'bg-destructive/10 border-destructive/30 text-destructive'
                  : 'bg-[#d97706]/10 border-[#d97706]/30 text-[#d97706] dark:text-[#f59e0b]'
              }`}>
                {selectedSecret.isFalsePositive ? (
                  <CheckCircle2 className="h-5 w-5 text-[#788c5d] dark:text-[#8ca36f] shrink-0 mt-0.5" />
                ) : selectedSecret.verifiedLive ? (
                  <AlertOctagon className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-[#d97706] dark:text-[#f59e0b] shrink-0 mt-0.5" />
                )}

                <div>
                  <div className="font-medium text-[14px] flex items-center gap-2 text-foreground">
                    {selectedSecret.isFalsePositive
                      ? 'AI Triaged as False Positive'
                      : selectedSecret.verifiedLive
                      ? 'CRITICAL: Verified Live Active Credential'
                      : 'Pattern Match Detected'}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border uppercase text-muted-foreground">
                      Confidence: {selectedSecret.confidence}%
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    {selectedSecret.isFalsePositive
                      ? 'Sentinel triaged this finding as non-exploitable or test data.'
                      : selectedSecret.verifiedLive
                      ? 'TruffleHog active verification sent an authenticated probe to the provider API and confirmed this secret is currently ACTIVE.'
                      : 'Detected via cryptographic entropy and pattern signature. Recommended to audit immediately.'}
                  </p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                <div className="p-3 bg-secondary border border-border rounded-[8px]">
                  <span className="text-muted-foreground text-[11px] block font-mono">REPOSITORY</span>
                  <span className="font-mono text-foreground break-all font-medium">{selectedSecret.repoTarget}</span>
                </div>

                <div className="p-3 bg-secondary border border-border rounded-[8px]">
                  <span className="text-muted-foreground text-[11px] block font-mono">FILE PATH</span>
                  <span className="font-mono text-foreground break-all font-medium">{selectedSecret.fileLocation}</span>
                </div>

                {selectedSecret.commit && (
                  <div className="p-3 bg-secondary border border-border rounded-[8px]">
                    <span className="text-muted-foreground text-[11px] block font-mono">COMMIT HASH</span>
                    <span className="font-mono text-foreground">{selectedSecret.commit}</span>
                  </div>
                )}

                {selectedSecret.author && (
                  <div className="p-3 bg-secondary border border-border rounded-[8px]">
                    <span className="text-muted-foreground text-[11px] block font-mono">AUTHOR / COMMITTER</span>
                    <span className="text-foreground font-medium">{selectedSecret.author}</span>
                  </div>
                )}
              </div>

              {/* Secret Snippet */}
              {selectedSecret.secretSnippet && (
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Redacted Secret Payload:
                  </label>
                  <div className="p-3 bg-secondary border border-border rounded-[8px] font-mono text-[12px] text-destructive flex items-center justify-between">
                    <span className="break-all">{selectedSecret.secretSnippet}</span>
                    <button
                      onClick={() => handleCopy(selectedSecret.secretSnippet || '', 'modal-snippet')}
                      className="ml-2 px-3 py-1 bg-card hover:bg-muted text-foreground border border-border rounded-full text-[11px] transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedKey === 'modal-snippet' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Raw Reasoning Log */}
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
                  TruffleHog & Agent Raw Log:
                </label>
                <pre className="p-3 bg-secondary border border-border rounded-[8px] font-mono text-[12px] text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {selectedSecret.reasoning || 'No raw log recorded.'}
                </pre>
              </div>

              {/* Recommended Remediation Action */}
              <div className="p-4 bg-secondary border border-border rounded-[6px] space-y-2">
                <h4 className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Recommended Incident Response
                </h4>
                <ul className="text-[13px] text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li><strong>Revoke immediately:</strong> Disable the {selectedSecret.detector} key in the provider console to prevent unauthorized exploitation.</li>
                  <li><strong>Purge Git history:</strong> Use <code className="bg-card border border-border px-1.5 py-0.5 rounded text-foreground">git-filter-repo</code> or <code className="bg-card border border-border px-1.5 py-0.5 rounded text-foreground">bfg --delete-files</code> to scrub historical commits.</li>
                  <li><strong>Rotate & Inject:</strong> Generate a new secret and inject via secure environment variables or a Secret Manager.</li>
                </ul>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-secondary flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground font-mono">
                Detected on {new Date(selectedSecret.createdAt).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSecret(null)}
                  className="px-4 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-[6px] text-[13px] font-normal transition-colors cursor-pointer"
                >
                  Close
                </button>
                {selectedSecret.scanId && (
                  <Link
                    href={`/reports/${selectedSecret.scanId}`}
                    className="px-4 py-1.5 bg-primary hover:bg-[#0000cd] dark:hover:bg-[#9ec5ff] text-primary-foreground rounded-[6px] text-[13px] font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <span>View Audit Report</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
