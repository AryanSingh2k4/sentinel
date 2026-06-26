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
          <button className="bg-[#3ecf8e] hover:bg-[#72e3ad] text-[#121212] rounded-[8px] h-[36px] px-4 text-[14px] font-medium transition-colors">
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
            <div className="text-[32px] font-normal tracking-tight text-[#fafafa] mb-1 leading-none">12</div>
            <p className="text-[14px] text-[#898989]">+2 from yesterday</p>
          </div>

          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-[#b4b4b4]">Critical Findings</h3>
              <AlertTriangle className="h-4 w-4 text-[#f87171]" />
            </div>
            <div className="text-[32px] font-normal tracking-tight text-[#f87171] mb-1 leading-none">4</div>
            <p className="text-[14px] text-[#898989]">Requires immediate review</p>
          </div>

          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-[#b4b4b4]">Pending Reviews</h3>
              <Clock className="h-4 w-4 text-[#fbbf24]" />
            </div>
            <div className="text-[32px] font-normal tracking-tight text-[#fafafa] mb-1 leading-none">28</div>
            <p className="text-[14px] text-[#898989]">Findings await validation</p>
          </div>

          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-[#b4b4b4]">Recent Reports</h3>
              <FileText className="h-4 w-4 text-[#898989]" />
            </div>
            <div className="text-[32px] font-normal tracking-tight text-[#fafafa] mb-1 leading-none">3</div>
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
                  {[
                    { id: "SCN-8421", target: "api.production.com", status: "RECON", progress: "45%" },
                    { id: "SCN-8422", target: "auth.staging.net", status: "ATTACK", progress: "82%" },
                    { id: "SCN-8423", target: "cdn.assets.io", status: "QUEUED", progress: "0%" },
                  ].map((scan) => (
                    <tr key={scan.id} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#242424] transition-colors">
                      <td className="px-6 py-4 font-mono text-[12px] text-[#898989]">{scan.id}</td>
                      <td className="px-6 py-4 text-[#fafafa]">{scan.target}</td>
                      <td className="px-6 py-4">
                        <span className="bg-[#242424] border border-[#393939] text-[#b4b4b4] px-2 py-0.5 rounded-[6px] text-[12px] font-mono">
                          {scan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[12px] text-[#fafafa]">{scan.progress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Critical Findings Table */}
          <div className="bg-[#171717] border border-[#2e2e2e] rounded-[12px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2e2e2e]">
              <h3 className="text-[14px] font-medium text-[#fafafa]">Critical Findings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-[#2e2e2e] text-[#898989]">
                    <th className="px-6 py-3 font-medium font-sans">ID</th>
                    <th className="px-6 py-3 font-medium font-sans">Severity</th>
                    <th className="px-6 py-3 font-medium font-sans">Vulnerability</th>
                    <th className="px-6 py-3 font-medium font-sans text-right">Detected</th>
                  </tr>
                </thead>
                <tbody className="text-[#b4b4b4]">
                  {[
                    { id: "FND-091", sev: "CRITICAL", type: "CWE-89: SQL Injection", time: "2h ago" },
                    { id: "FND-090", sev: "CRITICAL", type: "Exposed API Key", time: "5h ago" },
                    { id: "FND-088", sev: "HIGH", type: "CWE-79: Reflected XSS", time: "1d ago" },
                  ].map((finding) => (
                    <tr key={finding.id} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#242424] transition-colors">
                      <td className="px-6 py-4 font-mono text-[12px] text-[#898989]">{finding.id}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[12px] font-medium ${finding.sev === 'CRITICAL' ? 'text-[#f87171]' : 'text-[#fbbf24]'}`}>
                          {finding.sev}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[12px] text-[#fafafa]">{finding.type}</td>
                      <td className="px-6 py-4 text-right text-[12px] text-[#898989]">{finding.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
