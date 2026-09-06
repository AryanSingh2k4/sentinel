'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
  FileText,
  Layers,
  Search,
  Settings,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  Globe,
  GitBranch,
  Terminal,
  Copy,
  Check,
  Download,
  Trash2,
  Filter,
  RefreshCw,
  StopCircle,
  Zap,
  Lock,
  Cpu,
  Server,
  Code2,
  AlertCircle,
  Eye,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';

// Types
interface ScanMeta {
  id: string;
  target: string;
  base_url: string;
  target_type: 'web' | 'git';
  status:
    | 'QUEUED'
    | 'RECON'
    | 'SECRETS'
    | 'ATTACK'
    | 'VALIDATION'
    | 'REPORTING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED'
    | string;
  started_at: string | null;
  completed_at: string | null;
  profile?: string | null;
}

interface EventItem {
  id: string;
  scan_id: string;
  event_type: string;
  payload: any;
  created_at: string;
}

interface DiscoveredUrl {
  id: string;
  scan_id: string;
  url: string;
  method?: string | null;
  status_code?: number | null;
  discovered_by?: string | null;
}

interface DiscoveredTech {
  id: string;
  scan_id: string;
  technology: string;
  version?: string | null;
  confidence?: number | null;
}

interface CandidateFinding {
  id: string;
  scan_id: string;
  title: string;
  severity: string;
  confidence?: number | null;
  reasoning?: string | null;
  created_at?: string | null;
}

interface ConfirmedFinding {
  id: string;
  severity: string;
  confirmed: boolean | null;
  created_at: string | null;
  candidate_finding_id: string | null;
  candidate_findings?: {
    id: string;
    title: string;
    reasoning: string | null;
    confidence: number | null;
  } | null;
}

interface ScanDetailData {
  scan: ScanMeta;
  events: EventItem[];
  discovered_urls: DiscoveredUrl[];
  discovered_technologies: DiscoveredTech[];
  candidate_findings: CandidateFinding[];
  confirmed_findings: ConfirmedFinding[];
}

