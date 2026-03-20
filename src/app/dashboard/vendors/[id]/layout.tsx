import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vendor Details | Society Admin',
  description: 'View vendor details and services',
};

export default function VendorDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 