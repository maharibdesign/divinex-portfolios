/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./lib/database.types";
import type { Profile } from "./lib/types";

declare global {
  namespace App {
    interface Locals {
      // The server-side Supabase instance, created in the middleware.
      supabase: SupabaseClient<Database>;
      
      // The full user profile if a valid session token is found.
      user: Profile | null;
    }
  }
}