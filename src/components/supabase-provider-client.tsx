"use client";

import { SupabaseProvider } from "../lib/supabase-provider";

export default function SupabaseProviderClient({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return <SupabaseProvider>{children}</SupabaseProvider>;
} 