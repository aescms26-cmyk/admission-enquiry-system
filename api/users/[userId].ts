import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  const { adminId } = req.body;

  try {
    // Verify requester is admin
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', adminId)
      .single();

    if (adminError || (adminData.role !== 'admin' && adminData.email !== 'aescms26@gmail.com')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete from Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId as string);
    if (authError) throw authError;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
}
