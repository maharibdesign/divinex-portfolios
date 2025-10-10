import type { APIRoute } from 'astro';
import { validate } from '@tma.js/init-data-node';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { supabase } from '@/lib/supabase-server';

export const POST: APIRoute = async ({ request, cookies }) => {
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  const sessionSecret = import.meta.env.SESSION_SECRET;

  if (!botToken || !sessionSecret) {
    return new Response(JSON.stringify({ error: 'Server config error.' }), { status: 500 });
  }

  try {
    const { initData } = await request.json();
    if (!initData) throw new Error('initData is required.');

    // 1. Validate with the new, correct library
    validate(initData, botToken, { expiresIn: 3600 });
    const urlParams = new URLSearchParams(initData);
    const telegramUser = JSON.parse(urlParams.get('user') || '{}');
    const telegramId = telegramUser.id;

    // 2. Upsert the user
    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        telegram_id: telegramId,
        full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
        telegram_username: telegramUser.username,
      }, { onConflict: 'telegram_id' })
      .select()
      .single();
    
    if (upsertError) throw upsertError;

    // 3. Create and set session token
    const sessionToken = await jwt.sign({ sub: profile.id.toString() }, sessionSecret);
    cookies.set('session-token', sessionToken, {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
    });

    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};