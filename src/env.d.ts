/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./lib/database.types";
import type { Profile } from "./lib/types";

declare global {
  namespace App {
    interface Locals {
      // This is the server-side Supabase instance, created in the middleware.
      supabase: SupabaseClient<Database>;
      
      // This will hold the user's full profile if they are logged in.
      user: Profile | null;
    }
  }
}