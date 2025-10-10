import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase-server'; // A new server client
import { v4 as uuidv4 } from 'uuid';

export const POST: APIRoute = async ({ request }) => {
  try {
    const file = await request.blob();
    const fileExtension = file.type.split('/')[1];
    const fileName = `${uuidv4()}.${fileExtension}`;

    // We now use a new bucket name 'avatars' for better organization
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);

    if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
      
    if (!urlData.publicUrl) throw new Error('Could not get public URL.');

    return new Response(JSON.stringify({ url: urlData.publicUrl }), { status: 200 });
  } catch (err) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};