import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminEmail = 'aescms26@gmail.com';
    const adminName = 'Admin User';
    const adminPassword = 'Admin@KRMU2026';

    console.log('Starting bootstrap process...');

    // Check if admin already exists in Auth
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Auth listUsers error:', listError);
      throw listError;
    }

    let adminAuthUser = (listData.users as any[]).find(u => u.email === adminEmail);

    if (!adminAuthUser) {
      console.log('Admin user not found in Auth, creating...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: adminName, role: 'admin' }
      });
      if (createError) {
        console.error('Auth createUser error:', createError);
        throw createError;
      }
      adminAuthUser = newUser.user;
    } else {
      console.log('Admin user already exists in Auth.');
    }

    if (!adminAuthUser) {
      throw new Error('Failed to retrieve admin user after creation/check.');
    }

    // Upsert into public users table
    console.log('Upserting admin into public.users table...');
    const { error: upsertError } = await supabase.from('users').upsert([{
      id: adminAuthUser.id,
      user_id: '1001',
      name: adminName,
      email: adminEmail,
      role: 'admin',
      mobile_no: '+91 0000000000',
      photo_url: `https://ui-avatars.com/api/?name=Admin&background=D32F2F&color=fff`
    }], { onConflict: 'id' });

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      if (upsertError.message.includes('column "user_id" of relation "users" does not exist') ||
        upsertError.message.includes('user_id')) {
        return res.status(500).json({
          error: 'Database schema mismatch. Please run the SQL script in your Supabase SQL Editor to add the "user_id" column to the "users" table.',
          details: upsertError.message
        });
      }
      throw upsertError;
    }

    console.log('Bootstrap successful.');
    res.json({ success: true, message: 'Admin account bootstrapped successfully. You can now log in.' });
  } catch (error: any) {
    console.error('Bootstrap failed:', error);
    res.status(500).json({ error: error.message || 'Unknown error during bootstrap' });
  }
}
