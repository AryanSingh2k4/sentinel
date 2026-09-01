'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#ffffff] dark:bg-[#000000] p-4 font-sans text-[#171717] dark:text-[#ededed] relative transition-colors duration-150">
      
      {/* Top Right Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Header outside the card */}
      <div className="mb-8 flex flex-col items-center space-y-3 text-center">
        <div className="h-10 w-10 rounded-[10px] bg-[#171717] dark:bg-[#ededed] flex items-center justify-center text-white dark:text-[#000000]">
          <Shield className="h-5 w-5" fill="currentColor" />
        </div>
        <div className="space-y-1">
          <h1 className="text-[24px] font-medium tracking-tight text-[#171717] dark:text-[#ededed]">
            Update Password
          </h1>
          <p className="text-[14px] text-[#8f8f8f]">
            Please enter your new password
          </p>
        </div>
      </div>

      {/* The Vercel Card */}
      <div className="w-full max-w-[400px] bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[16px] p-8 shadow-none">
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] text-[#171717] dark:text-[#ededed] font-medium">New Password</label>
            <input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[40px] px-3 bg-[#ffffff] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] text-[#171717] dark:text-[#ededed] text-[14px] rounded-[8px] focus:outline-none focus:border-[#171717] dark:focus:border-[#ededed] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#ededed] transition-all placeholder-[#8f8f8f]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[13px] text-[#171717] dark:text-[#ededed] font-medium">Confirm New Password</label>
            <input 
              id="confirmPassword" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-[40px] px-3 bg-[#ffffff] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] text-[#171717] dark:text-[#ededed] text-[14px] rounded-[8px] focus:outline-none focus:border-[#171717] dark:focus:border-[#ededed] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#ededed] transition-all placeholder-[#8f8f8f]"
            />
          </div>

          {error && (
            <div className="text-[13px] font-medium text-[#dc2626] dark:text-[#ef4444] bg-[#fef2f2] dark:bg-[#ef4444]/10 border border-[#fecaca] dark:border-[#ef4444]/30 rounded-[8px] p-2.5 text-center">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full mt-2 bg-[#171717] hover:bg-[#000000] dark:bg-[#ededed] dark:hover:bg-[#ffffff] text-[#ffffff] dark:text-[#000000] rounded-full h-[40px] text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-none">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

      </div>
    </div>
  );
}
