/// <reference types="astro/client" />

import type { SupabaseClient, Session } from "@supabase/supabase-js";
import type { Database } from "./lib/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: Session | null;
    }
  }
}