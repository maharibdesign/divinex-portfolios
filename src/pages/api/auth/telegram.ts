import type { APIRoute } from 'astro';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// The validation function is correct and remains unchanged.
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
    const telegramId = telegramUser.id.toString();
    const userEmail = `${telegramId}@telegram.user`; // Unique, predictable email

    // --- THIS IS THE DEFINITIVE FIX ---
    
    // 1. Use listUsers with a filter to find if the user exists. This is the correct method.
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      // email: userEmail, This is the line causing the error, it's not a valid filter. We must fetch and then filter.
      page: 1,
      perPage: 1
    });
    // Let's correct the logic to find the user properly.

    // A better approach is to query our own profiles table.
    let { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('telegram_id', telegramId).single();

    if (!profile) {
      // User is NEW. We must first create a "shadow" user in Supabase Auth to get a UUID,
      // then create our profile linked to it.
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: { 
            full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
            provider_id: telegramId
          }
      });
      if (createUserError) {
        // This likely means the user exists in auth but not in profiles (a failed previous attempt)
        // Let's find that user
        const { data: { users: foundUsers }, error: findErr } = await supabaseAdmin.auth.admin.listUsers();
        if (findErr) throw findErr;
        const existingUser = foundUsers.find(u => u.email === userEmail);
        if (!existingUser) throw new Error("Failed to create or find user.");

        const { data: newProfile, error: profileError } = await supabaseAdmin.from('profiles').insert({ id: existingUser.id, telegram_id: telegramId }).select().single();
        if (profileError) throw profileError;
        profile = newProfile;
      } else {
        // The trigger should have created the profile, let's fetch it.
        const { data: newProfile, error: fetchError } = await supabaseAdmin.from('profiles').select('*').eq('id', newUser.user.id).single();
        if (fetchError) throw fetchError;
        profile = newProfile;
      }
    }
    
    if (!profile) throw new Error("Could not get or create a profile.");

    // 2. We now have a guaranteed valid user object. Generate the magic link for them.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail, // We still need the email for the link generation
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