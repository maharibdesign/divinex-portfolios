import type { APIRoute } from 'astro';
import { validate } from '@telegram-apps/init-data-node';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

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
    if (!initData) { return new Response('initData is required.', { status: 400 }); }

    // 1. Validate initData using the official library.
    validate(initData, botToken, { expiresIn: 3600 }); // Expires in 1 hour

    // 2. Validation passed. Parse the user data.
    const urlParams = new URLSearchParams(initData);
    const telegramUser = JSON.parse(urlParams.get('user') || '{}');
    const telegramId = telegramUser.id;

    // 3. "Upsert" the user in our 'profiles' table.
    const { data: profile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        telegram_id: telegramId,
        full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
        telegram_username: telegramUser.username,
        // Only update avatar on first creation, don't overwrite user's custom one
        avatar_url: telegramUser.photo_url,
      }, { onConflict: 'telegram_id', ignoreDuplicates: false })
      .select()
      .single();
    
    if (upsertError) throw upsertError;

    // 4. Create our custom session token (JWT).
    const sessionToken = await jwt.sign({
      sub: profile.id.toString(), // The subject is our profile's primary key ID
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    }, sessionSecret);

    // 5. Set the token as a secure, HttpOnly cookie.
    cookies.set('session-token', sessionToken, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
    });

    return new Response(JSON.stringify({ message: 'Authentication successful' }), { status: 200 });

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 401 });
  }
};