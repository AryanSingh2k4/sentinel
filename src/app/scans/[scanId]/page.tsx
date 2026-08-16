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

  // Discovery Tabs
  const [activeTab, setActiveTab] = useState<'urls' | 'techs' | 'findings'>('urls');
  const [urlSearch, setUrlSearch] = useState('');
  const [techSearch, setTechSearch] = useState('');
  const [findingsSeverityFilter, setFindingsSeverityFilter] = useState<string>('ALL');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  // Duration State
  const [durationText, setDurationText] = useState<string>('00:00');

  // 1. Fetch user email
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        setUserEmail(authData.user?.email || 'Operator');
      } catch {
        setUserEmail('Operator');
      }
    };
    fetchUser();
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

  // 3. Fetch scan data function
  const fetchScanData = async (isInitial = false) => {
    if (!scanId) return;
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`/api/scans/${scanId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Scan not found');
        throw new Error(`Failed to load scan details (${res.status})`);
      }
      const json: ScanDetailData = await res.json();
      setData(json);
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

  // Filtered Events for Log Stream
  const filteredEvents = useMemo(() => {
    if (!data?.events || isLogsCleared) return [];
    return data.events.filter((e) => {
      // Filter by agent group
      if (logFilter !== 'ALL') {
        const t = e.event_type?.toUpperCase() || '';
        if (logFilter === 'RECON' && !t.includes('RECON') && !t.includes('KATANA') && !t.includes('HTTPX')) return false;
        if (logFilter === 'SECRETS' && !t.includes('SECRET') && !t.includes('TRUFFLEHOG')) return false;
        if (logFilter === 'ATTACK' && !t.includes('ATTACK') && !t.includes('NUCLEI')) return false;
        if (logFilter === 'VALIDATE' && !t.includes('VALIDATION') && !t.includes('LLM_TRIAGE')) return false;
        if (logFilter === 'REPORT' && !t.includes('REPORT') && !t.includes('SCAN_COMPLETED')) return false;
        if (logFilter === 'ERRORS' && !t.includes('FAILED') && !t.includes('ERROR') && !t.includes('CANCELLED')) return false;
      }
      // Search text query
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const typeMatch = e.event_type?.toLowerCase().includes(q);
        const payloadMatch = e.payload ? JSON.stringify(e.payload).toLowerCase().includes(q) : false;
        return typeMatch || payloadMatch;
      }
      return true;
    });
  }, [data?.events, logFilter, logSearchQuery, isLogsCleared]);

  // Filtered URLs
  const filteredUrls = useMemo(() => {
    if (!data?.discovered_urls) return [];
    return data.discovered_urls.filter((u) => {
      if (!urlSearch.trim()) return true;
      const q = urlSearch.toLowerCase();
      return (
        u.url.toLowerCase().includes(q) ||
        (u.method && u.method.toLowerCase().includes(q)) ||
        (u.discovered_by && u.discovered_by.toLowerCase().includes(q)) ||
        (u.status_code && u.status_code.toString().includes(q))
      );
    });
  }, [data?.discovered_urls, urlSearch]);

  // Filtered Technologies
  const filteredTechs = useMemo(() => {
    if (!data?.discovered_technologies) return [];
    return data.discovered_technologies.filter((t) => {
      if (!techSearch.trim()) return true;
      const q = techSearch.toLowerCase();
      return (
        t.technology.toLowerCase().includes(q) ||
        (t.version && t.version.toLowerCase().includes(q))
      );
    });
  }, [data?.discovered_technologies, techSearch]);

  // Combined Candidate Findings & Confirmed Findings Map
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
      <div className="min-h-screen bg-[#0f0f0f] text-[#fafafa] flex flex-col items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-[#171717] border border-[#2e2e2e] shadow-2xl">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 flex items-center justify-center animate-pulse">
              <Shield className="h-6 w-6 text-[#3ecf8e]" />
            </div>
            <Activity className="h-4 w-4 text-[#3ecf8e] absolute -bottom-1 -right-1 animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-[16px] font-semibold text-[#fafafa]">Connecting to Sentinel Console</h2>
            <p className="text-[12px] text-[#898989] mt-1">Initializing event stream & pipeline telemetry...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found Screen
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-[#fafafa] p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] text-[#898989] hover:text-[#fafafa] mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="p-8 bg-[#171717] border border-[#ef4444]/30 rounded-2xl text-center shadow-xl">
            <div className="h-12 w-12 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-[#ef4444]" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#fafafa]">Scan Not Found</h2>
            <p className="text-[14px] text-[#898989] mt-2 max-w-md mx-auto">
              {error || 'Unable to locate the active scan session. It may have expired or been removed.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => fetchScanData(true)}
                className="px-4 py-2 bg-[#242424] hover:bg-[#2e2e2e] text-[#fafafa] text-[13px] font-medium rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Retry Connection
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#0f0f0f] text-[13px] font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30">
            <CheckCircle2 className="h-3.5 w-3.5" />
            COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30">
            <XCircle className="h-3.5 w-3.5" />
            FAILED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[#71717a]/20 text-[#a1a1aa] border border-[#71717a]/30">
            <StopCircle className="h-3.5 w-3.5" />
            CANCELLED
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            QUEUED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/40 shadow-[0_0_12px_rgba(62,207,142,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ecf8e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3ecf8e]"></span>
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
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (t.includes('COMPLETED') || t.includes('FINISHED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (t.includes('RECON') || t.includes('KATANA') || t.includes('HTTPX')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
    if (t.includes('SECRET') || t.includes('TRUFFLEHOG')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (t.includes('ATTACK') || t.includes('NUCLEI')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
    if (t.includes('VALIDATION') || t.includes('LLM_TRIAGE')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] font-sans text-[#fafafa] selection:bg-[#3ecf8e]/20 pb-28">
      {/* 1. TOP NAVIGATION */}
      <nav className="border-b border-[#262626] bg-[#141414]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="h-7 w-7 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 flex items-center justify-center group-hover:bg-[#3ecf8e]/20 transition-colors">
                  <Shield className="h-4 w-4 text-[#3ecf8e]" />
                </div>
                <span className="font-semibold tracking-tight text-[#fafafa]">Sentinel</span>
                <span className="text-[10px] font-mono uppercase bg-[#262626] text-[#3ecf8e] px-1.5 py-0.5 rounded border border-[#333]">
                  Console
                </span>
              </Link>

              <div className="hidden md:flex space-x-6 text-[13px] font-medium">
                <Link
                  href="/"
                  className="text-[#898989] hover:text-[#fafafa] transition-colors py-4"
                >
                  Dashboard
                </Link>
                <Link
                  href="/"
                  className="text-[#898989] hover:text-[#fafafa] transition-colors py-4"
                >
                  Web Scanner
                </Link>
                <Link
                  href="/github-scanner"
                  className="text-[#898989] hover:text-[#fafafa] transition-colors py-4"
                >
                  GitHub Scanner
                </Link>
                <Link
                  href="/reports"
                  className="text-[#898989] hover:text-[#fafafa] transition-colors py-4"
                >
                  Reports
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 text-[12px] font-mono text-[#898989] bg-[#1c1c1c] px-2.5 py-1 rounded-md border border-[#2a2a2a]">
                <Radio className={`h-3 w-3 ${isRunning ? 'text-[#3ecf8e] animate-pulse' : 'text-zinc-500'}`} />
                <span>{isRunning ? 'STREAM ACTIVE' : 'STREAM CLOSED'}</span>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-1 rounded-lg hover:bg-[#242424] transition-colors focus:outline-none"
                >
                  <div className="h-7 w-7 rounded-md bg-[#242424] flex items-center justify-center border border-[#393939]">
                    <User className="h-3.5 w-3.5 text-[#b4b4b4]" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-[#898989]" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#171717] border border-[#2e2e2e] rounded-xl shadow-2xl py-1 z-50">
                    <div className="px-4 py-3 border-b border-[#2e2e2e]">
                      <p className="text-[11px] text-[#898989] font-medium">Signed in as</p>
                      <p className="text-[13px] text-[#fafafa] truncate mt-0.5 font-mono">{userEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/"
                        className="w-full text-left px-4 py-2 text-[13px] text-[#b4b4b4] hover:bg-[#242424] hover:text-[#fafafa] transition-colors flex items-center gap-2"
                      >
                        <Shield className="h-3.5 w-3.5 text-[#898989]" />
                        Dashboard
                      </Link>
                      <Link
                        href="/reports"
                        className="w-full text-left px-4 py-2 text-[13px] text-[#b4b4b4] hover:bg-[#242424] hover:text-[#fafafa] transition-colors flex items-center gap-2"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#898989]" />
                        All Reports
                      </Link>
                    </div>
                    <div className="border-t border-[#2e2e2e] py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-[13px] text-[#ef4444] hover:bg-[#242424] transition-colors flex items-center gap-2"
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
      <div className="border-b border-[#212121] bg-[#141414]/50">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[12px] font-mono text-[#898989] mb-3">
            <Link href="/" className="hover:text-[#fafafa] transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3 text-[#555]" />
            <Link href="/#scans" className="hover:text-[#fafafa] transition-colors">
              Scans
            </Link>
            <ChevronRight className="h-3 w-3 text-[#555]" />
            <span className="text-[#3ecf8e] font-mono">{scan.id.slice(0, 12)}...</span>
          </div>

          {/* Main Console Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#1c1c1c] border border-[#2e2e2e] flex items-center justify-center shrink-0 shadow-inner">
                {scan.target_type === 'git' ? (
                  <GitBranch className="h-6 w-6 text-[#f97316]" />
                ) : (
                  <Globe className="h-6 w-6 text-[#3ecf8e]" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-[20px] sm:text-[22px] font-bold text-[#fafafa] tracking-tight font-mono">
                    {scan.target}
                  </h1>
                  <a
                    href={scan.base_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#898989] hover:text-[#3ecf8e] transition-colors"
                    title="Open target in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {/* Target Type Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                      scan.target_type === 'git'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
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

                <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#898989] mt-1.5 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#3ecf8e]" />
                    <span>Duration:</span>
                    <span className="text-[#fafafa] font-semibold">{durationText}</span>
                  </div>
                  <span className="text-[#333]">•</span>
                  <div>
                    <span>Started:</span>{' '}
                    <span className="text-[#fafafa]">
                      {scan.started_at
                        ? new Date(scan.started_at).toLocaleTimeString()
                        : 'Pending start'}
                    </span>
                  </div>
                  {scan.completed_at && (
                    <>
                      <span className="text-[#333]">•</span>
                      <div>
                        <span>Completed:</span>{' '}
                        <span className="text-[#fafafa]">
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
                className="px-3 py-2 bg-[#1c1c1c] hover:bg-[#262626] text-[#b4b4b4] hover:text-[#fafafa] text-[12px] font-medium rounded-lg border border-[#2e2e2e] transition-colors inline-flex items-center gap-1.5"
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
                  className="px-3.5 py-2 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] text-[12px] font-medium rounded-lg border border-[#ef4444]/30 transition-colors inline-flex items-center gap-1.5"
                >
                  <StopCircle className="h-3.5 w-3.5" />
                  <span>Cancel Scan</span>
                </button>
              )}

              {isCompleted && (
                <Link
                  href={`/reports/${scanId}`}
                  className="px-4 py-2 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#0f0f0f] text-[13px] font-semibold rounded-lg transition-all shadow-[0_0_15px_rgba(62,207,142,0.3)] inline-flex items-center gap-2"
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
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#242424] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#3ecf8e]" />
              <h2 className="text-[14px] font-semibold text-[#fafafa] uppercase tracking-wider font-mono">
                Autonomous Execution Pipeline
              </h2>
            </div>
            <span className="text-[12px] font-mono text-[#898989]">
              Architecture: {scan.target_type === 'git' ? 'Static Secret Analyzer' : 'Full-Spectrum Web Suite'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pipelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isStepCompleted = step.state === 'completed';
              const isStepActive = step.state === 'active';
              const isStepFailed = step.state === 'failed';

              let borderClass = 'border-[#262626] bg-[#181818]';
              let badgeColor = 'bg-[#222] text-[#888]';

              if (isStepCompleted) {
                borderClass = 'border-[#3ecf8e]/40 bg-[#3ecf8e]/5';
                badgeColor = 'bg-[#3ecf8e]/20 text-[#3ecf8e]';
              } else if (isStepActive) {
                borderClass = 'border-[#3ecf8e] bg-[#1b2721] ring-1 ring-[#3ecf8e]/50 shadow-[0_0_15px_rgba(62,207,142,0.15)]';
                badgeColor = 'bg-[#3ecf8e] text-[#0f0f0f] animate-pulse';
              } else if (isStepFailed) {
                borderClass = 'border-[#ef4444]/40 bg-[#ef4444]/5';
                badgeColor = 'bg-[#ef4444]/20 text-[#ef4444]';
              }

              return (
                <div
                  key={step.key}
                  className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${borderClass}`}
                >
                  {/* Top Step Number & Status Indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#898989]">
                      PHASE 0{idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase ${badgeColor}`}
                    >
                      {isStepCompleted ? 'DONE' : isStepActive ? 'RUNNING' : isStepFailed ? 'FAILED' : 'QUEUED'}
                    </span>
                  </div>

                  {/* Stage Title & Icon */}
                  <div className="flex items-center gap-2.5 mt-1">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isStepCompleted
                          ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]'
                          : isStepActive
                          ? 'bg-[#3ecf8e] text-[#0f0f0f]'
                          : isStepFailed
                          ? 'bg-[#ef4444]/10 text-[#ef4444]'
                          : 'bg-[#222] text-[#666]'
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
                      <h3 className="text-[13px] font-semibold text-[#fafafa] leading-tight">
                        {step.label}
                      </h3>
                      <p className="text-[11px] text-[#898989] leading-tight mt-0.5">
                        {step.shortLabel}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#737373] mt-2.5 line-clamp-2">
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
          <div className="lg:col-span-7 flex flex-col h-[640px] rounded-2xl bg-[#111111] border border-[#262626] shadow-xl overflow-hidden">
            {/* Terminal Header */}
            <div className="p-3.5 bg-[#171717] border-b border-[#262626] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Traffic dots */}
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3ecf8e]/80"></div>
                </div>

                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#3ecf8e]" />
                  <span className="text-[12px] font-bold font-mono text-[#fafafa] tracking-wider">
                    CONSOLE LOG STREAM
                  </span>
                  <span className="text-[10px] font-mono bg-[#242424] text-[#898989] px-2 py-0.5 rounded-full border border-[#333]">
                    {filteredEvents.length} events
                  </span>
                </div>
              </div>

              {/* Terminal Quick Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
                    autoScroll
                      ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30'
                      : 'bg-[#222] text-[#888] border-[#333]'
                  }`}
                  title="Toggle automatic scroll down"
                >
                  Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={handleCopyLogs}
                  className="p-1.5 rounded hover:bg-[#242424] text-[#898989] hover:text-[#fafafa] transition-colors border border-transparent hover:border-[#333]"
                  title="Copy logs to clipboard"
                >
                  {copiedLog ? (
                    <Check className="h-3.5 w-3.5 text-[#3ecf8e]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  onClick={handleDownloadLogs}
                  className="p-1.5 rounded hover:bg-[#242424] text-[#898989] hover:text-[#fafafa] transition-colors border border-transparent hover:border-[#333]"
                  title="Download log file"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setIsLogsCleared(!isLogsCleared)}
                  className="p-1.5 rounded hover:bg-[#242424] text-[#898989] hover:text-[#ef4444] transition-colors border border-transparent hover:border-[#333]"
                  title={isLogsCleared ? 'Restore log view' : 'Clear display view'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="px-3 py-2 bg-[#141414] border-b border-[#212121] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {['ALL', 'RECON', 'SECRETS', 'ATTACK', 'VALIDATE', 'REPORT', 'ERRORS'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      logFilter === f
                        ? 'bg-[#3ecf8e] text-[#0f0f0f] font-semibold'
                        : 'text-[#898989] hover:text-[#fafafa] hover:bg-[#222]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="relative w-44">
                <Search className="h-3 w-3 absolute left-2 top-2 text-[#666]" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full bg-[#1b1b1b] border border-[#2a2a2a] rounded pl-6 pr-2 py-1 text-[11px] text-[#fafafa] placeholder-[#666] focus:outline-none focus:border-[#3ecf8e]/50"
                />
              </div>
            </div>

            {/* Terminal Body */}
            <div
              ref={terminalContainerRef}
              className="flex-1 p-4 overflow-y-auto font-mono text-[12px] space-y-2 bg-[#0c0c0c]"
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
                  const hasPayload = evt.payload && Object.keys(evt.payload).length > 0;
                  const timeFormatted = evt.created_at
                    ? new Date(evt.created_at).toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        fractionalSecondDigits: 3,
                      })
                    : '--:--:--.---';

                  return (
                    <div
                      key={evt.id}
                      className="group rounded-md p-1.5 hover:bg-[#151515] transition-colors border border-transparent hover:border-[#222]"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-[#666] select-none text-[11px] shrink-0 pt-0.5">
                          {timeFormatted}
                        </span>

                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${getEventBadgeClass(
                            evt.event_type
                          )}`}
                        >
                          {evt.event_type}
                        </span>

                        <div className="flex-1 min-w-0">
                          {hasPayload ? (
                            <button
                              onClick={() => togglePayloadExpand(evt.id)}
                              className="text-left w-full text-[#b4b4b4] hover:text-[#fafafa] flex items-center gap-1 focus:outline-none"
                            >
                              <span className="truncate">
                                {typeof evt.payload === 'string'
                                  ? evt.payload
                                  : evt.payload.target ||
                                    evt.payload.message ||
                                    evt.payload.error ||
                                    (evt.payload.findingsCount !== undefined
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
                <div className="flex items-center gap-2 pt-2 text-[#3ecf8e] text-[12px]">
                  <span className="animate-pulse">❯</span>
                  <span className="text-[#666] text-[11px] italic">Agent execution thread active...</span>
                </div>
              )}

              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* RIGHT: DISCOVERY TABS / LIVE FEED (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col h-[640px] rounded-2xl bg-[#141414] border border-[#262626] shadow-xl overflow-hidden">
            {/* Discovery Tabs Navigation */}
            <div className="p-2 bg-[#171717] border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTab('urls')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'urls'
                      ? 'bg-[#242424] text-[#fafafa] shadow-sm'
                      : 'text-[#898989] hover:text-[#fafafa]'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 text-[#3ecf8e]" />
                  <span>URLs</span>
                  <span className="text-[10px] font-mono bg-[#111] px-1.5 py-0.5 rounded text-[#898989]">
                    {discovered_urls.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('techs')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'techs'
                      ? 'bg-[#242424] text-[#fafafa] shadow-sm'
                      : 'text-[#898989] hover:text-[#fafafa]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 text-[#3b82f6]" />
                  <span>Tech</span>
                  <span className="text-[10px] font-mono bg-[#111] px-1.5 py-0.5 rounded text-[#898989]">
                    {discovered_technologies.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('findings')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'findings'
                      ? 'bg-[#242424] text-[#fafafa] shadow-sm'
                      : 'text-[#898989] hover:text-[#fafafa]'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-[#f97316]" />
                  <span>Findings</span>
                  <span className="text-[10px] font-mono bg-[#111] px-1.5 py-0.5 rounded text-[#898989]">
                    {candidate_findings.length}
                  </span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-[#898989] pr-2">
                Live Feed
              </div>
            </div>

            {/* TAB 1: DISCOVERED URLS */}
            {activeTab === 'urls' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-[#212121] bg-[#141414]">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#666]" />
                    <input
                      type="text"
                      placeholder="Search mapped endpoints..."
                      value={urlSearch}
                      onChange={(e) => setUrlSearch(e.target.value)}
                      className="w-full bg-[#1b1b1b] border border-[#2a2a2a] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[#fafafa] placeholder-[#666] focus:outline-none focus:border-[#3ecf8e]/50"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredUrls.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#666] py-12">
                      <Globe className="h-8 w-8 text-[#333] mb-2" />
                      <p className="text-[13px] text-[#888]">No mapped endpoints yet</p>
                      <p className="text-[11px] text-[#555] mt-1">
                        Katana crawler results will appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    filteredUrls.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-[#191919] border border-[#242424] hover:border-[#333] transition-colors flex items-center justify-between gap-3 text-[12px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#242424] text-[#3ecf8e] border border-[#333]">
                              {item.method || 'GET'}
                            </span>
                            {item.status_code && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  item.status_code >= 200 && item.status_code < 300
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : item.status_code >= 300 && item.status_code < 400
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {item.status_code}
                              </span>
                            )}
                          </div>
                          <p className="text-[#fafafa] font-mono text-[11px] truncate mt-1" title={item.url}>
                            {item.url}
                          </p>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded text-[#898989] hover:text-[#3ecf8e] hover:bg-[#242424] transition-colors"
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
                <div className="p-3 border-b border-[#212121] bg-[#141414]">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#666]" />
                    <input
                      type="text"
                      placeholder="Search technologies..."
                      value={techSearch}
                      onChange={(e) => setTechSearch(e.target.value)}
                      className="w-full bg-[#1b1b1b] border border-[#2a2a2a] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[#fafafa] placeholder-[#666] focus:outline-none focus:border-[#3ecf8e]/50"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredTechs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#666] py-12">
                      <Layers className="h-8 w-8 text-[#333] mb-2" />
                      <p className="text-[13px] text-[#888]">No technologies identified yet</p>
                      <p className="text-[11px] text-[#555] mt-1">
                        Httpx & Wappalyzer fingerprinting runs during reconnaissance.
                      </p>
                    </div>
                  ) : (
                    filteredTechs.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg bg-[#191919] border border-[#242424] hover:border-[#333] transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-md bg-[#242424] border border-[#333] flex items-center justify-center text-[#3b82f6]">
                            <Code2 className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-[13px] font-semibold text-[#fafafa]">
                              {t.technology}
                            </h4>
                            {t.version ? (
                              <p className="text-[11px] font-mono text-[#898989]">
                                Version: {t.version}
                              </p>
                            ) : (
                              <p className="text-[11px] text-[#666]">Version undetected</p>
                            )}
                          </div>
                        </div>

                        {t.confidence !== null && t.confidence !== undefined && (
                          <div className="text-right">
                            <span className="text-[11px] font-mono text-[#3ecf8e] font-semibold">
                              {Math.round(t.confidence * 100)}%
                            </span>
                            <p className="text-[9px] text-[#666] uppercase">Confidence</p>
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
                <div className="p-2.5 border-b border-[#212121] bg-[#141414] flex items-center justify-between text-[11px]">
                  <span className="text-[#898989] font-mono">Filter Severity:</span>
                  <div className="flex items-center gap-1 font-mono">
                    {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setFindingsSeverityFilter(sev)}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          findingsSeverityFilter === sev
                            ? 'bg-[#3ecf8e] text-[#0f0f0f] font-semibold'
                            : 'text-[#898989] hover:text-[#fafafa] hover:bg-[#222]'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {candidateFindingsWithStatus.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#666] py-12">
                      <AlertCircle className="h-8 w-8 text-[#333] mb-2" />
                      <p className="text-[13px] text-[#888]">No findings registered yet</p>
                      <p className="text-[11px] text-[#555] mt-1">
                        Nuclei and TruffleHog findings will populate here for AI validation.
                      </p>
                    </div>
                  ) : (
                    candidateFindingsWithStatus.map((item) => {
                      const isExpanded = expandedFindings[item.id];
                      const sev = (item.severity || 'low').toLowerCase();

                      let sevBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      if (sev === 'critical') sevBadge = 'bg-red-500/10 text-red-400 border-red-500/20';
                      if (sev === 'high') sevBadge = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                      if (sev === 'medium') sevBadge = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-[#191919] border border-[#262626] hover:border-[#333] transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${sevBadge}`}
                              >
                                {item.severity}
                              </span>

                              {item.isConfirmed === true && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30">
                                  <Check className="h-3 w-3" /> VERIFIED
                                </span>
                              )}
                              {item.isConfirmed === false && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 line-through">
                                  FALSE POSITIVE
                                </span>
                              )}
                              {item.isConfirmed === null && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                  AI TRIAGE PENDING
                                </span>
                              )}
                            </div>

                            {item.confidence !== null && item.confidence !== undefined && (
                              <span className="text-[11px] font-mono text-[#898989]">
                                {Math.round(item.confidence * 100)}% conf
                              </span>
                            )}
                          </div>

                          <h4 className="text-[13px] font-semibold text-[#fafafa] mt-2">
                            {item.title}
                          </h4>

                          {item.reasoning && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleFindingExpand(item.id)}
                                className="text-[11px] text-[#3ecf8e] hover:underline flex items-center gap-1 font-mono focus:outline-none"
                              >
                                {isExpanded ? 'Hide AI Reasoning' : 'View AI Rationale'}
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-2.5 rounded bg-[#131313] border border-[#2a2a2a] text-[11px] text-[#b4b4b4] font-sans leading-relaxed">
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
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#262626] bg-[#141414]/95 backdrop-blur-lg z-40 py-3.5 px-4 sm:px-8">
        <div className="mx-auto max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[12px] font-mono text-[#898989]">
            <Link
              href="/"
              className="hover:text-[#fafafa] transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Scans
            </Link>
            <span className="text-[#333]">•</span>
            <div>
              Status: <span className="text-[#fafafa] font-semibold">{scan.status}</span>
            </div>
            <span className="text-[#333]">•</span>
            <div>
              Endpoints Mapped: <span className="text-[#3ecf8e]">{discovered_urls.length}</span>
            </div>
            <span className="text-[#333]">•</span>
            <div>
              Findings: <span className="text-[#f97316]">{candidate_findings.length}</span>
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
                className="px-4 py-2 bg-[#242424] hover:bg-[#ef4444]/20 hover:text-[#ef4444] text-[#b4b4b4] text-[13px] font-medium rounded-lg border border-[#333] transition-colors inline-flex items-center gap-1.5"
              >
                <StopCircle className="h-4 w-4" />
                <span>Cancel Scan</span>
              </button>
            )}

            {isCompleted ? (
              <Link
                href={`/reports/${scanId}`}
                className="px-5 py-2 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#0f0f0f] text-[13px] font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(62,207,142,0.35)] inline-flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>View Final Report</span>
              </Link>
            ) : (
              <button
                disabled
                className="px-5 py-2 bg-[#1f1f1f] text-[#666] border border-[#2a2a2a] text-[13px] font-medium rounded-lg inline-flex items-center gap-2 cursor-not-allowed"
                title="Final report available once scan pipeline finishes"
              >
                <Activity className="h-4 w-4 animate-spin text-[#444]" />
                <span>Report Generating ({scan.status})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. CANCEL CONFIRMATION MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#171717] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-[#ef4444] mb-3">
              <div className="h-10 w-10 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#fafafa]">Confirm Scan Cancellation</h3>
            </div>
            <p className="text-[13px] text-[#898989] leading-relaxed mb-6">
              Are you sure you want to stop the autonomous agents for{' '}
              <span className="text-[#fafafa] font-mono font-semibold">{scan.target}</span>? This
              will immediately halt crawler subtasks, tool executions, and LLM validation.
            </p>
            {cancelError && (
              <div className="mb-4 p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-[13px] flex items-center gap-2">
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
                className="px-4 py-2 bg-[#242424] hover:bg-[#2e2e2e] text-[#fafafa] text-[13px] font-medium rounded-lg transition-colors"
              >
                Continue Scan
              </button>
              <button
                onClick={handleCancelScan}
                disabled={cancelling}
                className="px-4 py-2 bg-[#ef4444] hover:bg-[#ef4444]/90 text-[#ffffff] text-[13px] font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
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
