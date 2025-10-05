import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.json();
  const { error } = await supabase.from('projects').insert([formData]);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ message: 'Success' }), { status: 201 });
};