import type { APIRoute } from 'astro';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// This validation logic is now handled by the SQL function, but we still need to prep the data.
function prepareValidationData(initData: string): { dataCheckString: string; hash: string; user: any } {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) throw new Error("initData is missing hash.");
  
  const dataToCheck: string[] = [];
  urlParams.forEach((value, key) => {
    if (key !== 'hash') {
      dataToCheck.push(`${key}=${value}`);
    }
  });
  dataToCheck.sort();
  const dataCheckString = dataToCheck.join('\n');
  const user = JSON.parse(urlParams.get('user') || '{}');

  return { dataCheckString, hash, user };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;
  const sessionSecret = import.meta.env.SESSION_SECRET;

  if (!botToken || !supabaseUrl || !serviceKey || !sessionSecret) {
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), { status: 500 });
  }

  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey);

  try {
    const { initData } = await request.json();
    if (!initData) { return new Response(JSON.stringify({ error: 'initData required.' }), { status: 400 }); }

    const { dataCheckString, hash, user: telegramUser } = prepareValidationData(initData);
    const telegramId = telegramUser.id;

    // 1. Call our SQL function to validate the hash
    const { data: isValid, error: rpcError } = await supabaseAdmin.rpc('validate_telegram_init_data_simple', {
        data_check_string: dataCheckString,
        hash_to_check: hash,
        bot_token: botToken
    });

    if (rpcError) throw rpcError;
    if (!isValid) throw new Error("Invalid Telegram data hash. Failed validation in DB.");

    // 2. Validation passed. "Upsert" the user in our 'profiles' table.
    // onConflict: 'telegram_id' tells Supabase: if a profile with this telegram_id exists, update it. If not, insert it.
    const { data: profile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        telegram_id: telegramId,
        full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
        telegram_username: telegramUser.username,
        avatar_url: telegramUser.photo_url,
      }, { onConflict: 'telegram_id' })
      .select()
      .single();
    
    if (upsertError) throw upsertError;
    if (!profile) throw new Error("Could not create or find profile after upsert.");


    // 3. Create OUR custom session token
    const sessionToken = await jwt.sign({
      sub: profile.id.toString(), // Subject is our profile table's primary key
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
    }, sessionSecret);

    // 4. Set the token as a secure cookie
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