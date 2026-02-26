import { useState } from 'react';
import { ChevronDown, Check, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import helmLogo from '@/assets/helm-logo.png';

interface SelectedWorkspace {
  id: string;
  name: string;
}

export function HomeHeader({ selectedCustomer, onSelectCustomer }: {
  selectedCustomer: SelectedWorkspace | null;
  onSelectCustomer: (customer: SelectedWorkspace | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-workspace'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleSelect = (customer: SelectedWorkspace | null) => {
    onSelectCustomer(customer);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6">
      <div className="flex items-center gap-4">
        <img src={helmLogo} alt="Helm" className="h-6" />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium text-foreground">
              {selectedCustomer ? (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {selectedCustomer.name}
                </span>
              ) : (
                'All Workspaces'
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search customers…" />
              <CommandList>
                <CommandEmpty>No customers found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleSelect(null)}
                    className="gap-2"
                  >
                    <Check className={cn('h-3.5 w-3.5', !selectedCustomer ? 'opacity-100' : 'opacity-0')} />
                    <span className="font-medium">All Workspaces</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Customers">
                  {isLoading ? (
                    <CommandItem disabled>Loading…</CommandItem>
                  ) : (
                    customers?.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => handleSelect({ id: c.id, name: c.name })}
                        className="gap-2"
                      >
                        <Check className={cn('h-3.5 w-3.5', selectedCustomer?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                        {c.name}
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
