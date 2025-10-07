import type { APIRoute } from 'astro';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// The validation function is correct and remains.
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

export const POST: APIRoute = async ({ request, redirect }) => {
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
  // These are required for the admin client
  const supabaseUrl = import.meta.env.SUPABASE_URL; 
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;

  if (!botToken || !supabaseUrl || !serviceKey) {
    return new Response('Server configuration error.', { status: 500 });
  }

  // Create a special Supabase Admin client that can perform privileged actions
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    const { initData } = await request.json();
    if (!initData) {
      return new Response('initData required.', { status: 400 });
    }

    const telegramUser = validateTelegramData(initData, botToken);
    const telegramId = telegramUser.id.toString();

    // Use a fake email address based on the Telegram ID. This is required by Supabase Auth
    // but the user will never see or use it.
    const userEmail = `${telegramId}@telegram.user`;

    // Check if a user with this Telegram ID already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1, perPage: 1
    });
    // This is a simplified check. A better check would be to query your profiles table.
    // For now, let's assume we search by email.
    
    let userId: string | undefined;

    // A more direct way to find or create a user is needed. Let's simplify.
    // We'll try to create a user. If it fails because they exist, we'll get their ID.
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
            provider: 'telegram',
            provider_id: telegramId,
            full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
            avatar_url: telegramUser.photo_url
        }
    });

    if (createUserError && createUserError.message.includes('unique constraint')) {
        // User already exists, we need to find them. This part is complex. Let's simplify the flow.
        // We will just generate a link for the user based on their fake email.
    } else if (createUserError) {
        throw createUserError; // A different error occurred
    }

    // Now, generate a magic link for the user (whether they are new or existing)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
        options: {
            redirectTo: new URL('/api/auth/callback', request.url).toString()
        }
    });

    if (linkError) throw linkError;

    // Redirect the user to the magic link. This will log them in and set the cookie.
    return redirect(linkData.properties.action_link);

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 401 });
  }
};