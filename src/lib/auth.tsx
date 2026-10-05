'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { track } from './analytics';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithMicrosoft: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signInWithGoogle: async () => ({}),
  signInWithMicrosoft: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        maybeTrackSignup(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        maybeTrackSignup(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabaseBrowser.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signInWithMicrosoft = useCallback(async () => {
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/admin`,
        scopes: 'openid profile email',
      },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabaseBrowser.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signInWithMicrosoft, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}


// A session existing does not mean someone signed up: sign-ins, token refreshes
// and reloads all produce one. The distinguishing signal is an account created
// moments ago whose email is now confirmed, which is what an email-confirmation
// click or an OAuth first-time login produces and a returning login does not.
// Guarded per user id so a reload cannot double-count the funnel.
const trackedSignups = new Set<string>();
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

type AuthUserLike = {
  id: string;
  created_at?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

function maybeTrackSignup(u: AuthUserLike): void {
  if (trackedSignups.has(u.id)) return;

  const createdAt = u.created_at ? Date.parse(u.created_at) : NaN;
  if (!Number.isFinite(createdAt)) return;

  const confirmedAt = Date.parse(u.email_confirmed_at || u.confirmed_at || '');
  const age = Date.now() - createdAt;
  if (age < 0 || age > SIGNUP_WINDOW_MS) return;

  // An unconfirmed account with a session is a pending signup, not a completed
  // one. Only fire once the email is actually confirmed.
  if (Number.isFinite(confirmedAt) && confirmedAt > createdAt) {
    trackedSignups.add(u.id);
    track('signup_completed', { method: 'email' });
  }
}

export function useAuth() {
  return useContext(AuthContext);
}
