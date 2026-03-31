import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, name, role, teamLeadId, assignedCourses, adminId, mobileNo, photoURL, userId } = req.body;

  console.log(`Attempting to create user: ${email} (Role: ${role}) by Admin: ${adminId}`);

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

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) throw authError;

    let nextUserId = userId;

    if (!nextUserId) {
      const { data: maxUser } = await supabase
        .from('users')
        .select('user_id')
        .order('user_id', { ascending: false })
        .limit(1)
        .single();

      let nextUserIdNum = 1001;
      if (maxUser && maxUser.user_id) {
        const currentMax = parseInt(maxUser.user_id);
        if (!isNaN(currentMax)) {
          nextUserIdNum = currentMax + 1;
        }
      }
      nextUserId = nextUserIdNum.toString();
    }

    const userData = {
      id: authUser.user.id,
      user_id: nextUserId,
      name,
      email,
      role,
      team_lead_id: teamLeadId || null,
      assigned_courses: assignedCourses || [],
      mobile_no: mobileNo || null,
      photo_url: photoURL || null
    };

    const { error: dbError } = await supabase.from('users').upsert([userData], { onConflict: 'id' });
    if (dbError) {
      console.error('Supabase DB error creating user:', dbError);
      if (dbError.message.includes('check constraint') || dbError.message.includes('invalid input value for enum')) {
        return res.status(500).json({
          error: 'Database role constraint violation. Please run the SQL script in Supabase to add the "front_office" role.',
          details: dbError.message
        });
      }
      throw dbError;
    }

    console.log('User created successfully:', userData.email);
    res.json({ success: true, user: userData });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
}
