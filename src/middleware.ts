import { defineMiddleware } from 'astro:middleware';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from './lib/database.types';

export const onRequest = defineMiddleware(async (context, next) => {
  // This is the new, correct way to create the server client
  const supabase = createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key: string) {
          return context.cookies.get(key)?.value;
        },
        set(key: string, value: string, options: CookieOptions) {
          context.cookies.set(key, value, options);
        },
        remove(key: string, options: CookieOptions) {
          context.cookies.delete(key, options);
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Make the session and the Supabase instance available to all pages
  context.locals.supabase = supabase;
  context.locals.session = session;
  
  return next();
});