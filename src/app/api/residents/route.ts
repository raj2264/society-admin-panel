import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing service role key' },
        { status: 500 }
      );
    }

    const data = await request.json();
    const { email, password, name, unit_number, phone, society_id } = data;
    
    if (!email || !password || !name || !unit_number || !society_id) {
      return NextResponse.json(
        { error: 'Required fields missing: name, email, unit_number, password, and society_id are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let userId: string;
    let isNewUser = true;

    // 1. Create auth user — email_confirm:true means no verification email needed
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // No email confirmation required
      user_metadata: {
        role: 'resident',
        name
      }
    });

    if (authError) {
      // Handle "user already exists" — reuse their account
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        console.log('User already exists, checking for existing resident record...');
        
        const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          return NextResponse.json({ error: 'Failed to look up existing user' }, { status: 500 });
        }

        const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
        if (!existingUser) {
          return NextResponse.json({ error: 'User exists but could not be found' }, { status: 500 });
        }

        // Check if already a resident in this society
        const { data: existingResident } = await supabaseAdmin
          .from('residents')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('society_id', society_id)
          .maybeSingle();

        if (existingResident) {
          return NextResponse.json(
            { error: 'This email is already registered as a resident in this society' },
            { status: 400 }
          );
        }

        // Update password so the admin-set password works
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: { ...existingUser.user_metadata, role: 'resident', name }
        });

        userId = existingUser.id;
        isNewUser = false;
      } else {
        console.error('Auth error:', authError);
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      if (!authData?.user) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
      userId = authData.user.id;
    }

    // 2. Add resident to the residents table
    const { data: residentData, error: residentError } = await supabaseAdmin
      .from('residents')
      .insert({
        user_id: userId,
        society_id,
        name,
        email: normalizedEmail,
        unit_number,
        phone: phone || '',
        status: 'active'
      })
      .select()
      .single();

    if (residentError) {
      console.error('Resident creation error:', residentError);
      // Clean up auth user only if we just created it
      if (isNewUser) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (deleteError) {
          console.error('Failed to delete auth user after error:', deleteError);
        }
      }
      return NextResponse.json({ error: residentError.message }, { status: 500 });
    }

    return NextResponse.json({ data: residentData });
  } catch (error) {
    console.error('Unexpected error in resident creation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT — Reset a resident's password back to their phone number
export async function PUT(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing service role key' },
        { status: 500 }
      );
    }

    const data = await request.json();
    const { resident_id, action } = data;

    if (action !== 'reset_password') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!resident_id) {
      return NextResponse.json({ error: 'resident_id is required' }, { status: 400 });
    }

    // Fetch the resident to get their phone number and user_id
    const { data: resident, error: fetchError } = await supabaseAdmin
      .from('residents')
      .select('user_id, phone, name, email')
      .eq('id', resident_id)
      .single();

    if (fetchError || !resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    if (!resident.phone) {
      return NextResponse.json(
        { error: 'Cannot reset password: this resident has no phone number on file. Please update their phone number first.' },
        { status: 400 }
      );
    }

    // Reset password to the phone number via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(resident.user_id, {
      password: resident.phone,
      user_metadata: { password_changed: false },
    });

    if (updateError) {
      console.error('Password reset error:', updateError);
      return NextResponse.json({ error: 'Failed to reset password: ' + updateError.message }, { status: 500 });
    }

    // Also update the residents table (best effort)
    await supabaseAdmin
      .from('residents')
      .update({ password_changed: false })
      .eq('id', resident_id);

    return NextResponse.json({
      success: true,
      message: `Password for ${resident.name} has been reset to their phone number (${resident.phone}).`,
    });
  } catch (error) {
    console.error('Unexpected error in password reset:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}