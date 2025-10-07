import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const fullName = formData.get('full_name')?.toString();

  if (!email || !password || !fullName) {
    return redirect('/signup?error=Email, password, and name are required');
  }

  const { supabase } = locals;
  const emailRedirectTo = new URL('/api/auth/callback', request.url).toString();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo,
    }
  });

  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  return redirect('/login?message=Account created successfully! Please log in.');
};