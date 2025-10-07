import type { APIRoute } from 'astro';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createHmac } from 'crypto';

// A new, simpler, and more robust validation function using Node.js crypto
function validateTelegramData(initData: string, botToken: string): any {
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

  // Step 1: Create the secret key from the bot token
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  
  // Step 2: Sign the data string with the secret key
  const signature = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Step 3: Compare the generated signature with the hash from Telegram
  if (signature === hash) {
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

    const telegramUser = validateTelegramData(initData, botToken);
    
    // Create a custom JWT for Supabase
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

    // Sign in to Supabase with the custom token
    const { error } = await supabase.auth.signInWithIdToken({
        provider: 'jwt',
        token: customJwt,
    });

    if (error) throw error;
    
    // On success, send a success message.
    return new Response(JSON.stringify({ message: 'Authentication successful' }), { status: 200 });

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
  }
};