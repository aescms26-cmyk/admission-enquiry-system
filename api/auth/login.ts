import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, name } = req.body;

  try {
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${name}%`)
      .single();

    if (dbError || !userData) {
      return res.status(401).json({ error: 'Invalid User ID or Name' });
    }

    res.json({ success: true, user: userData });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
}
