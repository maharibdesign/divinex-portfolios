import type { APIRoute } from 'astro';
import jwt from '@tsndr/cloudflare-worker-jwt';

// A more robust and direct validation function
async function validateTelegramData(initData: string, botToken: string): Promise<any> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  const dataToCheck: string[] = [];
  for (const [key, value] of urlParams.entries()) {
    if (key !== 'hash') {
      dataToCheck.push(`${key}=${value}`);
    }
  }

  // The data must be sorted alphabetically by key
  dataToCheck.sort();
  const dataCheckString = dataToCheck.join('\n');

  // Import the bot token as a cryptographic key
  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const hmacKey = await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(botToken));
  const signingKey = await crypto.subtle.importKey(
    "raw",
    hmacKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the data string
  const signature = await crypto.subtle.sign("HMAC", signingKey, new TextEncoder().encode(dataCheckString));
  
  // Convert the signature to a hex string
  const hexSignature = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (hexSignature === hash) {
    const user = JSON.parse(urlParams.get('user') || '{}');
    if (user && user.id) {
        return user;
    }
  }

  throw new Error('Invalid Telegram data hash');
}


export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const { supabase } = locals;
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  const jwtSecret = import.meta.env.SUPABASE_JWT_SECRET;

  if (!botToken || !jwtSecret) {
    return new Response('Server configuration error: Missing secrets.', { status: 500 });
  }

  try {
    const { initData } = await request.json();
    if (!initData) {
      return new Response('initData is required.', { status: 400 });
    }

    const telegramUser = await validateTelegramData(initData, botToken);
    
    const customJwt = await jwt.sign({
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        sub: telegramUser.id.toString(),
        user_metadata: {
            full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
            avatar_url: telegramUser.photo_url
        },
        role: 'authenticated',
    }, jwtSecret);

    const { error } = await supabase.auth.signInWithIdToken({
        provider: 'jwt',
        token: customJwt,
    });

    if (error) throw error;
    
    return new Response(JSON.stringify({ message: 'Authentication successful' }), { status: 200 });

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
  }
};