import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET handler - Fetch all complaints for a society
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const societyId = searchParams.get("societyId");
    const authHeader = request.headers.get('authorization');
    
    if (!societyId) {
      return NextResponse.json(
        { success: false, error: "Society ID is required" },
        { status: 400 }
      );
    }
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authorization header is required" },
        { status: 401 }
      );
    }
    
    // Extract the token from the header
    const token = authHeader.replace('Bearer ', '');
    
    // Create a supabase client with the user's token
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the user is a society admin
    const { data: adminData, error: adminError } = await supabaseWithAuth
      .from("society_admins")
      .select("society_id")
      .eq("user_id", user.id)
      .eq("society_id", societyId)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { success: false, error: "Not authorized to access this society's complaints" },
        { status: 403 }
      );
    }

    // Fetch complaints with resident info and updates
    const { data: complaints, error } = await supabaseWithAuth
      .from("complaints")
      .select(`
        *,
        residents (
          name,
          unit_number
        ),
        complaint_updates (
          id,
          user_id,
          is_admin,
          comment,
          created_at
        )
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch complaints" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, complaints });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT handler - Update complaint status and add comments
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { complaintId, userId, comment, status, isAdmin, token } = data;
    
    if (!complaintId || !userId || !token) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Create a supabase client with the user's token
    const supabaseWithAuth = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Start a transaction
    let updateSuccess = true;
    let updateError = null;

    // 1. If there's a comment, add it to complaint_updates
    if (comment) {
      const { error } = await supabaseWithAuth.from("complaint_updates").insert({
        complaint_id: complaintId,
        user_id: userId,
        is_admin: isAdmin || false,
        comment,
      });

      if (error) {
        updateSuccess = false;
        updateError = error;
      }
    }

    // 2. If there's a status update, update the complaint
    if (status && updateSuccess) {
      const { error } = await supabaseWithAuth
        .from("complaints")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", complaintId);

      if (error) {
        updateSuccess = false;
        updateError = error;
      }
    }

    if (!updateSuccess) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update complaint" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 