import type { APIRoute } from 'astro';
import { createHmac } from 'crypto';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// Validation function is correct and remains.
function validateTelegramData(initData: string, botToken: string): any { /* ... */ }

export const POST: APIRoute = async ({ request, cookies }) => {
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;
  const sessionSecret = import.meta.env.SESSION_SECRET;

  if (!botToken || !supabaseUrl || !serviceKey || !sessionSecret) {
    return new Response('Server configuration error.', { status: 500 });
  }

  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey);

  try {
    const { initData } = await request.json();
    if (!initData) { return new Response('initData required.', { status: 400 }); }

    const telegramUser = validateTelegramData(initData, botToken);
    const telegramId = telegramUser.id;

    // --- THE DEFINITIVE FIX ---
    
    // 1. Check if a profile with this Telegram ID already exists.
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (!profile) {
      // USER IS NEW. We must first create a "shadow" user in Supabase Auth to get a UUID,
      // then create our profile linked to it.
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: `${telegramId}@telegram.user`, // Still need a unique email
        email_confirm: true,
      });
      if (createUserError) throw createUserError;

      // Now, insert into our public profiles table, linking the two.
      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id, // Link to the auth user
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

    // 2. We now have a guaranteed valid profile. Create OUR custom session token.
    const sessionToken = await jwt.sign({
      sub: profile.id, // The subject of our token is now the Supabase UUID (profile.id)
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
    }, sessionSecret);

    // 3. Set the token as a secure cookie.
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