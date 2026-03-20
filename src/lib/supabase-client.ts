import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

class SupabaseClientSingleton {
    private static instance: ReturnType<typeof createClientComponentClient<Database>> | null = null;

    private constructor() {}

    public static getInstance() {
        if (!SupabaseClientSingleton.instance) {
            SupabaseClientSingleton.instance = createClientComponentClient<Database>();
        }
        return SupabaseClientSingleton.instance;
    }
}

// Export a single instance that will be reused across the application
export const supabaseClient = SupabaseClientSingleton.getInstance(); 