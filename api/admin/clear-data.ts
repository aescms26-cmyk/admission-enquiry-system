import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adminId } = req.body;

  try {
    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }

    // Verify requester is admin
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', adminId)
      .single();

    if (adminError || (adminData.role !== 'admin' && adminData.email !== 'aescms26@gmail.com')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // 1. Delete all enquiries
    await supabase.from('enquiries').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Delete all courses
    await supabase.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Delete all users except the current admin and the bootstrap admin
    const { data: users } = await supabase.from('users').select('id, email');
    if (users) {
      for (const u of users) {
        if (u.id !== adminId && u.email !== 'aescms26@gmail.com') {
          await supabase.auth.admin.deleteUser(u.id);
        }
      }
    }

    res.json({ success: true, message: 'System data cleared successfully' });
  } catch (error: any) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: error.message });
  }
}
