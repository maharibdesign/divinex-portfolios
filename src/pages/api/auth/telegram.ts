import type { APIRoute } from 'astro';
import jwt from '@tsndr/cloudflare-worker-jwt';

// Helper function to validate the Telegram initData
async function validateTelegramData(initData: string, botToken: string): Promise<any> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataToCheck = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Step 1: Create the initial secret key from "WebAppData"
  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Step 2: Create the HMAC key from the Bot Token
  const botTokenKey = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));

  // !!! THIS IS THE FIX !!!
  // Step 3: Import the result of Step 2 into a new CryptoKey that can be used for signing
  const signingKey = await crypto.subtle.importKey(
    'raw',
    botTokenKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Step 4: Sign the data to be checked with the final key
  const signature = await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(dataToCheck));
  
  // Step 5: Convert the signature to a hex string for comparison
  const hexSignature = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

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
    return new Response('Server configuration error: Missing secrets.', { status: 500 });
  }

  try {
    const { initData } = await request.json();
    if (!initData) {
      return new Response('initData is required.', { status: 400 });
    }

    const telegramUser = await validateTelegramData(initData, botToken);
    
    // Create a custom JWT for Supabase
    const customJwt = await jwt.sign({
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
        sub: telegramUser.id.toString(),
        user_metadata: {
            full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
            avatar_url: telegramUser.photo_url
        },
        role: 'authenticated',
    }, jwtSecret);

    // Sign in to Supabase with the custom token
    const { error } = await supabase.auth.signInWithIdToken({
        provider: 'jwt',
        token: customJwt,
    });

    if (error) throw error;
    
    // On success, redirect to the homepage. The session is now set.
    return redirect('/');

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return redirect('/login?error=Authentication failed'); // Keep a login page for error display
  }
};