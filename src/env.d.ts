/// <reference types="astro/client" />

import type { Profile } from "./lib/types";

declare global {
  namespace App {
    interface Locals {
      // We are no longer using Supabase Auth session. We have our own user object.
      user: Profile | null;
    }
  }
}