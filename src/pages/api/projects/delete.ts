import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'Project ID is required' }), { status: 400 });
  
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
};