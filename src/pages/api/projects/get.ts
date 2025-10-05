import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// This endpoint handles GET requests to /api/projects/get
export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      // Order by 'created_at' to show the newest projects first
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const error = err as Error;
    console.error('API Error fetching projects:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};