import type { APIRoute } from 'astro';

// The context object (first parameter) contains locals, cookies, redirect, etc.
export const POST: APIRoute = async ({ locals, redirect }) => {
  // We get the supabase instance from the context.locals object
  const { supabase } = locals;

  // Sign out the user
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error signing out:", error.message);
    // Even if there's an error, we try to redirect.
    // A better implementation might show an error page.
  }
  
  // Redirect to the homepage after signing out
  return redirect('/');
};