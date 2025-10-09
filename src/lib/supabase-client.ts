import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Returns a Supabase client instance specifically configured with the user's
 * Telegram initData for a given set of operations.
 * This is the safest way to handle per-request authentication, as it does not
 * modify a global singleton.
 * 
 * @param initData The raw initData string from the Telegram Mini App.
 * @returns A new, configured Supabase client instance.
 */
export function getAuthedSupabase(initData: string): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-telegram-init-data': initData,
      },
    },
  });
}

// We can also export a base, un-authed client for public queries if needed.
export const publicSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey);