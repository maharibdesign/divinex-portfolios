import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { v4 as uuidv4 } from 'uuid'; // We'll use UUIDs for unique filenames

export const POST: APIRoute = async ({ request }) => {
  // For now, this endpoint is open. In a real app, you would add admin auth here.

  try {
    const file = await request.blob();
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded.' }), { status: 400 });
    }

    // Generate a unique filename to prevent overwrites
    const fileExtension = file.type.split('/')[1];
    const fileName = `${uuidv4()}.${fileExtension}`;

    const { data, error: uploadError } = await supabase.storage
      .from('product-images') // The bucket name we created
      .upload(fileName, file, {
        cacheControl: '3600', // Cache for 1 hour
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage Error: ${uploadError.message}`);
    }

    // If upload is successful, get the public URL for the file
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    if (!urlData.publicUrl) {
        throw new Error('Could not get public URL for the uploaded file.');
    }

    // Return the public URL to the frontend
    return new Response(JSON.stringify({ url: urlData.publicUrl }), { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error('Upload API Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};