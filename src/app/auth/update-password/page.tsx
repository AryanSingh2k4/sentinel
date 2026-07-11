'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] p-4 font-sans text-[#fafafa]">
      
      {/* Header outside the card */}
      <div className="mb-8 flex flex-col items-center space-y-4 text-center">
        <Shield className="h-10 w-10 text-[#3ecf8e]" strokeWidth={1.5} fill="currentColor" />
        <div className="space-y-2">
          <h1 className="text-[24px] font-normal tracking-tight text-[#fafafa]">
            Update Password
          </h1>
          <p className="text-[14px] text-[#b4b4b4]">
            Please enter your new password
          </p>
        </div>
      </div>

      {/* The Supabase Style Card */}
      <div className="w-full max-w-[400px] bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-8 shadow-none">
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[14px] text-[#b4b4b4] font-medium">New Password</label>
            <input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[40px] px-3 bg-[#121212] border border-[#393939] text-[#fafafa] text-[14px] rounded-[8px] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all placeholder-[#898989]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[14px] text-[#b4b4b4] font-medium">Confirm New Password</label>
            <input 
              id="confirmPassword" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-[40px] px-3 bg-[#121212] border border-[#393939] text-[#fafafa] text-[14px] rounded-[8px] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all placeholder-[#898989]"
            />
          </div>

          {error && (
            <div className="text-[13px] font-medium text-[#f87171] bg-[#7f1d1d]/20 border border-[#991b1b]/30 rounded-[6px] p-2 text-center">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full mt-2 bg-[#3ecf8e] hover:bg-[#72e3ad] text-[#121212] rounded-[8px] h-[40px] text-[14px] font-medium transition-colors disabled:opacity-50">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

      </div>
    </div>
  );
}
