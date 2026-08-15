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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data from secrets API
  const fetchData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      const res = await fetch('/api/secrets');
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
        if (data.secrets) setSecrets(data.secrets);
        if (data.scans) setScans(data.scans);
      }
    } catch (err) {
      console.error('Failed to load secret scanner data', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  // Initial load + Real-time auto-polling every 4 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle Starting Secret Scan
  const handleStartScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = repoUrl.trim();
    if (!target) return;

    setStartingScan(true);
    setScanError(null);

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: target,
          targetType: 'git'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate secret scan');
      }

      // Immediately redirect to active scan console / scans page
      router.push(`/scans/${data.scanId}`);
    } catch (err: any) {
      setScanError(err.message || 'Error starting secret scan');
      setStartingScan(false);
    }
  };

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
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

  // Filtered Secrets Inventory
  const filteredSecrets = useMemo(() => {
    return secrets.filter((s) => {
      // Detector filter
      if (selectedDetector !== 'all' && s.detector.toLowerCase() !== selectedDetector.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter === 'verified' && (!s.verifiedLive || s.isFalsePositive)) {
        return false;
      }
      if (statusFilter === 'pattern' && (s.verifiedLive || s.isFalsePositive)) {
        return false;
      }
      if (statusFilter === 'fp' && !s.isFalsePositive) {
        return false;
      }

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inDetector = s.detector.toLowerCase().includes(q);
        const inRepo = s.repoTarget.toLowerCase().includes(q);
        const inFile = s.fileLocation.toLowerCase().includes(q);
        const inAuthor = (s.author || '').toLowerCase().includes(q);
        const inCommit = (s.commit || '').toLowerCase().includes(q);
        const inSnippet = (s.secretSnippet || '').toLowerCase().includes(q);
        const inTitle = s.title.toLowerCase().includes(q);
        return inDetector || inRepo || inFile || inAuthor || inCommit || inSnippet || inTitle;
      }

      return true;
    });
  }, [secrets, selectedDetector, statusFilter, searchQuery]);

  // Detector Breakdown List for quick filter chips
  const detectorList = useMemo(() => {
    const entries = Object.entries(metrics.detectorBreakdown || {});
    return entries.sort((a, b) => b[1] - a[1]);
  }, [metrics.detectorBreakdown]);

  return (
    <div className="min-h-screen bg-[#121212] font-sans text-[#fafafa] selection:bg-[#a855f7]/30 pb-24">
      {/* Top Navigation */}
      <nav className="border-b border-[#2e2e2e] bg-[#171717] sticky top-0 z-40">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-8">
              {/* Brand Logo */}
              <Link href="/" className="flex items-center space-x-2.5">
                <div className="h-7 w-7 rounded-[8px] bg-gradient-to-tr from-[#7e22ce] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#a855f7]/20">
                  <Shield className="h-4 w-4 text-white" strokeWidth={2.5} fill="currentColor" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tracking-tight text-[#fafafa]">Sentinel</span>
                  <span className="hidden sm:inline-flex text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#c084fc] font-medium tracking-wide">
                    Secret Engine
                  </span>
                </div>
              </Link>

              {/* Navigation Tabs */}
              <div className="hidden md:flex space-x-6 text-[14px] font-medium">
                <Link 
                  href="/" 
                  className="text-[#b4b4b4] hover:text-[#fafafa] transition-colors py-[15px]"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/" 
                  className="text-[#b4b4b4] hover:text-[#fafafa] transition-colors py-[15px]"
                >
                  Web Scanner
                </Link>
                <Link 
                  href="/github-scanner" 
                  className="text-[#c084fc] border-b-2 border-[#a855f7] py-[15px] flex items-center gap-1.5 font-medium"
                >
                  <Key className="h-3.5 w-3.5 text-[#a855f7]" />
                  <span>GitHub Scanner</span>
                </Link>
                <Link 
                  href="/reports" 
                  className="text-[#b4b4b4] hover:text-[#fafafa] transition-colors py-[15px]"
                >
                  Reports
                </Link>
              </div>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                title="Refresh secret scanner telemetry"
                className="p-1.5 text-[#898989] hover:text-[#fafafa] hover:bg-[#242424] rounded-lg transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-[#a855f7]' : ''}`} />
              </button>

              <div className="h-4 w-px bg-[#2e2e2e] hidden sm:block" />

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-1 rounded-[8px] hover:bg-[#242424] transition-colors focus:outline-none"
                >
                  <div className="h-7 w-7 rounded-[6px] bg-[#242424] flex items-center justify-center border border-[#393939]">
                    <User className="h-3.5 w-3.5 text-[#b4b4b4]" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-[#898989]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#171717] border border-[#2e2e2e] rounded-[12px] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-[#2e2e2e]">
                      <p className="text-[12px] text-[#898989] font-medium">Signed in as</p>
                      <p className="text-[14px] text-[#fafafa] truncate mt-0.5">{userEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link 
                        href="/" 
                        className="w-full text-left px-4 py-2 text-[13px] text-[#b4b4b4] hover:bg-[#242424] hover:text-[#fafafa] transition-colors flex items-center gap-2"
                      >
                        <Shield className="h-3.5 w-3.5 text-[#3ecf8e]" />
                        <span>Security Overview</span>
                      </Link>
                      <Link 
                        href="/reports" 
                        className="w-full text-left px-4 py-2 text-[13px] text-[#b4b4b4] hover:bg-[#242424] hover:text-[#fafafa] transition-colors flex items-center gap-2"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#898989]" />
                        <span>Assessment Reports</span>
                      </Link>
                    </div>
                    <div className="border-t border-[#2e2e2e] py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-[13px] text-[#f87171] hover:bg-[#7f1d1d]/20 transition-colors flex items-center gap-2"
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
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Scanner Hero / Input Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1c1427] via-[#171717] to-[#171717] border border-[#a855f7]/30 shadow-2xl p-6 md:p-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#a855f7]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-1/3 w-64 h-64 bg-[#3ecf8e]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#c084fc] text-[12px] font-mono mb-4">
              <Sparkles className="h-3.5 w-3.5 text-[#c084fc]" />
              <span>Deep Git History + Live TruffleHog Verification</span>
            </div>

            <h1 className="text-[26px] md:text-[32px] font-bold text-[#fafafa] tracking-tight leading-tight mb-2">
              GitHub & Git Repository Secret Scanner
            </h1>
            <p className="text-[14px] text-[#a3a3a3] leading-relaxed mb-6">
              Detect leaked API keys, tokens, SSH private keys, and cloud credentials across full Git commit histories. Verified active keys are flagged in real-time, with LLM false-positive triage to keep your signal clean.
            </p>

            {/* Input Form */}
            <form onSubmit={handleStartScan} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#898989]">
                    <GitBranch className="h-4 w-4 text-[#a855f7]" />
                  </div>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo or git@github.com:org/repo.git"
                    className="w-full h-[46px] pl-10 pr-4 bg-[#121212]/90 border border-[#393939] focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 rounded-xl text-[14px] text-[#fafafa] placeholder-[#666] outline-none transition-all font-mono"
                    disabled={startingScan}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!repoUrl.trim() || startingScan}
                  className="h-[46px] px-6 bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#a855f7] hover:to-[#c084fc] text-white rounded-xl text-[14px] font-medium transition-all shadow-lg shadow-[#a855f7]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {startingScan ? (
                    <>
                      <Activity className="h-4 w-4 animate-spin text-white" />
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
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px] text-[#898989]">
                <span>Sample repos:</span>
                <button
                  type="button"
                  onClick={() => setRepoUrl('https://github.com/trufflesecurity/test-keys')}
                  className="px-2 py-0.5 bg-[#202020] hover:bg-[#282828] hover:text-[#fafafa] border border-[#333] rounded-md font-mono transition-colors"
                >
                  trufflesecurity/test-keys
                </button>
                <button
                  type="button"
                  onClick={() => setRepoUrl('https://github.com/expressjs/express')}
                  className="px-2 py-0.5 bg-[#202020] hover:bg-[#282828] hover:text-[#fafafa] border border-[#333] rounded-md font-mono transition-colors"
                >
                  expressjs/express
                </button>
                <button
                  type="button"
                  onClick={() => setRepoUrl('https://github.com/facebook/react')}
                  className="px-2 py-0.5 bg-[#202020] hover:bg-[#282828] hover:text-[#fafafa] border border-[#333] rounded-md font-mono transition-colors"
                >
                  facebook/react
                </button>
              </div>

              {scanError && (
                <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl text-[#ef4444] text-[13px] flex items-center gap-2 mt-3">
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
          <div className="bg-[#171717] border border-[#2e2e2e] hover:border-[#a855f7]/40 rounded-xl p-5 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#898989]">Repositories Audited</span>
              <div className="h-8 w-8 rounded-lg bg-[#242424] flex items-center justify-center text-[#a855f7] border border-[#333]">
                <GitBranch className="h-4 w-4" />
              </div>
            </div>
            <div className="text-[28px] font-semibold text-[#fafafa] tracking-tight mb-1">
              {metrics.totalRepositoriesAudited}
            </div>
            <p className="text-[12px] text-[#898989] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7]" />
              Full git commit histories analyzed
            </p>
          </div>

          {/* Verified Live Keys (Critical Exposure) */}
          <div className="bg-[#171717] border border-[#ef4444]/30 hover:border-[#ef4444]/60 rounded-xl p-5 transition-all shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ef4444]/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#ef4444] flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5" />
                Verified Live Keys
              </span>
              <div className="h-8 w-8 rounded-lg bg-[#ef4444]/15 flex items-center justify-center text-[#ef4444] border border-[#ef4444]/30 animate-pulse">
                <Key className="h-4 w-4" />
              </div>
            </div>
            <div className="text-[28px] font-semibold text-[#ef4444] tracking-tight mb-1">
              {metrics.verifiedActiveKeysCount}
            </div>
            <p className="text-[12px] text-[#898989] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
              Active credentials callable right now
            </p>
          </div>

          {/* Total Secrets Detected */}
          <div className="bg-[#171717] border border-[#2e2e2e] hover:border-[#fbbf24]/40 rounded-xl p-5 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#898989]">Total Secrets Detected</span>
              <div className="h-8 w-8 rounded-lg bg-[#242424] flex items-center justify-center text-[#fbbf24] border border-[#333]">
                <Lock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-[28px] font-semibold text-[#fafafa] tracking-tight mb-1">
              {metrics.totalSecretsCount}
            </div>
            <p className="text-[12px] text-[#898989] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
              Across all detectors and branches
            </p>
          </div>

          {/* False Positives Filtered */}
          <div className="bg-[#171717] border border-[#2e2e2e] hover:border-[#3ecf8e]/40 rounded-xl p-5 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#898989]">False Positives Filtered</span>
              <div className="h-8 w-8 rounded-lg bg-[#242424] flex items-center justify-center text-[#3ecf8e] border border-[#333]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-[28px] font-semibold text-[#3ecf8e] tracking-tight mb-1">
              {metrics.falsePositivesFilteredCount}
            </div>
            <p className="text-[12px] text-[#898989] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e]" />
              Dismissed by Sentinel AI triage
            </p>
          </div>

        </div>

        {/* Detector Breakdown Pills */}
        {detectorList.length > 0 && (
          <div className="p-4 bg-[#171717] border border-[#2e2e2e] rounded-xl flex flex-col md:flex-row md:items-center gap-3">
            <span className="text-[12px] font-mono text-[#898989] uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#a855f7]" />
              <span>Detector Spectrum:</span>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedDetector('all')}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                  selectedDetector === 'all'
                    ? 'bg-[#a855f7] text-white shadow-sm'
                    : 'bg-[#202020] text-[#b4b4b4] hover:text-[#fafafa] border border-[#2e2e2e]'
                }`}
              >
                All Detectors ({secrets.length})
              </button>

              {detectorList.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => setSelectedDetector(selectedDetector === name ? 'all' : name)}
                  className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedDetector === name
                      ? 'bg-[#a855f7] text-white shadow-sm'
                      : 'bg-[#202020] text-[#b4b4b4] hover:text-[#fafafa] border border-[#2e2e2e]'
                  }`}
                >
                  <span>{name}</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedDetector === name ? 'bg-black/30 text-white' : 'bg-[#2b2b2b] text-[#898989]'
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2e2e2e] pb-3">
            
            {/* Primary Tab Switcher */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-[#242424] text-[#fafafa] border border-[#393939] shadow-sm'
                    : 'text-[#898989] hover:text-[#fafafa]'
                }`}
              >
                <Key className={`h-4 w-4 ${activeTab === 'inventory' ? 'text-[#a855f7]' : ''}`} />
                <span>Exposed Secrets Inventory</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#a855f7]/20 text-[#c084fc] font-mono">
                  {secrets.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-[#242424] text-[#fafafa] border border-[#393939] shadow-sm'
                    : 'text-[#898989] hover:text-[#fafafa]'
                }`}
              >
                <GitBranch className={`h-4 w-4 ${activeTab === 'history' ? 'text-[#3ecf8e]' : ''}`} />
                <span>Repository Scan History</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#2a2a2a] text-[#898989] font-mono">
                  {scans.length}
                </span>
              </button>
            </div>

            {/* Quick Filters for Secrets Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Box */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#898989]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search file, commit, key..."
                    className="h-[34px] pl-8 pr-3 bg-[#171717] border border-[#2e2e2e] rounded-lg text-[13px] text-[#fafafa] placeholder-[#666] outline-none focus:border-[#a855f7] w-48 sm:w-60"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#898989] hover:text-[#fafafa]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Verification Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="h-[34px] px-2.5 bg-[#171717] border border-[#2e2e2e] rounded-lg text-[13px] text-[#b4b4b4] focus:border-[#a855f7] outline-none cursor-pointer"
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
            <div className="bg-[#171717] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-md">
              {loading ? (
                <div className="p-16 text-center text-[#898989] flex items-center justify-center gap-3 font-mono text-[14px]">
                  <Activity className="h-5 w-5 animate-spin text-[#a855f7]" />
                  <span>Loading secret telemetry...</span>
                </div>
              ) : filteredSecrets.length === 0 ? (
                <div className="p-16 text-center">
                  <Key className="h-10 w-10 text-[#898989] mx-auto mb-3 opacity-30" />
                  <h3 className="text-[16px] font-medium text-[#fafafa]">
                    {searchQuery || selectedDetector !== 'all' || statusFilter !== 'all'
                      ? 'No Secrets Matched Current Filters'
                      : 'No Exposed Secrets Detected Yet'}
                  </h3>
                  <p className="text-[13px] text-[#898989] mt-1 max-w-md mx-auto">
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
                      className="mt-4 px-3.5 py-1.5 bg-[#242424] hover:bg-[#2c2c2c] text-[#fafafa] text-[13px] rounded-lg border border-[#333] transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#2e2e2e] bg-[#1a1a1a] text-[#898989]">
                        <th className="px-5 py-3 font-medium">Detector Type</th>
                        <th className="px-5 py-3 font-medium">Target Repo</th>
                        <th className="px-5 py-3 font-medium">File Location</th>
                        <th className="px-5 py-3 font-medium">Author / Commit</th>
                        <th className="px-5 py-3 font-medium">Secret Snippet</th>
                        <th className="px-5 py-3 font-medium">Live Verification</th>
                        <th className="px-5 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242424]">
                      {filteredSecrets.map((secret) => {
                        const isRevealed = revealedSecrets[secret.id];

                        return (
                          <tr 
                            key={secret.id}
                            className="hover:bg-[#1f1f1f] transition-colors group"
                          >
                            {/* Detector Type */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
                                <span className="font-semibold text-[#fafafa] tracking-tight">
                                  {secret.detector}
                                </span>
                              </div>
                              <span className={`inline-block mt-1 px-1.5 py-0.2 text-[10px] font-mono uppercase rounded ${
                                secret.severity === 'critical' 
                                  ? 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30' 
                                  : 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30'
                              }`}>
                                {secret.severity}
                              </span>
                            </td>

                            {/* Target Repo */}
                            <td className="px-5 py-4 max-w-[200px] truncate">
                              <div className="flex items-center gap-1.5 text-[#b4b4b4]">
                                <GitBranch className="h-3.5 w-3.5 text-[#898989] shrink-0" />
                                <span className="truncate font-mono text-[12px]" title={secret.repoTarget}>
                                  {secret.repoTarget.replace(/^https?:\/\/(github\.com\/)?/, '')}
                                </span>
                              </div>
                            </td>

                            {/* File Location */}
                            <td className="px-5 py-4 max-w-[220px]">
                              <div className="flex items-center gap-1.5">
                                <FileCode className="h-3.5 w-3.5 text-[#a855f7] shrink-0" />
                                <span 
                                  className="font-mono text-[12px] text-[#fafafa] truncate"
                                  title={secret.fileLocation}
                                >
                                  {secret.fileLocation}
                                </span>
                                <button
                                  onClick={() => handleCopy(secret.fileLocation, `file-${secret.id}`)}
                                  title="Copy file path"
                                  className="text-[#666] hover:text-[#fafafa] transition-colors p-1"
                                >
                                  {copiedKey === `file-${secret.id}` ? (
                                    <Check className="h-3 w-3 text-[#3ecf8e]" />
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
                                  <div className="text-[12px] text-[#b4b4b4] truncate flex items-center gap-1" title={secret.author}>
                                    <User className="h-3 w-3 text-[#898989] shrink-0" />
                                    <span className="truncate">{secret.author}</span>
                                  </div>
                                )}
                                {secret.commit && (
                                  <div className="flex items-center gap-1 font-mono text-[11px] text-[#898989]">
                                    <GitCommit className="h-3 w-3 text-[#a855f7]" />
                                    <span>{secret.commit.substring(0, 7)}</span>
                                  </div>
                                )}
                                {!secret.author && !secret.commit && (
                                  <span className="text-[11px] text-[#666] font-mono">Working Tree</span>
                                )}
                              </div>
                            </td>

                            {/* Secret Snippet */}
                            <td className="px-5 py-4 max-w-[200px]">
                              {secret.secretSnippet ? (
                                <div className="flex items-center gap-1.5 bg-[#121212] px-2.5 py-1 rounded-lg border border-[#2e2e2e] font-mono text-[11px] text-[#fafafa]">
                                  <span className="truncate">
                                    {isRevealed ? secret.secretSnippet : '••••••••••••••••••••'}
                                  </span>
                                  <button
                                    onClick={() => toggleReveal(secret.id)}
                                    title={isRevealed ? 'Hide secret' : 'Reveal redacted preview'}
                                    className="text-[#898989] hover:text-[#fafafa] p-0.5"
                                  >
                                    {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={() => handleCopy(secret.secretSnippet || '', `snippet-${secret.id}`)}
                                    title="Copy snippet"
                                    className="text-[#898989] hover:text-[#fafafa] p-0.5"
                                  >
                                    {copiedKey === `snippet-${secret.id}` ? (
                                      <Check className="h-3 w-3 text-[#3ecf8e]" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[#666] font-mono text-[11px]">Redacted by detector</span>
                              )}
                            </td>

                            {/* Live Verification Badge */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              {secret.isFalsePositive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#242424] border border-[#393939] text-[#898989] text-[11px] font-mono">
                                  <CheckCircle2 className="h-3 w-3 text-[#898989]" />
                                  <span>AI FILTERED (FP)</span>
                                </span>
                              ) : secret.verifiedLive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] text-[11px] font-mono font-semibold tracking-wide animate-pulse">
                                  <Flame className="h-3 w-3" />
                                  <span>LIVE ACTIVE KEY</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fbbf24]/15 border border-[#fbbf24]/40 text-[#fbbf24] text-[11px] font-mono">
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
                                  className="px-2.5 py-1 bg-[#242424] hover:bg-[#2c2c2c] text-[#fafafa] rounded-md text-[12px] font-medium border border-[#333] transition-colors cursor-pointer"
                                >
                                  Inspect
                                </button>
                                {secret.scanId && (
                                  <Link
                                    href={`/reports/${secret.scanId}`}
                                    title="View Audit Report"
                                    className="p-1 text-[#898989] hover:text-[#3ecf8e] transition-colors"
                                  >
                                    <ExternalLink className="h-4 w-4" />
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
            <div className="bg-[#171717] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-md">
              {loading ? (
                <div className="p-16 text-center text-[#898989] flex items-center justify-center gap-3 font-mono text-[14px]">
                  <Activity className="h-5 w-5 animate-spin text-[#3ecf8e]" />
                  <span>Loading scan history...</span>
                </div>
              ) : scans.length === 0 ? (
                <div className="p-16 text-center">
                  <GitBranch className="h-10 w-10 text-[#898989] mx-auto mb-3 opacity-30" />
                  <h3 className="text-[16px] font-medium text-[#fafafa]">No Repository Scans Found</h3>
                  <p className="text-[13px] text-[#898989] mt-1 max-w-md mx-auto">
                    Start a scan by entering a GitHub repository URL above.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#2e2e2e] bg-[#1a1a1a] text-[#898989]">
                        <th className="px-5 py-3 font-medium">Scan ID</th>
                        <th className="px-5 py-3 font-medium">Repository Target</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Secrets Found</th>
                        <th className="px-5 py-3 font-medium">Duration</th>
                        <th className="px-5 py-3 font-medium">Started Date</th>
                        <th className="px-5 py-3 font-medium text-right">Console / Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242424]">
                      {scans.map((scan) => {
                        const isActive = ['QUEUED', 'SECRETS', 'VALIDATION', 'REPORT'].includes(scan.status);

                        return (
                          <tr key={scan.id} className="hover:bg-[#1f1f1f] transition-colors">
                            {/* Scan ID */}
                            <td className="px-5 py-4 font-mono text-[12px] text-[#898989] whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{scan.id.substring(0, 8)}...</span>
                                <button
                                  onClick={() => handleCopy(scan.id, `scan-${scan.id}`)}
                                  title="Copy Scan ID"
                                  className="text-[#666] hover:text-[#fafafa] p-0.5"
                                >
                                  {copiedKey === `scan-${scan.id}` ? (
                                    <Check className="h-3 w-3 text-[#3ecf8e]" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Repo Target */}
                            <td className="px-5 py-4 max-w-[240px]">
                              <div className="flex items-center gap-1.5 text-[#fafafa] font-mono text-[12px] truncate">
                                <GitBranch className="h-3.5 w-3.5 text-[#a855f7] shrink-0" />
                                <span className="truncate" title={scan.target}>
                                  {scan.target}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${
                                scan.status === 'COMPLETED'
                                  ? 'bg-[#3ecf8e]/10 border-[#3ecf8e]/30 text-[#3ecf8e]'
                                  : scan.status === 'FAILED'
                                  ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
                                  : scan.status === 'SECRETS'
                                  ? 'bg-[#a855f7]/15 border-[#a855f7]/40 text-[#c084fc] animate-pulse'
                                  : scan.status === 'VALIDATION'
                                  ? 'bg-[#fbbf24]/15 border-[#fbbf24]/40 text-[#fbbf24] animate-pulse'
                                  : 'bg-[#242424] border-[#393939] text-[#898989]'
                              }`}>
                                {isActive && <Activity className="h-3 w-3 animate-spin" />}
                                <span>{scan.status}</span>
                              </span>
                            </td>

                            {/* Secrets Found */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-[#fafafa]">
                                  {scan.secretsCount}
                                </span>
                                {scan.verifiedCount > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 text-[10px] font-mono font-semibold">
                                    {scan.verifiedCount} live
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Duration */}
                            <td className="px-5 py-4 font-mono text-[12px] text-[#898989] whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{scan.duration}</span>
                              </div>
                            </td>

                            {/* Started Date */}
                            <td className="px-5 py-4 font-mono text-[12px] text-[#898989] whitespace-nowrap">
                              {scan.started_at
                                ? new Date(scan.started_at).toLocaleString()
                                : 'Pending'}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              {isActive ? (
                                <Link
                                  href={`/scans/${scan.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#a855f7]/20 hover:bg-[#a855f7]/30 text-[#c084fc] border border-[#a855f7]/40 rounded-lg text-[12px] font-medium transition-colors"
                                >
                                  <Terminal className="h-3 w-3" />
                                  <span>Live Console</span>
                                </Link>
                              ) : (
                                <Link
                                  href={`/reports/${scan.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#242424] hover:bg-[#2c2c2c] text-[#fafafa] border border-[#333] rounded-lg text-[12px] font-medium transition-colors"
                                >
                                  <FileText className="h-3 w-3 text-[#3ecf8e]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-[#171717] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#2e2e2e] flex items-center justify-between bg-[#1f1f1f]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/30 flex items-center justify-center text-[#c084fc]">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#fafafa] tracking-tight">
                    {selectedSecret.detector} Secret Details
                  </h3>
                  <p className="text-[12px] text-[#898989] font-mono">
                    ID: {selectedSecret.id.substring(0, 16)}...
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSecret(null)}
                className="p-1 text-[#898989] hover:text-[#fafafa] rounded-lg hover:bg-[#2e2e2e] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                selectedSecret.isFalsePositive
                  ? 'bg-[#202020] border-[#333] text-[#898989]'
                  : selectedSecret.verifiedLive
                  ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#fafafa]'
                  : 'bg-[#fbbf24]/10 border-[#fbbf24]/30 text-[#fafafa]'
              }`}>
                {selectedSecret.isFalsePositive ? (
                  <CheckCircle2 className="h-5 w-5 text-[#898989] shrink-0 mt-0.5" />
                ) : selectedSecret.verifiedLive ? (
                  <AlertOctagon className="h-5 w-5 text-[#ef4444] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-[#fbbf24] shrink-0 mt-0.5" />
                )}

                <div>
                  <div className="font-semibold text-[14px] flex items-center gap-2">
                    {selectedSecret.isFalsePositive
                      ? 'AI Triaged as False Positive'
                      : selectedSecret.verifiedLive
                      ? 'CRITICAL: Verified Live Active Credential'
                      : 'Pattern Match Detected'}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/10 uppercase">
                      Confidence: {selectedSecret.confidence}%
                    </span>
                  </div>
                  <p className="text-[12px] text-[#b4b4b4] mt-1 leading-relaxed">
                    {selectedSecret.isFalsePositive
                      ? 'Sentinel AI triaged this finding as non-exploitable or test data.'
                      : selectedSecret.verifiedLive
                      ? 'TruffleHog active verification sent an authenticated probe to the provider API and confirmed this secret is currently ACTIVE.'
                      : 'Detected via cryptographic entropy and pattern signature. Recommended to audit immediately.'}
                  </p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                <div className="p-3 bg-[#121212] border border-[#2e2e2e] rounded-lg">
                  <span className="text-[#898989] text-[11px] block font-mono">REPOSITORY</span>
                  <span className="font-mono text-[#fafafa] break-all">{selectedSecret.repoTarget}</span>
                </div>

                <div className="p-3 bg-[#121212] border border-[#2e2e2e] rounded-lg">
                  <span className="text-[#898989] text-[11px] block font-mono">FILE PATH</span>
                  <span className="font-mono text-[#fafafa] break-all">{selectedSecret.fileLocation}</span>
                </div>

                {selectedSecret.commit && (
                  <div className="p-3 bg-[#121212] border border-[#2e2e2e] rounded-lg">
                    <span className="text-[#898989] text-[11px] block font-mono">COMMIT HASH</span>
                    <span className="font-mono text-[#a855f7]">{selectedSecret.commit}</span>
                  </div>
                )}

                {selectedSecret.author && (
                  <div className="p-3 bg-[#121212] border border-[#2e2e2e] rounded-lg">
                    <span className="text-[#898989] text-[11px] block font-mono">AUTHOR / COMMITTER</span>
                    <span className="text-[#fafafa]">{selectedSecret.author}</span>
                  </div>
                )}
              </div>

              {/* Secret Snippet */}
              {selectedSecret.secretSnippet && (
                <div>
                  <label className="text-[12px] font-mono text-[#898989] uppercase tracking-wider block mb-1.5">
                    Redacted Secret Payload:
                  </label>
                  <div className="p-3 bg-[#121212] border border-[#2e2e2e] rounded-lg font-mono text-[12px] text-[#ef4444] flex items-center justify-between">
                    <span className="break-all">{selectedSecret.secretSnippet}</span>
                    <button
                      onClick={() => handleCopy(selectedSecret.secretSnippet || '', 'modal-snippet')}
                      className="ml-2 px-2 py-1 bg-[#242424] hover:bg-[#2e2e2e] text-[#fafafa] rounded text-[11px] transition-colors shrink-0"
                    >
                      {copiedKey === 'modal-snippet' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Raw Reasoning Log */}
              <div>
                <label className="text-[12px] font-mono text-[#898989] uppercase tracking-wider block mb-1.5">
                  TruffleHog & Agent Raw Log:
                </label>
                <pre className="p-3 bg-[#101010] border border-[#282828] rounded-lg font-mono text-[12px] text-[#b4b4b4] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {selectedSecret.reasoning || 'No raw log recorded.'}
                </pre>
              </div>

              {/* Recommended Remediation Action */}
              <div className="p-4 bg-[#1e1329] border border-[#a855f7]/30 rounded-xl space-y-2">
                <h4 className="text-[13px] font-semibold text-[#c084fc] flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-[#a855f7]" />
                  Recommended Incident Response
                </h4>
                <ul className="text-[12px] text-[#d4d4d4] space-y-1.5 list-disc list-inside">
                  <li><strong>Revoke immediately:</strong> Disable the {selectedSecret.detector} key in the provider console to prevent unauthorized exploitation.</li>
                  <li><strong>Purge Git history:</strong> Use <code className="bg-[#121212] px-1.5 py-0.5 rounded text-[#a855f7]">git-filter-repo</code> or <code className="bg-[#121212] px-1.5 py-0.5 rounded text-[#a855f7]">bfg --delete-files</code> to scrub historical commits.</li>
                  <li><strong>Rotate & Inject:</strong> Generate a new secret and inject via secure environment variables or a Secret Manager.</li>
                </ul>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#2e2e2e] bg-[#1a1a1a] flex items-center justify-between">
              <span className="text-[12px] text-[#898989] font-mono">
                Detected on {new Date(selectedSecret.createdAt).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSecret(null)}
                  className="px-4 py-2 bg-[#242424] hover:bg-[#2c2c2c] text-[#fafafa] rounded-lg text-[13px] font-medium transition-colors"
                >
                  Close
                </button>
                {selectedSecret.scanId && (
                  <Link
                    href={`/reports/${selectedSecret.scanId}`}
                    className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5"
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
