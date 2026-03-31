import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, duration } = req.body;

  try {
    const { error } = await supabase
      .from('users')
      .update({ break_duration_mins: duration })
      .eq('id', userId);

    if (error) {
      console.error('Supabase error updating break duration:', error);
      if (error.message.includes('column') && error.message.includes('not found')) {
        const sqlRepair = `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS on_break BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS break_start_time TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS break_duration_mins INTEGER DEFAULT 30;`;

        return res.status(500).json({
          error: 'Database schema mismatch. Please run the following SQL in your Supabase SQL Editor:',
          sql: sqlRepair,
          details: error.message
        });
      }
      throw error;
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating break duration:', error);
    res.status(500).json({ error: error.message || 'Unknown error updating break duration' });
  }
}
