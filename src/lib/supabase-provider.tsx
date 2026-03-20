"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';

type SupabaseContext = {
  supabase: SupabaseClient;
  session: any;
};

// Create a context for the Supabase client
const SupabaseContext = createContext<SupabaseContext | undefined>(undefined);

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return;
      }
      
      setSession(data.session);
      
      // If no session, redirect to login
      if (!data.session) {
        router.push('/auth/login');
      }
    };
    
    getSession();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        // If user logs out, redirect to login
        if (event === 'SIGNED_OUT') {
          router.push('/auth/login');
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);
  
  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
};

// Custom hook to use Supabase client
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider');
  }
  return context;
}; 