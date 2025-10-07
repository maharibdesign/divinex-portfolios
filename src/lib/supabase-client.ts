import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// These variables MUST be prefixed with PUBLIC_ to be accessible in the browser.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// This is the client-side Supabase instance.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);