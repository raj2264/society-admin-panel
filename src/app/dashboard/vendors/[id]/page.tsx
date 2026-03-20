'use client';

import { use } from 'react';
import VendorDetailView from './view-page';

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return <VendorDetailView id={resolvedParams.id} />;
} 