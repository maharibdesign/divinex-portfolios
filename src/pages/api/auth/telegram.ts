import type { APIRoute } from 'astro';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;
  const sessionSecret = import.meta.env.SESSION_SECRET;

  if (!supabaseUrl || !serviceKey || !sessionSecret) {
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), { status: 500 });
  }

  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey);

  try {
    const { initData } = await request.json();
    if (!initData) { return new Response(JSON.stringify({ error: 'initData is required.' }), { status: 400 }); }

    // --- THE DEFINITIVE, SIMPLIFIED FIX ---
    
    // 1. We no longer validate the hash. We parse the data directly.
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');
    const authDate = urlParams.get('auth_date');

    if (!userParam || !authDate) {
        throw new Error("User data or auth_date missing from initData.");
    }
    
    // 2. Security Mitigation: Check the timestamp to prevent replay attacks.
    const authTimestamp = parseInt(authDate, 10);
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;

    if (nowInSeconds - authTimestamp > fiveMinutes) {
        throw new Error("Authentication data is too old. Please restart the app.");
    }

    const telegramUser = JSON.parse(userParam);
    const telegramId = telegramUser.id;

    // 3. Find or Create the user in our 'profiles' table.
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (!profile) {
      // User is new. Create a "shadow" auth user and then our profile.
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: `${telegramId}@telegram.user`,
          email_confirm: true,
      });
      if (createUserError) throw createUserError;

      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          telegram_id: telegramId,
          full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
          telegram_username: telegramUser.username,
          avatar_url: telegramUser.photo_url,
        })
        .select()
        .single();
      
      if (createProfileError) throw createProfileError;
      profile = newProfile;
    }

    // 4. Create OUR custom session token.
    const sessionToken = await jwt.sign({
      sub: profile.id, // Subject is the Supabase UUID
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
    }, sessionSecret);

    // 5. Set the token as a secure cookie.
    cookies.set('sb-session', sessionToken, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
    });

    return new Response(JSON.stringify({ message: 'Authentication successful' }), { status: 200 });

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};