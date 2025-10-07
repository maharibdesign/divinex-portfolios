import type { APIRoute } from 'astro';
import jwt from '@tsndr/cloudflare-worker-jwt';

// Cryptographically validates the initData string from Telegram
async function validateTelegramData(initData: string, botToken: string): Promise<any> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataToCheck = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = await crypto.subtle.importKey('raw', new TextEncoder().encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const botTokenKey = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));
  const signingKey = await crypto.subtle.importKey('raw', botTokenKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(dataToCheck));
  
  const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (hexSignature === hash) {
    return JSON.parse(urlParams.get('user') || '{}');
  }
  throw new Error('Invalid Telegram data hash');
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const { supabase } = locals;
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  const jwtSecret = import.meta.env.SUPABASE_JWT_SECRET;

  if (!botToken || !jwtSecret) {
    return new Response('Server configuration error.', { status: 500 });
  }

  try {
    const { initData } = await request.json();
    if (!initData) {
      return new Response('initData is required.', { status: 400 });
    }

    const telegramUser = await validateTelegramData(initData, botToken);
    
    // Create a custom JWT that Supabase will accept
    const customJwt = await jwt.sign({
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expires in 1 hour
        sub: telegramUser.id.toString(), // The user's Telegram ID is the unique subject
        user_metadata: {
            full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
            avatar_url: telegramUser.photo_url // We can pre-fill their TG photo
        },
        role: 'authenticated',
    }, jwtSecret);

    // Sign in to Supabase with our custom token
    const { error } = await supabase.auth.signInWithIdToken({
        provider: 'jwt',
        token: customJwt,
    });

    if (error) throw error;
    
    // On success, we don't redirect. We send a success message.
    // The client will handle the redirect.
    return new Response(JSON.stringify({ message: 'Authentication successful' }), { status: 200 });

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
  }
};