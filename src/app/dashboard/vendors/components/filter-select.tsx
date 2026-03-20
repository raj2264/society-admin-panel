'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type FilterOption = {
  label: string;
  value: string;
};

interface FilterSelectProps {
  placeholder?: string;
  value?: string;
  options: FilterOption[];
  className?: string;
}

export default function FilterSelect({
  placeholder = 'Filter',
  value,
  options,
  className,
}: FilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleSelect = (selectedValue: string) => {
    setOpen(false);
    
    // Update URL with the selected filter
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectedValue === value) {
      // If clicking the same value, remove the filter
      params.delete('category');
    } else {
      params.set('category', selectedValue);
    }
    
    router.push(`/dashboard/vendors?${params.toString()}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", value && "border-primary", className)}
        >
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4" />
            {value ? options.find(option => option.value === value)?.label : placeholder}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandEmpty>No category found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => handleSelect(option.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 