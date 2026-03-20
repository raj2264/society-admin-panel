'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Loader2 } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  society_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function VendorDetailView({ id }: { id: string }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchVendor() {
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setVendor(data);
      } catch (error) {
        console.error('Error fetching vendor:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVendor();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vendor not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/dashboard/vendors">Back to Vendors</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/dashboard/vendors">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{vendor.name}</h1>
        </div>
        <Button asChild>
          <Link href={`/dashboard/vendors/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{vendor.name}</CardTitle>
          <CardDescription>
            <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
              {vendor.status}
            </Badge>
            <span className="ml-2">{vendor.category}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vendor.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p>{vendor.description}</p>
            </div>
          )}
          {vendor.phone && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p>{vendor.phone}</p>
            </div>
          )}
          {vendor.email && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{vendor.email}</p>
            </div>
          )}
          {vendor.address && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p>{vendor.address}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Added on</p>
            <p>{new Date(vendor.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
