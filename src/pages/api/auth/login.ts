import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return new Response("Email and password are required", { status: 400 });
  }

  const { supabase } = locals;
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Redirect back to login with an error message
    return redirect('/login?error=Invalid credentials');
  }

  // On success, the cookie is set, and we redirect to the homepage.
  return redirect('/');
};