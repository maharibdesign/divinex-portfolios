import type { APIRoute } from 'astro';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// Validation function is correct and remains.
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
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;

  if (!botToken || !supabaseUrl || !serviceKey) {
    return new Response('Server configuration error.', { status: 500 });
  }

  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey);

  try {
    const { initData } = await request.json();
    if (!initData) { return new Response('initData required.', { status: 400 }); }

    const telegramUser = validateTelegramData(initData, botToken);
    const telegramId = telegramUser.id;
    
    // --- THE DEFINITIVE, UNBREAKABLE FIX ---

    // 1. Check if a profile with this Telegram ID already exists in OUR table.
    let { data: existingProfile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id') // 'id' here is the Supabase auth UUID
      .eq('telegram_id', telegramId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 is the code for "no rows found", which is not an error for us.
      // Any other error should be thrown.
      throw findError;
    }

    let userEmail: string;

    if (!existingProfile) {
      // USER IS NEW. Create them in Supabase Auth.
      const newUserEmail = `${telegramId}@telegram.user`;
      
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: newUserEmail,
          email_confirm: true,
          user_metadata: {
              full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
              provider_id: telegramId, // Store telegram_id in metadata for the trigger
          }
      });
      if (createUserError) throw createUserError;
      userEmail = newUser.user.email!;
    } else {
      // USER EXISTS. We need their email to generate the link.
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
      if (getUserError) throw getUserError;
      userEmail = existingUser.user.email!;
    }
    
    // 2. We now have a guaranteed valid user email. Generate a magic link.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
        options: { redirectTo: new URL('/api/auth/callback', request.url).toString() }
    });

    if (linkError) throw linkError;
    
    // 3. Redirect the client to the magic link to complete the login.
    return redirect(linkData.properties.action_link);

  } catch (err) {
    const error = err as Error;
    console.error('Telegram Auth Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};