import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Phone, Mail, MapPin, Clock, Star, MoreVertical, Edit, Trash2, Calendar } from 'lucide-react';
import { VendorData } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function VendorCard({ vendor }: { vendor: VendorData }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-xl">{vendor.name}</CardTitle>
            <CardDescription>{vendor.category}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/vendors/${vendor.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/vendors/${vendor.id}/bookings`}>
                    <Calendar className="mr-2 h-4 w-4" />
                    View Bookings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    if (confirm(`Are you sure you want to delete ${vendor.name}?`)) {
                      // Delete logic would be handled here
                      console.log('Delete vendor:', vendor.id);
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge variant={vendor.is_available ? 'default' : 'secondary'}>
              {vendor.is_available ? 'Available' : 'Unavailable'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-3 text-sm">
          {vendor.description && (
            <p className="text-muted-foreground line-clamp-3">{vendor.description}</p>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{vendor.phone}</span>
            </div>
            {vendor.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-wrap-balance truncate">{vendor.email}</span>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="line-clamp-2">{vendor.address}</span>
              </div>
            )}
            {vendor.service_hours && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.service_hours}</span>
              </div>
            )}
            {vendor.rating && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span>{vendor.rating} / 5</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex justify-between items-center w-full">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/vendors/${vendor.id}`}>
              View Details
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/vendors/${vendor.id}/bookings`}>
              Manage Bookings
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 