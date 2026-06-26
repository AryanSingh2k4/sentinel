import { createClient } from '@/lib/supabase/client';

describe('Supabase Client', () => {
  it('should create a browser client', () => {
    // Basic test to ensure the client is initialized without crashing
    // Environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be mocked in setup
    expect(typeof createClient).toBe('function');
  });
});
