import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: 'ok', userCount: data });
  } catch (error: any) {
    console.error('Supabase Health Check failed:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}
