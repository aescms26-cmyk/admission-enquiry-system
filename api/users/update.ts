import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, email, name, role, teamLeadId, assignedCourses, adminId, mobileNo, photoURL, userId } = req.body;

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

    // Update user in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(uid, {
      email: email || undefined,
      user_metadata: { name, role }
    });

    if (authError) throw authError;

    const updateData: any = {
      name,
      email,
      role,
      team_lead_id: teamLeadId || null,
      assigned_courses: assignedCourses || [],
      mobile_no: mobileNo || null,
      photo_url: photoURL || null
    };

    if (userId) {
      updateData.user_id = userId;
    }

    const { error: dbError } = await supabase.from('users').update(updateData).eq('id', uid);
    if (dbError) throw dbError;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
}
