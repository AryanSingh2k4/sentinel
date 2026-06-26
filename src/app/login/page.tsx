'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Name, email, and password are required');
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Auto-create operator record for the new user
      if (data.user) {
        await supabase.from('operators').insert({
          auth_user_id: data.user.id,
          email: data.user.email || email,
        });
      }
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      
      {/* Header outside the card */}
      <div className="mb-8 flex flex-col items-center space-y-4 text-center">
        <div className="bg-[#0f62fe] p-3 rounded-full shadow-sm">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <div className="space-y-1">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
            {isSignUp ? 'Create an Account' : 'Sign in to Sentinel'}
          </h1>
          <p className="text-[15px] text-slate-500">
            {isSignUp ? 'Create your operator account to begin scanning' : 'Access your operator portal'}
          </p>
        </div>
      </div>

      {/* The White Card */}
      <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <form onSubmit={isSignUp ? handleSignUp : handleEmailLogin} className="space-y-5">
          
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px] text-slate-600 font-medium">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Your Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-lg border-slate-200 text-[15px]"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px] text-slate-600 font-medium">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-lg border-slate-200 text-[15px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[13px] text-slate-600 font-medium">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border-slate-200 text-[15px]"
            />
          </div>

          {error && (
            <div className="text-sm font-medium text-red-500 text-center">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-[#0f62fe] hover:bg-[#0353e9] text-white rounded-lg h-11 text-[15px] font-medium transition-colors mt-2">
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-7 relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[13px]">
            <span className="bg-white px-4 text-slate-500">
              Or continue with
            </span>
          </div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          className="w-full mt-7 h-11 rounded-lg border-slate-200 text-slate-700 font-medium hover:bg-slate-50 text-[15px]" 
          onClick={handleGoogleLogin} 
          disabled={loading}
        >
          <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </Button>

        {/* Footer inside the card */}
        <div className="mt-8 text-center text-[13.5px] text-slate-500">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => { setError(null); setIsSignUp(false); }} className="text-[#0f62fe] font-medium hover:underline">
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button type="button" onClick={() => { setError(null); setIsSignUp(true); }} className="text-[#0f62fe] font-medium hover:underline">
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
