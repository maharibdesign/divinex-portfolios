import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// This handles POST requests to /api/products/update
export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.json();
    const { id, title, description, category, price, image, images } = formData;

    // We need an ID to know which product to update
    if (!id) {
      return new Response(JSON.stringify({ error: 'Product ID is required for an update' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('products')
      .update({ title, description, category, price, image, images })
      .eq('id', id) // only update the row where the id matches
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};