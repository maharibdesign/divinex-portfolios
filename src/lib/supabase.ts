import { createClient } from '@supabase/supabase-js';

// Get the environment variables from your .env file
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_KEY;

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);