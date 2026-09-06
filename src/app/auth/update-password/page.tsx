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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-sans text-foreground relative transition-colors duration-150">
      
      {/* Top Right Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Header outside the card */}
      <div className="mb-8 flex flex-col items-center space-y-3 text-center">
        <div className="h-10 w-10 rounded-[10px] bg-primary flex items-center justify-center text-primary-foreground">
          <Shield className="h-5 w-5" fill="currentColor" />
        </div>
        <div className="space-y-1">
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
            Update Password
          </h1>
          <p className="text-[14px] text-muted-foreground">
            Please enter your new password
          </p>
        </div>
      </div>

      {/* The Sentinel Card */}
      <div className="w-full max-w-[400px] bg-card border border-border rounded-[6px] p-8 shadow-none">
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] text-foreground font-medium">New Password</label>
            <input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[40px] px-3 bg-secondary border border-border text-foreground text-[14px] rounded-[8px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[13px] text-foreground font-medium">Confirm New Password</label>
            <input 
              id="confirmPassword" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-[40px] px-3 bg-secondary border border-border text-foreground text-[14px] rounded-[8px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-muted-foreground"
            />
          </div>

          {error && (
            <div className="text-[13px] font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-[8px] p-2.5 text-center">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full mt-2 bg-primary hover:bg-[#0000cd] dark:hover:bg-[#9ec5ff] text-primary-foreground rounded-[6px] h-[40px] text-[14px] font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-none">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

      </div>
    </div>
  );
}
