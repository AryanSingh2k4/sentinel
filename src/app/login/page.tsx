'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccessMsg('Password reset link sent! Please check your email.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Name, email, and password are required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccessMsg('Registration successful! Please check your email to verify your account.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] p-4 font-sans text-[#fafafa]">
      
      {/* Header outside the card */}
      <div className="mb-8 flex flex-col items-center space-y-4 text-center">
        <Shield className="h-10 w-10 text-[#3ecf8e]" strokeWidth={1.5} fill="currentColor" />
        <div className="space-y-2">
          <h1 className="text-[24px] font-normal tracking-tight text-[#fafafa]">
            {isResettingPassword ? 'Reset Password' : (isSignUp ? 'Create your account' : 'Welcome to Sentinel')}
          </h1>
          <p className="text-[14px] text-[#b4b4b4]">
            {isResettingPassword ? 'Enter your email to receive a reset link' : (isSignUp ? 'Register to start scanning targets' : 'Sign in to access your operator portal')}
          </p>
        </div>
      </div>

      {/* The Supabase Style Card */}
      <div className="w-full max-w-[400px] bg-[#171717] border border-[#2e2e2e] rounded-[12px] p-8 shadow-none">
        
        {!isResettingPassword && (
          <>
            <button 
              type="button" 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full flex items-center justify-center h-[40px] rounded-[8px] bg-[#242424] border border-[#393939] text-[14px] text-[#fafafa] font-medium hover:border-[#898989] transition-all disabled:opacity-50"
            >
              <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="mt-6 mb-6 relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#2e2e2e]" />
              </div>
              <div className="relative flex justify-center text-[12px]">
                <span className="bg-[#171717] px-4 text-[#898989]">
                  or continue with email
                </span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={isResettingPassword ? handleResetPassword : (isSignUp ? handleSignUp : handleEmailLogin)} className="space-y-4">
          
          {isSignUp && (
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-[14px] text-[#b4b4b4] font-medium">Full Name</label>
              <input 
                id="name" 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[40px] px-3 bg-[#121212] border border-[#393939] text-[#fafafa] text-[14px] rounded-[8px] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all placeholder-[#898989]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[14px] text-[#b4b4b4] font-medium">Email Address</label>
            <input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[40px] px-3 bg-[#121212] border border-[#393939] text-[#fafafa] text-[14px] rounded-[8px] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all placeholder-[#898989]"
            />
          </div>
          {!isResettingPassword && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-[14px] text-[#b4b4b4] font-medium">Password</label>
                  {!isSignUp && (
                    <button type="button" onClick={() => { setError(null); setSuccessMsg(null); setIsResettingPassword(true); }} className="text-[12px] text-[#898989] hover:text-[#3ecf8e] transition-colors">
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[40px] px-3 bg-[#121212] border border-[#393939] text-[#fafafa] text-[14px] rounded-[8px] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all placeholder-[#898989]"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-[13px] font-medium text-[#f87171] bg-[#7f1d1d]/20 border border-[#991b1b]/30 rounded-[6px] p-2 text-center">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="text-[13px] font-medium text-[#3ecf8e] bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 rounded-[6px] p-2 text-center">
              {successMsg}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full mt-2 bg-[#3ecf8e] hover:bg-[#72e3ad] text-[#121212] rounded-[8px] h-[40px] text-[14px] font-medium transition-colors disabled:opacity-50">
            {loading ? 'Processing...' : (isResettingPassword ? 'Send Reset Link' : (isSignUp ? 'Sign Up' : 'Sign In'))}
          </button>
        </form>

      </div>

      <div className="mt-8 text-center text-[14px] text-[#898989]">
        {isResettingPassword ? (
          <button type="button" onClick={() => { setError(null); setSuccessMsg(null); setIsResettingPassword(false); }} className="text-[#fafafa] hover:text-[#3ecf8e] transition-colors">
            Back to login
          </button>
        ) : isSignUp ? (
          <>
            Already have an account?{' '}
            <button type="button" onClick={() => { setError(null); setSuccessMsg(null); setIsSignUp(false); }} className="text-[#fafafa] hover:text-[#3ecf8e] transition-colors">
              Sign In
            </button>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <button type="button" onClick={() => { setError(null); setSuccessMsg(null); setIsSignUp(true); }} className="text-[#fafafa] hover:text-[#3ecf8e] transition-colors">
              Sign Up
            </button>
          </>
        )}
      </div>
    </div>
  );
}
