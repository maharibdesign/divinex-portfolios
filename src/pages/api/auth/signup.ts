import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const fullName = formData.get('full_name')?.toString();

  if (!email || !password || !fullName) {
    return new Response("Email, password, and name are required", { status: 400 });
  }

  const { supabase } = locals;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${new URL(request.url).origin}/api/auth/callback`
    }
  });

  if (error) {
    return redirect(`/signup?error=${error.message}`);
  }

  // Redirect to a page telling the user to check their email (or login if disabled)
  return redirect('/login?message=Account created. Please log in.');
};