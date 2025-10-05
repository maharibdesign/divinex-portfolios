import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.json();
  const { id, ...updateData } = formData;
  if (!id) return new Response(JSON.stringify({ error: 'Project ID is required' }), { status: 400 });
  
  const { error } = await supabase.from('projects').update(updateData).eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
};