import { defineMiddleware } from 'astro:middleware';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from './lib/database.types';

export const onRequest = defineMiddleware(async (context, next) => {
  // This client is used for all server-side operations
  const supabase = createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key: string) { return context.cookies.get(key)?.value; },
        set(key: string, value: string, options: CookieOptions) { context.cookies.set(key, value, options); },
        remove(key: string, options: CookieOptions) { context.cookies.delete(key, options); },
      },
    }
  );
  context.locals.supabase = supabase; // Make supabase client available on all pages

  // Our custom session logic
  const sessionCookie = context.cookies.get('session-token')?.value;
  const sessionSecret = import.meta.env.SESSION_SECRET;
  
  context.locals.user = null;

  if (sessionCookie && sessionSecret) {
    try {
      const payload = await jwt.verify(sessionCookie, sessionSecret);
      
      // The definitive, safe way to check the payload
      if (payload && typeof payload.payload.sub === 'string') {
        const profileId = parseInt(payload.payload.sub, 10);
        
        if (!isNaN(profileId)) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();
          
          if (userProfile) {
            context.locals.user = userProfile;
          }
        }
      }
    } catch (e) {
      context.cookies.delete('session-token', { path: '/' });
    }
  }
  
  return next();
});