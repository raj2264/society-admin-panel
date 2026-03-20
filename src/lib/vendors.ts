/**
 * Predefined categories for vendors in the society
 */
export function getVendorCategories(): string[] {
  return [
    'Electrician',
    'Plumber',
    'Carpenter',
    'Painter',
    'Cleaning',
    'Security',
    'Gardening',
    'Repair',
    'Appliance Repair',
    'HVAC',
    'IT & Network',
    'Laundry',
    'Pest Control',
    'Transportation',
    'Medical',
    'Catering',
    'Interior Design',
    'Event Management',
    'Construction',
    'Others'
  ];
}

/**
 * Get status color based on booking status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format booking date to a readable format
 */
export function formatBookingDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric', 
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Parse status for display
 */
export function getStatusBadgeProps(status: string): { variant: 'default' | 'outline' | 'secondary' | 'destructive', label: string } {
  switch (status) {
    case 'pending':
      return { variant: 'outline', label: 'Pending' };
    case 'confirmed':
      return { variant: 'default', label: 'Confirmed' };
    case 'completed':
      return { variant: 'secondary', label: 'Completed' };
    case 'cancelled':
      return { variant: 'destructive', label: 'Cancelled' };
    default:
      return { variant: 'outline', label: status };
  }
} 