import { defineMiddleware } from 'astro:middleware';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from './lib/database.types';

export const onRequest = defineMiddleware(async (context, next) => {
  // This is the correct way to create the server client for SSR
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

  // Get the current Supabase Auth session
  const { data: { session } } = await supabase.auth.getSession();

  // Make the supabase instance and session available to all pages
  context.locals.supabase = supabase;
  
  // Custom logic: if there is a session, fetch our own user profile
  if (session) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    context.locals.user = userProfile;
  } else {
    context.locals.user = null;
  }
  
  return next();
});