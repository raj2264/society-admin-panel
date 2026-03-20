'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DetailsButtonProps {
  href: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export default function DetailsButton({ 
  href, 
  variant = 'outline', 
  size = 'sm',
  className
}: DetailsButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    console.log('Navigating to:', href);
    router.push(href);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(className)}
    >
      View Details
    </Button>
  );
} 