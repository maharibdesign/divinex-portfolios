import type { APIRoute } from 'astro';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createHmac } from 'crypto';

function validateTelegramData(initData: string, botToken: string): any {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  const dataToCheck: string[] = [];
  for (const [key, value] of urlParams.entries()) {
    if (key !== 'hash') { dataToCheck.push(`${key}=${value}`); }
  }
  dataToCheck.sort();
  const dataCheckString = dataToCheck.join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const signature = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (signature === hash) {
    const user = JSON.parse(urlParams.get('user') || '{}');
    if (user && user.id) { return user; }
  }
  throw new Error('Invalid Telegram data hash');
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  const jwtSecret = import.meta.env.SUPABASE_JWT_SECRET;

  if (!botToken || !jwtSecret) {
    return new Response('Server config error', { status: 500 });
  }

  try {
    const { initData } = await request.json();
    if (!initData) {
      return new Response('initData required', { status: 400 });
    }

    const telegramUser = validateTelegramData(initData, botToken);
    
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
    
    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 401 });
  }
};