export default function ScanConsolePage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params?.scanId as string;

  // State
  const [data, setData] = useState<ScanDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // User state for header
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Terminal & Log Controls
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});
  const [copiedLog, setCopiedLog] = useState(false);
  const [isLogsCleared, setIsLogsCleared] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Live Counter
  const [durationText, setDurationText] = useState('00:00');

  // Discovery Tabs State
  const [activeTab, setActiveTab] = useState<'urls' | 'techs' | 'findings'>('urls');
  const [urlSearch, setUrlSearch] = useState('');
  const [techSearch, setTechSearch] = useState('');
  const [findingsSeverityFilter, setFindingsSeverityFilter] = useState<string>('ALL');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  // 1. Fetch user on mount
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email || 'SecOps Operator');
    }
    loadUser();
  }, []);

  // 2. Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Fetch full scan telemetry
  const fetchScanData = async (isInitial = false) => {
    if (!scanId) return;
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Scan not found');
        throw new Error('Failed to load scan telemetry');
      }
      const json = await res.json();
      setData(json);
      if (isInitial && json.scan?.target_type === 'git') {
        setActiveTab('findings');
      }
      setError(null);
    } catch (err: any) {
      console.error('Error fetching scan details:', err);
      if (isInitial) {
        setError(err.message || 'Error fetching scan details');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // 4. Initial load & Supabase Realtime Subscription + 2-second fallback polling
  useEffect(() => {
    if (!scanId) return;

    fetchScanData(true);

    // Fallback polling every 2 seconds
    const interval = setInterval(() => {
      fetchScanData(false);
    }, 2000);

    // Supabase Realtime Channel
    const supabase = createClient();
    const channel = supabase
      .channel(`scan_console_${scanId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `scan_id=eq.${scanId}`,
        },
        () => {
          fetchScanData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scans',
          filter: `id=eq.${scanId}`,
        },
        () => {
          fetchScanData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discovered_urls',
          filter: `scan_id=eq.${scanId}`,
        },
        () => {
          fetchScanData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discovered_technologies',
          filter: `scan_id=eq.${scanId}`,
        },
        () => {
          fetchScanData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_findings',
          filter: `scan_id=eq.${scanId}`,
        },
        () => {
          fetchScanData(false);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [scanId]);

  // 5. Live Duration Timer
  useEffect(() => {
    if (!data?.scan) return;

    const calculateDuration = () => {
      const startTime = data.scan.started_at
        ? new Date(data.scan.started_at).getTime()
        : null;

      if (!startTime) {
        setDurationText('00:00');
        return;
      }

      const isFinished = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(
        (data.scan.status || '').toUpperCase()
      );

      const endTime = isFinished && data.scan.completed_at
        ? new Date(data.scan.completed_at).getTime()
        : Date.now();

      const diffSecs = Math.max(0, Math.floor((endTime - startTime) / 1000));
      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;

      if (hours > 0) {
        setDurationText(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      } else {
        setDurationText(
          `${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`
        );
      }
    };

    calculateDuration();
    const timer = setInterval(calculateDuration, 1000);

    return () => clearInterval(timer);
  }, [data?.scan?.started_at, data?.scan?.completed_at, data?.scan?.status]);

  // 6. Auto-scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.events, autoScroll, isLogsCleared]);

  // 7. Cancel Scan Handler
  const handleCancelScan = async () => {
    if (!scanId || cancelling) return;
    try {
      setCancelling(true);
      setCancelError(null);
      const res = await fetch(`/api/scans/${scanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (res.ok) {
        await fetchScanData(false);
        setCancelModalOpen(false);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setCancelError(errJson.error || 'Failed to cancel scan');
      }
    } catch (err: any) {
      setCancelError(err.message || 'Error cancelling scan');
    } finally {
      setCancelling(false);
    }
  };

  // 8. Logout
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Helper: Copy all terminal logs
  const handleCopyLogs = () => {
    if (!data?.events) return;
    const logText = data.events
      .map(
        (e) =>
          `[${new Date(e.created_at).toISOString()}] [${e.event_type}] ${
            e.payload ? JSON.stringify(e.payload) : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(logText);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  // Helper: Download log file
  const handleDownloadLogs = () => {
    if (!data?.events) return;
    const logText = data.events
      .map(
        (e) =>
          `[${new Date(e.created_at).toISOString()}] [${e.event_type}] ${
            e.payload ? JSON.stringify(e.payload, null, 2) : ''
          }`
      )
      .join('\n\n');
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinel-scan-${data.scan.target}-${scanId.slice(0, 8)}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Toggle Payload Expand
  const togglePayloadExpand = (eventId: string) => {
    setExpandedPayloads((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  // Toggle Finding Expand
  const toggleFindingExpand = (findingId: string) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [findingId]: !prev[findingId],
    }));
  };

  // Pipeline Stages Calculation
  const pipelineSteps = useMemo(() => {
    const targetType = data?.scan?.target_type || 'web';
    const status = (data?.scan?.status || 'QUEUED').toUpperCase();

    if (targetType === 'git') {
      const steps = [
        {
          key: 'SECRETS',
          label: 'Secret Scanning',
          shortLabel: 'SECRETS',
          description: 'TruffleHog credential and token discovery',
          icon: Lock,
        },
        {
          key: 'VALIDATE',
          label: 'AI Validation',
          shortLabel: 'VALIDATE',
          description: 'LLM triage & false positive elimination',
          icon: Cpu,
        },
        {
          key: 'REPORT',
          label: 'Executive Synthesis',
          shortLabel: 'REPORT',
          description: 'Remediation blueprint & reporting',
          icon: FileText,
        },
      ];

      const stageOrder = ['QUEUED', 'SECRETS', 'VALIDATION', 'REPORTING', 'COMPLETED'];
      const currentIndex = stageOrder.indexOf(status);

      return steps.map((s, idx) => {
        const stepStatusIdx = idx + 1; // 1: SECRETS, 2: VALIDATION, 3: REPORTING
        let state: 'completed' | 'active' | 'pending' | 'failed' = 'pending';

        if (status === 'FAILED' || status === 'CANCELLED') {
          if (currentIndex === stepStatusIdx) state = 'failed';
          else if (currentIndex > stepStatusIdx) state = 'completed';
          else state = 'pending';
        } else if (status === 'COMPLETED') {
          state = 'completed';
        } else if (currentIndex === stepStatusIdx) {
          state = 'active';
        } else if (currentIndex > stepStatusIdx) {
          state = 'completed';
        } else {
          state = 'pending';
        }

        return { ...s, state };
      });
    } else {
      const steps = [
        {
          key: 'RECON',
          label: 'Reconnaissance',
          shortLabel: 'RECON',
          description: 'Katana crawler & Httpx fingerprinting',
          icon: Globe,
        },
        {
          key: 'ATTACK',
          label: 'Attack Engine',
          shortLabel: 'ATTACK',
          description: 'Nuclei templates & vulnerability probes',
          icon: Zap,
        },
        {
          key: 'VALIDATE',
          label: 'AI Validation',
          shortLabel: 'VALIDATE',
          description: 'LLM triage & false positive elimination',
          icon: Cpu,
        },
        {
          key: 'REPORT',
          label: 'Executive Synthesis',
          shortLabel: 'REPORT',
          description: 'Remediation blueprint & reporting',
          icon: FileText,
        },
      ];

      const stageOrder = ['QUEUED', 'RECON', 'ATTACK', 'VALIDATION', 'REPORTING', 'COMPLETED'];
      const currentIndex = stageOrder.indexOf(status);

      return steps.map((s, idx) => {
        const stepStatusIdx = idx + 1;
        let state: 'completed' | 'active' | 'pending' | 'failed' = 'pending';

        if (status === 'FAILED' || status === 'CANCELLED') {
          if (currentIndex === stepStatusIdx) state = 'failed';
          else if (currentIndex > stepStatusIdx) state = 'completed';
          else state = 'pending';
        } else if (status === 'COMPLETED') {
          state = 'completed';
        } else if (currentIndex === stepStatusIdx) {
          state = 'active';
        } else if (currentIndex > stepStatusIdx) {
          state = 'completed';
        } else {
          state = 'pending';
        }

        return { ...s, state };
      });
    }
  }, [data?.scan?.target_type, data?.scan?.status]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (!data?.events || isLogsCleared) return [];
    return data.events.filter((evt) => {
      // 1. Tag filter
      if (logFilter !== 'ALL') {
        const type = evt.event_type.toUpperCase();
        if (logFilter === 'RECON' && !type.includes('RECON') && !type.includes('KATANA') && !type.includes('HTTPX')) return false;
        if (logFilter === 'SECRETS' && !type.includes('SECRET') && !type.includes('TRUFFLEHOG')) return false;
        if (logFilter === 'ATTACK' && !type.includes('ATTACK') && !type.includes('NUCLEI')) return false;
        if (logFilter === 'VALIDATE' && !type.includes('VALIDATION') && !type.includes('LLM_TRIAGE')) return false;
        if (logFilter === 'REPORT' && !type.includes('REPORT')) return false;
        if (logFilter === 'ERRORS' && !type.includes('FAILED') && !type.includes('ERROR') && !type.includes('CANCEL')) return false;
      }

      // 2. Search query
      if (logSearchQuery) {
        const q = logSearchQuery.toLowerCase();
        const matchesType = evt.event_type.toLowerCase().includes(q);
        const matchesPayload = JSON.stringify(evt.payload || {}).toLowerCase().includes(q);
        return matchesType || matchesPayload;
      }

      return true;
    });
  }, [data?.events, logFilter, logSearchQuery, isLogsCleared]);

  // Filtered URLs
  const filteredUrls = useMemo(() => {
    if (!data?.discovered_urls) return [];
    if (!urlSearch) return data.discovered_urls;
    return data.discovered_urls.filter((u) =>
      u.url.toLowerCase().includes(urlSearch.toLowerCase())
    );
  }, [data?.discovered_urls, urlSearch]);

  // Filtered Technologies
  const filteredTechs = useMemo(() => {
    if (!data?.discovered_technologies) return [];
    if (!techSearch) return data.discovered_technologies;
    return data.discovered_technologies.filter((t) =>
      t.technology.toLowerCase().includes(techSearch.toLowerCase())
    );
  }, [data?.discovered_technologies, techSearch]);

  // Candidate Findings with confirmed status mapping
  const candidateFindingsWithStatus = useMemo(() => {
    if (!data?.candidate_findings) return [];
    const confirmedMap = new Map<string, ConfirmedFinding>();
    data.confirmed_findings?.forEach((cf) => {
      if (cf.candidate_finding_id) {
        confirmedMap.set(cf.candidate_finding_id, cf);
      }
    });

    return data.candidate_findings
      .map((cand) => {
        const confirmedRecord = confirmedMap.get(cand.id);
        return {
          ...cand,
          isConfirmed: confirmedRecord ? confirmedRecord.confirmed : null,
          confirmedSeverity: confirmedRecord?.severity || cand.severity,
          confirmedRecord,
        };
      })
      .filter((item) => {
        if (findingsSeverityFilter === 'ALL') return true;
        return item.severity?.toUpperCase() === findingsSeverityFilter.toUpperCase();
      });
  }, [data?.candidate_findings, data?.confirmed_findings, findingsSeverityFilter]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 p-8 rounded-[6px] bg-card border border-border shadow-none">
          <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-[15px] font-semibold text-foreground">Connecting to Sentinel Console</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Initializing event stream & pipeline telemetry...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found Screen
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="p-8 bg-card border border-destructive/20 rounded-[6px] text-center shadow-none">
            <div className="h-12 w-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-[20px] font-semibold text-foreground">Scan Not Found</h2>
            <p className="text-[14px] text-muted-foreground mt-2 max-w-md mx-auto">
              {error || 'Unable to locate the active scan session. It may have expired or been removed.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => fetchScanData(true)}
                className="px-4 py-2 bg-card hover:bg-secondary text-foreground text-[13px] font-medium rounded-full border border-border transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" /> Retry Connection
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-[13px] font-medium rounded-full transition-colors inline-flex items-center gap-2"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { scan, events, discovered_urls, discovered_technologies, candidate_findings } = data;
  const isCompleted = scan.status?.toUpperCase() === 'COMPLETED';
  const isFailed = scan.status?.toUpperCase() === 'FAILED';
  const isCancelled = scan.status?.toUpperCase() === 'CANCELLED';
  const isRunning = !isCompleted && !isFailed && !isCancelled;

  // Status Badge Rendering Helper
  const renderStatusBadge = (statusStr: string) => {
    const s = (statusStr || 'QUEUED').toUpperCase();
    switch (s) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-destructive/10 text-destructive border border-destructive/20">
            <XCircle className="h-3 w-3" />
            FAILED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-secondary text-muted-foreground border border-border">
            <StopCircle className="h-3 w-3" />
            CANCELLED
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-secondary text-muted-foreground border border-border">
            <Clock className="h-3 w-3" />
            QUEUED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            {s}
          </span>
        );
    }
  };

  // Event Type Color Coding Helper
  const getEventBadgeClass = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('FAILED') || t.includes('ERROR') || t.includes('CANCELLED')) {
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
    if (t.includes('COMPLETED') || t.includes('FINISHED')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (t.includes('RECON') || t.includes('KATANA') || t.includes('HTTPX')) {
      return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    }
    if (t.includes('SECRET') || t.includes('TRUFFLEHOG')) {
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
    if (t.includes('ATTACK') || t.includes('NUCLEI')) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (t.includes('VALIDATION') || t.includes('LLM_TRIAGE')) {
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-28 transition-colors duration-150">
      {/* 1. TOP NAVIGATION */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2.5">
                <div className="h-6 w-6 rounded-[6px] bg-primary flex items-center justify-center text-primary-foreground">
                  <Shield className="h-3.5 w-3.5" fill="currentColor" />
                </div>
                <span className="font-sans font-semibold tracking-tight text-foreground text-[16px] font-medium">Sentinel</span>
                <span className="text-[10px] font-mono uppercase bg-secondary text-foreground px-1.5 py-0.5 rounded-full border border-border">
                  Console
                </span>
              </Link>

              <div className="hidden md:flex space-x-6 text-[14px] font-medium">
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors py-[15px]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/github-scanner"
                  className="text-muted-foreground hover:text-foreground transition-colors py-[15px]"
                >
                  GitHub Scanner
                </Link>
                <Link
                  href="/reports"
                  className="text-muted-foreground hover:text-foreground transition-colors py-[15px]"
                >
                  Reports
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ThemeToggle />

              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
                <Radio className={`h-3 w-3 ${isRunning ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-muted-foreground'}`} />
                <span>{isRunning ? 'STREAM ACTIVE' : 'STREAM CLOSED'}</span>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-secondary border border-transparent hover:border-border transition-colors focus:outline-none cursor-pointer"
                >
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center border border-border">
                    <User className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-[6px] shadow-none py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Signed in as</p>
                      <p className="text-[13px] text-foreground font-medium truncate mt-0.5">{userEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/"
                        className="w-full text-left px-4 py-2 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-2"
                      >
                        <Shield className="h-3.5 w-3.5 text-foreground" />
                        Dashboard
                      </Link>
                      <Link
                        href="/reports"
                        className="w-full text-left px-4 py-2 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-2"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        All Reports
                      </Link>
                    </div>
                    <div className="border-t border-border py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. HEADER & BREADCRUMB */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[12px] font-mono text-muted-foreground mb-3">
            <Link href="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Link href="/#scans" className="hover:text-foreground transition-colors">
              Scans
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground font-mono font-medium">{scan.id.slice(0, 12)}...</span>
          </div>

          {/* Main Console Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-[12px] bg-secondary border border-border flex items-center justify-center shrink-0 shadow-none">
                {scan.target_type === 'git' ? (
                  <GitBranch className="h-6 w-6 text-foreground" />
                ) : (
                  <Globe className="h-6 w-6 text-foreground" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-[22px] sm:text-[26px] font-serif font-medium text-foreground tracking-tight">
                    {scan.target}
                  </h1>
                  <a
                    href={scan.base_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Open target in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {/* Target Type Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-secondary text-muted-foreground border-border">
                    {scan.target_type === 'git' ? (
                      <>
                        <GitBranch className="h-3 w-3" /> Git Repository
                      </>
                    ) : (
                      <>
                        <Globe className="h-3 w-3" /> Web Application
                      </>
                    )}
                  </span>

                  {/* Live Status Badge */}
                  {renderStatusBadge(scan.status)}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground mt-1.5 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-foreground" />
                    <span>Duration:</span>
                    <span className="text-foreground font-medium">{durationText}</span>
                  </div>
                  <span>•</span>
                  <div>
                    <span>Started:</span>{' '}
                    <span className="text-foreground">
                      {scan.started_at
                        ? new Date(scan.started_at).toLocaleTimeString()
                        : 'Pending start'}
                    </span>
                  </div>
                  {scan.completed_at && (
                    <>
                      <span>•</span>
                      <div>
                        <span>Completed:</span>{' '}
                        <span className="text-foreground">
                          {new Date(scan.completed_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => fetchScanData(false)}
                className="px-3.5 py-1.5 bg-card hover:bg-secondary text-foreground text-[12px] font-medium rounded-full border border-border transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-none"
                title="Refresh scan state"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {isRunning && (
                <button
                  onClick={() => {
                    setCancelError(null);
                    setCancelModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-[12px] font-medium rounded-[6px] border border-destructive/20 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <StopCircle className="h-3.5 w-3.5" />
                  <span>Cancel Scan</span>
                </button>
              )}

              {isCompleted && (
                <Link
                  href={`/reports/${scanId}`}
                  className="px-4 py-1.5 bg-primary hover:opacity-90 text-primary-foreground text-[13px] font-medium rounded-full transition-all shadow-none inline-flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>View Final Report</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 3. VISUAL PIPELINE STEPPER */}
        <div className="p-5 rounded-[12px] bg-card border border-border shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-[13px] font-sans font-medium text-foreground uppercase tracking-wider">
                Autonomous Execution Pipeline
              </h2>
            </div>
            <span className="text-[12px] font-mono text-muted-foreground">
              Architecture: {scan.target_type === 'git' ? 'Static Secret Analyzer' : 'Full-Spectrum Web Suite'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pipelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isStepCompleted = step.state === 'completed';
              const isStepActive = step.state === 'active';
              const isStepFailed = step.state === 'failed';

              let borderClass = 'border-border bg-secondary/50';
              let badgeColor = 'bg-card text-muted-foreground border border-border';

              if (isStepCompleted) {
                borderClass = 'border-emerald-500/30 bg-emerald-500/10';
                badgeColor = 'bg-card text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
              } else if (isStepActive) {
                borderClass = 'border-primary bg-primary text-primary-foreground';
                badgeColor = 'bg-card text-primary';
              } else if (isStepFailed) {
                borderClass = 'border-destructive/30 bg-destructive/10';
                badgeColor = 'bg-card text-destructive border border-destructive/20';
              }

              return (
                <div
                  key={step.key}
                  className={`p-4 rounded-[10px] border transition-all duration-200 relative overflow-hidden ${borderClass}`}
                >
                  {/* Top Step Number & Status Indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono font-medium tracking-widest ${isStepActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      PHASE 0{idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full uppercase ${badgeColor}`}
                    >
                      {isStepCompleted ? 'DONE' : isStepActive ? 'RUNNING' : isStepFailed ? 'FAILED' : 'QUEUED'}
                    </span>
                  </div>

                  {/* Stage Title & Icon */}
                  <div className="flex items-center gap-2.5 mt-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isStepCompleted
                          ? 'bg-card text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isStepActive
                          ? 'bg-primary-foreground text-primary'
                          : isStepFailed
                          ? 'bg-card text-destructive border border-destructive/20'
                          : 'bg-card text-muted-foreground border border-border'
                      }`}
                    >
                      {isStepCompleted ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : isStepFailed ? (
                        <XCircle className="h-4 w-4" />
                      ) : isStepActive ? (
                        <StepIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h3 className={`text-[13px] font-medium leading-tight ${isStepActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {step.label}
                      </h3>
                      <p className={`text-[11px] leading-tight mt-0.5 ${isStepActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {step.shortLabel}
                      </p>
                    </div>
                  </div>

                  <p className={`text-[11px] mt-2.5 line-clamp-2 ${isStepActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. MAIN CONTENT SPLIT: TERMINAL LOG STREAM + DISCOVERY TABS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: LIVE TERMINAL LOG STREAM (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col h-[640px] rounded-[12px] bg-[#121212] border border-[#333333] shadow-none overflow-hidden text-[#f2f2f2]">
            {/* Terminal Header */}
            <div className="p-3.5 bg-[#181818] border-b border-[#333333] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Traffic dots */}
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d97706]/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#788c5d]/80"></div>
                </div>

                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#f2f2f2]" />
                  <span className="text-[12px] font-mono font-medium text-[#f2f2f2] tracking-wider">
                    CONSOLE LOG STREAM
                  </span>
                  <span className="text-[10px] font-mono bg-[#222222] text-[#9e9e9e] px-2 py-0.5 rounded-full border border-[#333333]">
                    {filteredEvents.length} events
                  </span>
                </div>
              </div>

              {/* Terminal Quick Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-full border transition-colors cursor-pointer ${
                    autoScroll
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-[#222222] text-[#9e9e9e] border-[#333333]'
                  }`}
                  title="Toggle automatic scroll down"
                >
                  Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={handleCopyLogs}
                  className="p-1.5 rounded-full hover:bg-[#222222] text-[#9e9e9e] hover:text-[#f2f2f2] transition-colors border border-transparent hover:border-[#333333] cursor-pointer"
                  title="Copy logs to clipboard"
                >
                  {copiedLog ? (
                    <Check className="h-3.5 w-3.5 text-[#788c5d]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  onClick={handleDownloadLogs}
                  className="p-1.5 rounded-full hover:bg-[#222222] text-[#9e9e9e] hover:text-[#f2f2f2] transition-colors border border-transparent hover:border-[#333333] cursor-pointer"
                  title="Download log file"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setIsLogsCleared(!isLogsCleared)}
                  className="p-1.5 rounded-full hover:bg-[#222222] text-[#9e9e9e] hover:text-[#ef4444] transition-colors border border-transparent hover:border-[#333333] cursor-pointer"
                  title={isLogsCleared ? 'Restore log view' : 'Clear display view'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="px-3 py-2 bg-[#121212] border-b border-[#333333] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {['ALL', 'RECON', 'SECRETS', 'ATTACK', 'VALIDATE', 'REPORT', 'ERRORS'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                      logFilter === f
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-[#9e9e9e] hover:text-[#f2f2f2] hover:bg-[#222222]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="relative w-44">
                <Search className="h-3 w-3 absolute left-2.5 top-2 text-[#707070]" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full bg-[#181818] border border-[#333333] rounded-full pl-7 pr-3 py-1 text-[11px] text-[#f2f2f2] placeholder-[#8f8e87] focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* Terminal Body */}
            <div
              ref={terminalContainerRef}
              className="flex-1 p-4 overflow-y-auto font-mono text-[12px] space-y-2 bg-[#121212]"
            >
              {filteredEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#666] py-12">
                  <Terminal className="h-8 w-8 text-[#333] mb-2" />
                  <p className="text-[13px] text-[#888]">
                    {isLogsCleared ? 'Display cleared by operator' : 'Awaiting incoming agent telemetry...'}
                  </p>
                  <p className="text-[11px] text-[#555] mt-1">
                    {isLogsCleared
                      ? 'Click the trash icon to restore view.'
                      : 'Events from Katana, TruffleHog, Nuclei, and LLM Validator stream here.'}
                  </p>
                </div>
              ) : (
                filteredEvents.map((evt) => {
                  const isExpanded = expandedPayloads[evt.id];
                  const hasPayload = evt.payload && (typeof evt.payload === 'object' ? Object.keys(evt.payload).length > 0 : true);
                  const timeFormatted = evt.created_at
                    ? new Date(evt.created_at).toLocaleTimeString()
                    : '00:00:00';

                  return (
                    <div
                      key={evt.id}
                      className="p-2 rounded hover:bg-[#1a1a1a] transition-colors border border-transparent hover:border-[#262626]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-[#666] select-none text-[11px] shrink-0">
                            [{timeFormatted}]
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-mono border uppercase tracking-wider ${getEventBadgeClass(
                              evt.event_type
                            )}`}
                          >
                            {evt.event_type}
                          </span>
                          {hasPayload ? (
                            <button
                              onClick={() => togglePayloadExpand(evt.id)}
                              className="text-left text-[#b4b4b4] hover:text-white transition-colors truncate max-w-[280px] sm:max-w-[420px] flex items-center gap-1 cursor-pointer"
                              title="Click to view details"
                            >
                              <span className="truncate text-[11px]">
                                {typeof evt.payload === 'string'
                                  ? evt.payload
                                  : (evt.payload.target
                                      ? `Target: ${evt.payload.target}`
                                      : evt.payload.tool
                                      ? `Tool: ${evt.payload.tool}`
                                      : evt.payload.error
                                      ? `Error: ${evt.payload.error}`
                                      : evt.payload.findingsCount !== undefined
                                      ? `Findings: ${evt.payload.findingsCount}`
                                      : evt.payload.count !== undefined
                                      ? `Discovered: ${evt.payload.count}`
                                      : JSON.stringify(evt.payload))}
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3 shrink-0 text-[#898989]" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0 text-[#898989]" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[#888] italic text-[11px]">No payload</span>
                          )}
                        </div>
                      </div>

                      {/* Expandable JSON payload details */}
                      {isExpanded && hasPayload && (
                        <div className="mt-2 ml-20 p-2.5 rounded bg-[#181818] border border-[#2a2a2a] text-[11px] text-[#3ecf8e] overflow-x-auto">
                          <pre>{JSON.stringify(evt.payload, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Blinking Prompt Cursor */}
              {isRunning && (
                <div className="flex items-center gap-2 pt-2 text-white text-[12px]">
                  <span className="animate-pulse">❯</span>
                  <span className="text-[#888] text-[11px] italic">Agent execution thread active...</span>
                </div>
              )}

              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* RIGHT: DISCOVERY TABS / LIVE FEED (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col h-[640px] rounded-[12px] bg-card border border-border shadow-none overflow-hidden text-foreground">
            {/* Discovery Tabs Navigation */}
            <div className="p-2.5 bg-card border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTab('urls')}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'urls'
                      ? 'bg-card text-foreground border border-border shadow-none'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 text-foreground" />
                  <span>URLs</span>
                  <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.2 rounded-full text-muted-foreground border border-border">
                    {discovered_urls.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('techs')}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'techs'
                      ? 'bg-card text-foreground border border-border shadow-none'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 text-foreground" />
                  <span>Tech</span>
                  <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.2 rounded-full text-muted-foreground border border-border">
                    {discovered_technologies.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('findings')}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'findings'
                      ? 'bg-card text-foreground border border-border shadow-none'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-foreground" />
                  <span>Findings</span>
                  <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.2 rounded-full text-muted-foreground border border-border">
                    {candidate_findings.length}
                  </span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-muted-foreground pr-2">
                Live Feed
              </div>
            </div>

            {/* TAB 1: DISCOVERED URLS */}
            {activeTab === 'urls' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-border bg-card">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search mapped endpoints..."
                      value={urlSearch}
                      onChange={(e) => setUrlSearch(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-full pl-8 pr-3 py-1 text-[12px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredUrls.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                      <Globe className="h-8 w-8 text-muted-foreground opacity-40 mb-2" />
                      <p className="text-[13px] text-muted-foreground">No mapped endpoints yet</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Katana crawler results will appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    filteredUrls.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-[8px] bg-secondary/40 border border-border hover:border-primary/40 transition-colors flex items-center justify-between gap-3 text-[12px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-medium px-2 py-0.2 rounded-full bg-secondary text-foreground border border-border">
                              {item.method || 'GET'}
                            </span>
                            {item.status_code && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
                                  item.status_code >= 200 && item.status_code < 300
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : item.status_code >= 300 && item.status_code < 400
                                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                                    : 'bg-secondary text-muted-foreground border border-border'
                                }`}
                              >
                                {item.status_code}
                              </span>
                            )}
                          </div>
                          <p className="text-foreground font-mono text-[11px] truncate mt-1" title={item.url}>
                            {item.url}
                          </p>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: DISCOVERED TECHNOLOGIES */}
            {activeTab === 'techs' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-border bg-card">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search technologies..."
                      value={techSearch}
                      onChange={(e) => setTechSearch(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-full pl-8 pr-3 py-1 text-[12px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredTechs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                      <Layers className="h-8 w-8 text-muted-foreground opacity-40 mb-2" />
                      <p className="text-[13px] text-muted-foreground">No technologies identified yet</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Httpx fingerprinting runs during reconnaissance.
                      </p>
                    </div>
                  ) : (
                    filteredTechs.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-[8px] bg-secondary/40 border border-border hover:border-primary/40 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground">
                            <Code2 className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-[13px] font-medium text-foreground">
                              {t.technology}
                            </h4>
                            {t.version ? (
                              <p className="text-[11px] font-mono text-muted-foreground">
                                Version: {t.version}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">Version undetected</p>
                            )}
                          </div>
                        </div>

                        {t.confidence !== null && t.confidence !== undefined && (
                          <div className="text-right">
                            <span className="text-[11px] font-mono text-foreground font-medium">
                              {Math.round(t.confidence * 100)}%
                            </span>
                            <p className="text-[9px] text-muted-foreground uppercase">Confidence</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CANDIDATE & CONFIRMED FINDINGS */}
            {activeTab === 'findings' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Severity Filter Header */}
                <div className="p-2.5 border-b border-border bg-card flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-mono">Filter Severity:</span>
                  <div className="flex items-center gap-1 font-mono">
                    {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setFindingsSeverityFilter(sev)}
                        className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                          findingsSeverityFilter === sev
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {candidateFindingsWithStatus.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                      <AlertCircle className="h-8 w-8 text-muted-foreground opacity-40 mb-2" />
                      <p className="text-[13px] text-muted-foreground">No findings registered yet</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Nuclei and TruffleHog findings will populate here for AI validation.
                      </p>
                    </div>
                  ) : (
                    candidateFindingsWithStatus.map((item) => {
                      const isExpanded = expandedFindings[item.id];
                      const sev = (item.severity || 'low').toLowerCase();

                      let sevBadge = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
                      if (sev === 'critical') sevBadge = 'bg-destructive/10 text-destructive border border-destructive/20';
                      if (sev === 'high') sevBadge = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
                      if (sev === 'medium') sevBadge = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-[6px] bg-secondary/40 border border-border hover:border-primary/40 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono font-medium px-2 py-0.2 rounded-full uppercase border ${sevBadge}`}
                              >
                                {item.severity}
                              </span>

                              {item.isConfirmed === true && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <Check className="h-3 w-3" /> VERIFIED
                                </span>
                              )}
                              {item.isConfirmed === false && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-secondary text-muted-foreground border border-border line-through">
                                  FALSE POSITIVE
                                </span>
                              )}
                              {item.isConfirmed === null && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  AI TRIAGE PENDING
                                </span>
                              )}
                            </div>

                            {item.confidence !== null && item.confidence !== undefined && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {Math.round(item.confidence * 100)}% conf
                              </span>
                            )}
                          </div>

                          <h4 className="text-[13px] font-medium text-foreground mt-2">
                            {item.title}
                          </h4>

                          {item.reasoning && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleFindingExpand(item.id)}
                                className="text-[11px] text-foreground hover:underline flex items-center gap-1 font-mono focus:outline-none cursor-pointer"
                              >
                                {isExpanded ? 'Hide AI Reasoning' : 'View AI Rationale'}
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-2.5 rounded-[8px] bg-secondary border border-border text-[11px] text-muted-foreground font-sans leading-relaxed">
                                  {item.reasoning}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. STICKY ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-md z-40 py-3.5 px-4 sm:px-8">
        <div className="mx-auto max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[12px] font-mono text-muted-foreground">
            <Link
              href="/"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Scans
            </Link>
            <span className="text-border">•</span>
            <div>
              Status: <span className="text-foreground font-medium">{scan.status}</span>
            </div>
            <span className="text-border">•</span>
            <div>
              Endpoints Mapped: <span className="text-foreground font-medium">{discovered_urls.length}</span>
            </div>
            <span className="text-border">•</span>
            <div>
              Findings: <span className="text-foreground font-medium">{candidate_findings.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {isRunning && (
              <button
                onClick={() => {
                  setCancelError(null);
                  setCancelModalOpen(true);
                }}
                disabled={cancelling}
                className="px-4 py-2 bg-card hover:bg-destructive/10 text-destructive text-[13px] font-medium rounded-[6px] border border-destructive/20 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <StopCircle className="h-4 w-4" />
                <span>Cancel Scan</span>
              </button>
            )}

            {isCompleted ? (
              <Link
                href={`/reports/${scanId}`}
                className="px-5 py-2 bg-primary hover:opacity-90 text-primary-foreground text-[13px] font-medium rounded-full transition-all shadow-none inline-flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>View Final Report</span>
              </Link>
            ) : (
              <button
                disabled
                className="px-5 py-2 bg-secondary text-muted-foreground border border-border text-[13px] font-medium rounded-[6px] inline-flex items-center gap-2 cursor-not-allowed"
                title="Final report available once scan pipeline finishes"
              >
                <Activity className="h-4 w-4 animate-spin text-muted-foreground" />
                <span>Report Generating ({scan.status})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. CANCEL CONFIRMATION MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-[6px] p-6 shadow-none">
            <div className="flex items-center gap-3 text-destructive mb-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-[17px] font-semibold text-foreground">Confirm Scan Cancellation</h3>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
              Are you sure you want to stop the autonomous agents for{' '}
              <span className="text-foreground font-mono font-medium">{scan.target}</span>? This
              will immediately halt crawler subtasks, tool executions, and LLM validation.
            </p>
            {cancelError && (
              <div className="mb-4 p-3 rounded-[8px] bg-destructive/10 border border-destructive/20 text-destructive text-[13px] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelError(null);
                }}
                disabled={cancelling}
                className="px-4 py-2 bg-card hover:bg-secondary text-foreground text-[13px] font-medium rounded-full border border-border transition-colors cursor-pointer"
              >
                Continue Scan
              </button>
              <button
                onClick={handleCancelScan}
                disabled={cancelling}
                className="px-4 py-2 bg-destructive hover:opacity-90 text-white text-[13px] font-medium rounded-full transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                {cancelling ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" /> Stopping Agents...
                  </>
                ) : (
                  <>
                    <StopCircle className="h-4 w-4" /> Halt Scan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
