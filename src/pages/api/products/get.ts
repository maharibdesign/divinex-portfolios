import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// This is the definitive endpoint for GET requests to /api/products/get
export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If Supabase returns an error, log it and throw it
      console.error('Supabase error:', error.message);
      throw new Error(error.message);
    }

    // If successful, return the data
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Catch any other unexpected errors
    const error = e as Error;
    console.error('Caught server error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};