'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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
      // Depending on Supabase settings, they might need to confirm email.
      // Assuming auto-confirm for local dev.
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <Shield className="h-10 w-10 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Sentinel AI</h1>
          <p className="text-sm text-muted-foreground">Enter your credentials to access the platform</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="operator@sentinel.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="flex space-x-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleSignUp}>
              Sign Up
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
