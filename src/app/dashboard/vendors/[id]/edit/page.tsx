'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VendorForm from '../../components/vendor-form';

export default function EditVendorPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = React.use(params);
  const vendorId = resolvedParams.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href={`/dashboard/vendors/${vendorId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Edit Vendor</h1>
        </div>
      </div>

      <VendorForm vendorId={vendorId} />
    </div>
  );
} 