import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get('code');

  // If Supabase sends back a code, we exchange it for a session.
  if (code) {
    // TypeScript now knows 'locals.supabase' exists, thanks to env.d.ts
    const { supabase } = locals;
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error.message);
      return redirect('/?error=authentication-failed');
    }
  }

  // After the code exchange, or if no code was present,
  // redirect to the homepage. The session cookie is now set.
  return redirect('/');
};