import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.json();
    const { id, title, description, category, price, image, images } = formData;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Product ID is required for an update' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('products')
      .update({ title, description, category, price, image, images })
      .eq('id', id)
      .select()
      .single();

    if (error) { throw error; }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error('Update API Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};