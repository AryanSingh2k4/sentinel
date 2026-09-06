'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, User, ChevronDown, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';

interface NavbarProps {
  activeTab?: 'dashboard' | 'github-scanner' | 'reports' | 'none';
}

export function Navbar({ activeTab }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setUserEmail(data.user?.email || 'Operator');
      } catch {
        setUserEmail('Operator');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    router.push('/login');
    router.refresh();
  };

  // Determine active item based on prop or pathname
  const currentTab =
    activeTab ||
    (pathname === '/'
      ? 'dashboard'
      : pathname.startsWith('/github-scanner')
      ? 'github-scanner'
      : pathname.startsWith('/reports')
      ? 'reports'
      : 'none');

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-40 print:hidden">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Brand & Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-[7px] bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                <Shield className="h-4.5 w-4.5" fill="currentColor" />
              </div>
              <span className="font-serif font-bold tracking-tight text-foreground text-[20px]">Sentinel</span>
            </Link>
            <div className="hidden md:flex space-x-7 text-[16px] font-serif font-bold">
              <Link
                href="/"
                className={`py-[15px] transition-colors ${
                  currentTab === 'dashboard'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/github-scanner"
                className={`py-[15px] transition-colors ${
                  currentTab === 'github-scanner'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                GitHub
              </Link>
              <Link
                href="/reports"
                className={`py-[15px] transition-colors ${
                  currentTab === 'reports'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Reports
              </Link>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
                className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-secondary border border-transparent hover:border-border transition-colors focus:outline-none cursor-pointer"
              >
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center border border-border">
                  <User className="h-3.5 w-3.5 text-foreground" />
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-[12px] shadow-none py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Signed in as</p>
                    <p className="text-[13px] text-foreground font-medium truncate mt-0.5">{userEmail}</p>
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors flex items-center cursor-pointer"
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
  );
}
