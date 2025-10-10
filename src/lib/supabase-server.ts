import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;

// This is our secure, server-side admin client
export const supabase = createClient<Database>(supabaseUrl, serviceKey);