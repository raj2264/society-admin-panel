import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

async function fixAdminAccounts() {
  try {
    console.log('Starting admin account fix process...');

    // 1. First, run the SQL function to create missing auth users
    const { error: sqlError } = await supabase.rpc('fix_missing_auth_users');
    if (sqlError) {
      throw new Error(`Error running fix_missing_auth_users: ${sqlError.message}`);
    }
    console.log('Successfully ran fix_missing_auth_users function');

    // 2. Get all admins that were just fixed
    const { data: fixedAdmins, error: fetchError } = await supabase
      .from('society_admins')
      .select('email, name')
      .order('email');

    if (fetchError) {
      throw new Error(`Error fetching fixed admins: ${fetchError.message}`);
    }

    // 3. Send password reset emails to all fixed admins
    for (const admin of fixedAdmins) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        admin.email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
        }
      );

      if (resetError) {
        console.error(`Error sending reset email to ${admin.email}:`, resetError);
        continue;
      }

      console.log(`Sent password reset email to ${admin.email}`);
    }

    console.log('\nFix process completed!');
    console.log('\nSummary:');
    console.log(`- Total admins processed: ${fixedAdmins.length}`);
    console.log('\nNext steps:');
    console.log('1. All admins have been sent password reset emails');
    console.log('2. They should check their email and click the reset link');
    console.log('3. They will be taken to the reset password page');
    console.log('4. After setting their password, they can log in normally');

  } catch (error) {
    console.error('Error in fix process:', error);
    process.exit(1);
  }
}

// Run the fix
fixAdminAccounts(); 