import type { Database } from './database.types';

// The Profile is now the central type in our application.
export type Profile = Database['public']['Tables']['profiles']['Row'];