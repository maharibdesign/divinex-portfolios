import { defineMiddleware } from 'astro:middleware';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_KEY
  );

  const sessionCookie = context.cookies.get('sb-session')?.value;
  const sessionSecret = import.meta.env.SESSION_SECRET;

  context.locals.user = null;

  if (sessionCookie && sessionSecret) {
    try {
      // 1. Verify the JWT
      const payload = await jwt.verify(sessionCookie, sessionSecret);
      
      // 2. !!! THIS IS THE DEFINITIVE FIX !!!
      //    We perform a type-safe check to see if 'sub' exists on the payload object.
      //    This is the correct way to handle an unknown object shape.
      // Use a type guard to check for 'sub' property
      if (
        payload &&
        typeof payload === 'object' &&
        payload !== null &&
        'sub' in payload &&
        typeof (payload as { sub: unknown }).sub === 'string'
      ) {
        const sub = (payload as { sub: string }).sub;

        // 3. If 'sub' exists and is a string, fetch the user profile.
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sub) // We can now safely use sub
          .single();

        if (userProfile) {
          context.locals.user = userProfile;
        }
      } else {
        // The token is valid but doesn't have the data we need. Treat as invalid.
        throw new Error("Token missing 'sub' claim.");
      }
    } catch (e) {
      // Token is invalid, expired, or malformed.
      context.cookies.delete('sb-session', { path: '/' });
      console.log("Invalid session token:", (e as Error).message);
    }
  }
  
  return next();
});