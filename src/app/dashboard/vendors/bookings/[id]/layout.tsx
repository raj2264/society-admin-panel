import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Booking Details | Society Admin',
  description: 'View and manage vendor service booking',
};

export default function BookingDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 