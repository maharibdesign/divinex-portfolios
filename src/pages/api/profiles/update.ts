import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  // TypeScript now knows locals.supabase and locals.user exist
  const { supabase, user } = locals;

  // This is a protected endpoint.
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const profileData = await request.json();

    // The RLS policy on the database is the ultimate security layer,
    // but we can also check here for safety.
    // We update the profile where the telegram_id matches the logged-in user's ID.
    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('telegram_id', user.telegram_id);
      
    if (error) throw error;

    return new Response(JSON.stringify({ message: 'Profile updated successfully' }), { status: 200 });

  } catch (err) {
    const error = err as Error;
    console.error("Update Profile Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};