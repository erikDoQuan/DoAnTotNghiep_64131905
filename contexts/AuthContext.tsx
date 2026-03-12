import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabaseClient';

type Profile = {
  id: string;
  email: string;
  name: string;
  height: number | null;
  weight: number | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null; data: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoading(true);
        fetchProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    
    // DEVELOPMENT BYPASS: If specific hardcoded credentials are used and Supabase fails (e.g. Email not confirmed)
    if (result.error && email === 'docaominhquan@gmail.com' && password === 'Minhquan-2004!') {
      console.log(">>> [DEV BYPASS] Supabase failed, but credentials match hardcoded account. Forcing session.");
      
      const mockUser: User = {
        id: 'dev-bypass-id',
        email: 'docaominhquan@gmail.com',
        app_metadata: {},
        user_metadata: { name: 'Admin/Dev' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      const mockSession: Session = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      setSession(mockSession);
      setUser(mockUser);
      // Set a mock profile
      setProfile({
        id: 'dev-bypass-id',
        email: 'docaominhquan@gmail.com',
        name: 'Admin/Dev',
        height: 175, // Pre-filled to skip onboarding too
        weight: 70,
      });
      
      return { error: null, data: { session: mockSession, user: mockUser } };
    }

    return result;
  };

  const signUp = async (email: string, password: string, name: string) => {
    // Pass the name via options to the trigger we created in SQL
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, refreshProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
