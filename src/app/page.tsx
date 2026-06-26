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
  ChevronDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Dashboard() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [techFindings, setTechFindings] = useState<any[]>([]);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Supabase Realtime Subscription (Might be blocked by RLS, but keeping as fallback)
    const supabase = createClient();
    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scans' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discovered_technologies' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
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
    <div className="min-h-screen bg-[#121212] font-sans text-[#fafafa]">
      {/* Top Navigation */}
      <nav className="border-b border-[#2e2e2e] bg-[#171717]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-[#3ecf8e]" strokeWidth={2} />
                <span className="font-medium tracking-tight text-[#fafafa]">Sentinel AI</span>
              </div>
              <div className="hidden md:flex space-x-6 text-[14px] font-medium">
                <Link href="#" className="text-[#fafafa] border-b-2 border-[#3ecf8e] py-[15px]">Dashboard</Link>
                <Link href="#" className="text-[#b4b4b4] hover:text-[#fafafa] transition-colors py-[15px]">Targets</Link>
                <Link href="#" className="text-[#b4b4b4] hover:text-[#fafafa] transition-colors py-[15px]">Scans</Link>
                <Link href="#" className="text-[#b4b4b4] hover:text-[#fafafa] transition-colors py-[15px]">Findings</Link>
                <Link href="#" className="text-[#b4b4b4] hover:text-[#fafafa] transition-colors py-[15px]">Reports</Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Search className="h-4 w-4 text-[#898989] hover:text-[#fafafa] cursor-pointer transition-colors" />
              <div title="Settings (Coming Soon)" className="flex cursor-pointer">
                <Settings className="h-4 w-4 text-[#898989] hover:text-[#fafafa] transition-colors" />
              </div>
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-1 rounded-[8px] hover:bg-[#242424] transition-colors focus:outline-none"
                >
                  <div className="h-7 w-7 rounded-[6px] bg-[#242424] flex items-center justify-center border border-[#393939]">
                    <User className="h-3.5 w-3.5 text-[#b4b4b4]" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-[#898989]" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#171717] border border-[#2e2e2e] rounded-[12px] shadow-2xl py-1 z-50">
                    <div className="px-4 py-3 border-b border-[#2e2e2e]">
                      <p className="text-[12px] text-[#898989] font-medium">Signed in as</p>
                      <p className="text-[14px] text-[#fafafa] truncate mt-0.5">{userEmail}</p>
                    </div>
                    <div className="py-1">
                      <button className="w-full text-left px-4 py-2 text-[14px] text-[#b4b4b4] hover:bg-[#242424] hover:text-[#fafafa] transition-colors flex items-center">
                        <Settings className="h-4 w-4 mr-2 text-[#898989]" />
                        Settings <span className="ml-auto text-[10px] bg-[#242424] px-1.5 py-0.5 rounded text-[#898989]">Coming Soon</span>
                      </button>
                    </div>
                    <div className="border-t border-[#2e2e2e] py-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-[14px] text-[#f87171] hover:bg-[#7f1d1d]/20 transition-colors flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
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
          <h1 className="text-[24px] font-normal text-[#fafafa] tracking-tight">Security Overview</h1>
          <button 
            onClick={() => {
              setScanTarget('');
              setScanModalOpen(true);
            }}
            className="bg-[#3ecf8e] hover:bg-[#72e3ad] text-[#121212] rounded-[8px] h-[36px] px-4 text-[14px] font-medium transition-colors"
          >
            New Scan
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-[#b4b4b4]">Active Scans</h3>
              <Activity className="h-4 w-4 text-[#898989]" />
            </div>
            <div className="text-[32px] font-normal tracking-tight text-[#fafafa] mb-1 leading-none">0</div>
            <p className="text-[14px] text-[#898989]">No active scans</p>
          </div>

          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-[#b4b4b4]">Critical Findings</h3>
              <AlertTriangle className="h-4 w-4 text-[#f87171]" />
            </div>
            <div className="text-[32px] font-normal tracking-tight text-[#f87171] mb-1 leading-none">0</div>
            <p className="text-[14px] text-[#898989]">No critical findings</p>
          </div>

          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-[#b4b4b4]">Pending Reviews</h3>
              <Clock className="h-4 w-4 text-[#fbbf24]" />
            </div>
            <div className="text-[32px] font-normal tracking-tight text-[#fafafa] mb-1 leading-none">0</div>
            <p className="text-[14px] text-[#898989]">All findings validated</p>
          </div>

          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-[#b4b4b4]">Recent Reports</h3>
              <FileText className="h-4 w-4 text-[#898989]" />
            </div>
            <div className="text-[32px] font-normal tracking-tight text-[#fafafa] mb-1 leading-none">0</div>
            <p className="text-[14px] text-[#898989]">Generated this week</p>
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* Active Scans Table */}
          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2e2e2e]">
              <h3 className="text-[14px] font-medium text-[#fafafa]">Active Scans</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[#2e2e2e] text-[#898989]">
                    <th className="px-6 py-3 font-medium font-sans">Scan ID</th>
                    <th className="px-6 py-3 font-medium font-sans">Target</th>
                    <th className="px-6 py-3 font-medium font-sans">Status</th>
                    <th className="px-6 py-3 font-medium font-sans text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="text-[#b4b4b4]">
                  {scans.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-4 text-center text-[#898989]">No active scans found.</td></tr>
                  )}
                  {scans.map((scan) => {
                    // Extract domain from nested targets object (or array)
                    let domainName = 'Unknown Target';
                    if (scan.targets) {
                      if (Array.isArray(scan.targets) && scan.targets.length > 0) {
                        domainName = scan.targets[0].domain || 'Unknown Target';
                      } else if (scan.targets.domain) {
                        domainName = scan.targets.domain;
                      }
                    }

                    return (
                      <tr key={scan.id} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#242424] transition-colors">
                        <td className="px-6 py-4 font-mono text-[12px] text-[#898989]" title={scan.id}>{scan.id.substring(0, 8)}...</td>
                        <td className="px-6 py-4 text-[#fafafa]">{domainName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[12px] font-mono border ${
                            scan.status === 'FAILED' ? 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]' :
                            scan.status === 'QUEUED' ? 'bg-[#242424] border-[#393939] text-[#898989]' :
                            scan.status === 'COMPLETED' ? 'bg-[#3ecf8e]/10 border-[#3ecf8e]/20 text-[#3ecf8e]' :
                            'bg-[#fbbf24]/10 border-[#fbbf24]/20 text-[#fbbf24]'
                          }`}>
                            {scan.status || 'QUEUED'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-[12px] text-[#fafafa]">-</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Critical Findings Table */}
          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2e2e2e]">
              <h3 className="text-[14px] font-medium text-[#fafafa]">Discovered Technologies</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[#2e2e2e] text-[#898989]">
                    <th className="px-6 py-3 font-medium font-sans">Tech ID</th>
                    <th className="px-6 py-3 font-medium font-sans">Technology</th>
                    <th className="px-6 py-3 font-medium font-sans">Confidence</th>
                    <th className="px-6 py-3 font-medium font-sans text-right">Detected</th>
                  </tr>
                </thead>
                <tbody className="text-[#b4b4b4]">
                  {techFindings.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-4 text-center text-[#898989]">No technologies discovered yet.</td></tr>
                  )}
                  {techFindings.map((finding) => (
                    <tr key={finding.id} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#242424] transition-colors">
                      <td className="px-6 py-4 font-mono text-[12px] text-[#898989]" title={finding.id}>{finding.id.toString().substring(0, 8)}...</td>
                      <td className="px-6 py-4 font-mono text-[12px] text-[#fafafa]">{finding.technology}</td>
                      <td className="px-6 py-4">
                        <span className="text-[12px] font-medium text-[#fbbf24]">
                          {finding.confidence}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[12px] text-[#898989]">
                        {finding.created_at ? new Date(finding.created_at).toLocaleTimeString() : 'Just now'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>

      {/* Custom Scan Modal */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[440px] bg-[#171717] border border-[#2e2e2e] rounded-[12px] shadow-2xl p-6 relative">
            <button 
              onClick={() => setScanModalOpen(false)}
              className="absolute top-4 right-4 text-[#898989] hover:text-[#fafafa] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            
            <h2 className="text-[18px] font-medium text-[#fafafa] mb-2">Initiate New Scan</h2>
            <p className="text-[14px] text-[#898989] mb-6">Enter a target domain or URL to launch the reconnaissance and attack sequence.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#b4b4b4] mb-1.5">Target</label>
                <input 
                  autoFocus
                  type="text" 
                  value={scanTarget}
                  onChange={(e) => setScanTarget(e.target.value)}
                  placeholder="e.g. hackerone.com"
                  className="w-full h-[40px] px-3 bg-[#121212] border border-[#393939] text-[#fafafa] text-[14px] rounded-[8px] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all placeholder-[#898989]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && scanTarget.trim() && !scanLoading) {
                      document.getElementById('start-scan-btn')?.click();
                    }
                  }}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  onClick={() => setScanModalOpen(false)}
                  disabled={scanLoading}
                  className="px-4 h-[36px] text-[14px] font-medium text-[#b4b4b4] hover:text-[#fafafa] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  id="start-scan-btn"
                  disabled={!scanTarget.trim() || scanLoading}
                  onClick={async () => {
                    setScanLoading(true);
                    try {
                      const res = await fetch('/api/scans', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ target: scanTarget.trim() })
                      });
                      if (res.ok) {
                        setScanModalOpen(false);
                        fetchDashboardData(); // Instantly refresh the table
                      } else {
                        alert("Failed to initiate scan.");
                      }
                    } catch (e) {
                      console.error(e);
                      alert("Error initiating scan.");
                    } finally {
                      setScanLoading(false);
                    }
                  }}
                  className="bg-[#3ecf8e] hover:bg-[#72e3ad] text-[#121212] rounded-[8px] h-[36px] px-4 text-[14px] font-medium transition-colors disabled:opacity-50 flex items-center"
                >
                  {scanLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#121212]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting...
                    </>
                  ) : 'Start Scan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
