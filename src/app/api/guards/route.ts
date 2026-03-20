import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

// GET endpoint to fetch guards
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const societyId = url.searchParams.get('societyId');

    if (!societyId) {
      return NextResponse.json(
        { error: 'Society ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('guards')
      .select('*')
      .eq('society_id', societyId)
      .order('name');

    if (error) {
      console.error('Error fetching guards:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in guards API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a guard
export async function POST(request: Request) {
  try {
    const { name, email, phone, societyId, password } = await request.json();

    // Validation
    if (!name || !email || !societyId || !password) {
      return NextResponse.json(
        { error: 'Name, email, society ID, and password are required' },
        { status: 400 }
      );
    }

    // Check if society exists
    const { data: societyData, error: societyError } = await supabase
      .from('societies')
      .select('id')
      .eq('id', societyId)
      .single();

    if (societyError || !societyData) {
      return NextResponse.json(
        { error: 'Invalid society ID' },
        { status: 400 }
      );
    }

    // Create user in auth
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (userError) {
      console.error('Error creating guard auth user:', userError);
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    // Create guard record in the database
    const { data: guardData, error: guardError } = await supabase
      .from('guards')
      .insert({
        user_id: userData.user.id,
        society_id: societyId,
        name,
        email,
        phone: phone || null,
        status: 'active',
      })
      .select()
      .single();

    if (guardError) {
      console.error('Error creating guard record:', guardError);
      
      // Clean up the created user if guard record creation fails
      await supabase.auth.admin.deleteUser(userData.user.id);
      
      return NextResponse.json(
        { error: guardError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      data: guardData,
      message: 'Guard successfully registered'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in guards API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 