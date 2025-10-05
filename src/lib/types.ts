import type { Database } from './database.types';

// We define our Project type as a direct reference to the 'projects' table
// in the auto-generated Database types.
// This is robust, accurate, and automatically updates if we re-generate.
export type Project = Database['public']['Tables']['projects']['Row'];