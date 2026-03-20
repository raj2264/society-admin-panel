import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // Fetch all societies to find valid IDs
    const { data, error } = await supabase
      .from('societies')
      .select('id, name')
      .limit(10);
    
    if (error) {
      console.error('Error fetching societies:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in societies API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, address } = await request.json();
    
    if (!name || !address) {
      return NextResponse.json(
        { error: 'Society name and address are required' },
        { status: 400 }
      );
    }

    // Create a new society
    const { data: societyData, error: societyError } = await supabase
      .from('societies')
      .insert({
        name: name.trim(),
        address: address.trim(),
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      })
      .select()
      .single();

    if (societyError) {
      console.error('Error creating society:', societyError);
      return NextResponse.json(
        { error: societyError.message },
        { status: 500 }
      );
    }

    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Add the current user as a society admin
    const { data: adminData, error: adminError } = await supabase
      .from('society_admins')
      .insert({
        user_id: session.user.id,
        society_id: societyData.id,
        username: session.user.email?.split('@')[0] || 'admin'
      })
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin:', adminError);
      // Clean up the created society
      await supabase
        .from('societies')
        .delete()
        .eq('id', societyData.id);
      
      return NextResponse.json(
        { error: adminError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Society created and admin added successfully',
      society: societyData,
      admin: adminData
    });
  } catch (error) {
    console.error('Error in societies POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 