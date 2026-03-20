import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { vendor_id, society_id, vendor_name } = await request.json();
    
    // We need at least one of these identifiers
    if (!vendor_id && !society_id && !vendor_name) {
      return NextResponse.json(
        { error: 'Vendor ID, Society ID, or Vendor Name is required' },
        { status: 400 }
      );
    }
    
    // Find the vendor based on available information
    let vendorQuery = supabase.from('vendors').select('*');
    
    if (vendor_id) {
      vendorQuery = vendorQuery.eq('id', vendor_id);
    } else if (society_id && vendor_name) {
      vendorQuery = vendorQuery.eq('society_id', society_id).eq('name', vendor_name);
    } else if (vendor_name) {
      vendorQuery = vendorQuery.ilike('name', `%${vendor_name}%`);
    } else if (society_id) {
      vendorQuery = vendorQuery.eq('society_id', society_id);
    }
    
    const { data: vendors, error: vendorError } = await vendorQuery;
    
    if (vendorError || !vendors || vendors.length === 0) {
      return NextResponse.json(
        { error: vendorError?.message || 'Vendor not found' },
        { status: 404 }
      );
    }
    
    // Process each matching vendor
    const results = [];
    
    for (const vendor of vendors) {
      // Complete update for booking form compatibility
      const updates = {
        // These are critical for the booking form:
        is_available: true,
        name: vendor.name?.trim() || 'Service Provider',
        category: validateCategory(vendor.category),
        phone: vendor.phone?.trim() || '1234567890',
        description: vendor.description?.trim() || 'Service provider for your society',
        service_hours: vendor.service_hours?.trim() || 'Mon-Fri: 9AM-5PM',
        contact_person: vendor.contact_person?.trim() || 'Contact Person',
        
        // Add any additional fields that might be needed:
        email: vendor.email || 'service@example.com',
        address: vendor.address || 'Service Location'
      };
      
      // Update the vendor
      const { data: updatedVendor, error: updateError } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', vendor.id)
        .select();
      
      if (updateError) {
        results.push({
          vendor_id: vendor.id,
          name: vendor.name,
          status: 'error',
          error: updateError.message
        });
      } else {
        results.push({
          vendor_id: vendor.id,
          name: vendor.name,
          status: 'updated',
          data: updatedVendor?.[0] || null
        });
        
        // Create a test booking to initialize the bookings table
        const { error: bookingError } = await supabase
          .rpc('initialize_vendor_booking_tables');
        
        if (bookingError && !bookingError.message.includes('does not exist')) {
          console.error('Error initializing booking tables:', bookingError);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Vendors updated for booking form compatibility',
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Error fixing booking form data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to validate category
function validateCategory(category: string | null): string {
  const validCategories = [
    'Plumber',
    'Electrician',
    'Carpenter',
    'Painter',
    'Cleaning',
    'Security',
    'Gardening',
    'Pest Control',
    'Laundry',
    'Food Delivery',
    'Grocery Delivery',
    'Maintenance',
    'Other'
  ];
  
  if (!category || !validCategories.includes(category)) {
    return 'Other';
  }
  
  return category;
} 