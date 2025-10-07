import type { APIRoute } from 'astro';

// The 'context' object contains 'url', 'cookies', 'redirect', and 'locals'
export const GET: APIRoute = async ({ url, redirect, locals }) => {
  const authCode = url.searchParams.get('code');

  // If we have an authorization code, we exchange it for a session
  if (authCode) {
    // !!! THIS IS THE FIX !!!
    // We get the 'supabase' instance from 'locals', which was set by our middleware.
    const { supabase } = locals;
    
    // Exchange the code for a user session
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);

    if (error) {
      console.error('Error exchanging code for session:', error.message);
      // You might want to redirect to an error page here in a real app
      return redirect('/login?error=auth-failed');
    }
  }

  // After exchanging the code (or if there was no code),
  // redirect the user to the homepage. The session cookie is now set.
  return redirect('/');
};