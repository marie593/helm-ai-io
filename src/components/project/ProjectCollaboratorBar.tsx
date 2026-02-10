import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProjectCollaboratorBarProps {
  projectId: string;
}

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

type CollaboratorRole = 'vendor_lead' | 'customer_lead' | 'collaborator';

const roleLabels: Record<CollaboratorRole, string> = {
  vendor_lead: 'Vendor Lead',
  customer_lead: 'Customer Lead',
  collaborator: 'Collaborator',
};

function getInitials(name: string | null | undefined, email?: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

export function ProjectCollaboratorBar({ projectId }: ProjectCollaboratorBarProps) {
  const [assigningRole, setAssigningRole] = useState<CollaboratorRole | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: collaborators = [] } = useQuery({
    queryKey: ['project-collaborators', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_collaborators')
        .select('id, user_id, role, profiles(id, full_name, email, avatar_url)')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as unknown as Collaborator[];
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url');
      if (error) throw error;
      return data || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: CollaboratorRole }) => {
      // Remove existing user in this role (for lead roles, only one allowed)
      if (role === 'vendor_lead' || role === 'customer_lead') {
        await supabase
          .from('project_collaborators')
          .delete()
          .eq('project_id', projectId)
          .eq('role', role);
      }
      const { error } = await supabase
        .from('project_collaborators')
        .upsert({ project_id: projectId, user_id: userId, role }, { onConflict: 'project_id,user_id,role' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-collaborators', projectId] });
      setAssigningRole(null);
      toast({ title: 'Collaborator updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to assign', description: err.message, variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase.from('project_collaborators').delete().eq('id', collaboratorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-collaborators', projectId] });
      toast({ title: 'Collaborator removed' });
    },
  });

  const vendorLead = collaborators.find(c => c.role === 'vendor_lead');
  const customerLead = collaborators.find(c => c.role === 'customer_lead');
  const others = collaborators.filter(c => c.role === 'collaborator');

  const renderSlot = (label: string, role: CollaboratorRole, collaborator?: Collaborator) => (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</span>
      <Popover open={assigningRole === role} onOpenChange={(open) => setAssigningRole(open ? role : null)}>
        <PopoverTrigger asChild>
          {collaborator ? (
            <button className="relative group flex items-center gap-1.5 rounded-full pr-2 hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8 border-2 border-background shadow-sm cursor-pointer">
                <AvatarImage src={collaborator.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {getInitials(collaborator.profiles?.full_name ?? null, collaborator.profiles?.email ?? '')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                {collaborator.profiles?.full_name || collaborator.profiles?.email || 'Unknown'}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <button className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-muted-foreground/30 px-3 py-1 hover:border-primary hover:bg-accent transition-colors cursor-pointer">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Assign</span>
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64" align="start">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {allUsers.map(user => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => assignMutation.mutate({ userId: user.id, role })}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">{user.full_name || user.email}</span>
                      {user.full_name && (
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          {collaborator && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => {
                  removeMutation.mutate(collaborator.id);
                  setAssigningRole(null);
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-card border rounded-lg shadow-sm flex-wrap">
      {renderSlot('Vendor Lead', 'vendor_lead', vendorLead)}
      <div className="h-6 w-px bg-border" />
      {renderSlot('Customer Lead', 'customer_lead', customerLead)}
      <div className="h-6 w-px bg-border" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Collaborators</span>
        <div className="flex items-center -space-x-2">
          {others.map(c => (
            <Popover key={c.id}>
              <PopoverTrigger asChild>
                <button className="relative group">
                  <Avatar className={cn("h-8 w-8 border-2 border-background shadow-sm cursor-pointer hover:z-10 hover:scale-110 transition-transform")}>
                    <AvatarImage src={c.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                      {getInitials(c.profiles?.full_name ?? null, c.profiles?.email ?? '')}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="center">
                <div className="text-sm font-medium">{c.profiles?.full_name || c.profiles?.email || 'Unknown'}</div>
                {c.profiles?.full_name && (
                  <div className="text-xs text-muted-foreground">{c.profiles.email}</div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-destructive hover:text-destructive"
                  onClick={() => removeMutation.mutate(c.id)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </PopoverContent>
            </Popover>
          ))}
        </div>
        <Popover open={assigningRole === 'collaborator'} onOpenChange={(open) => setAssigningRole(open ? 'collaborator' : null)}>
          <PopoverTrigger asChild>
            <button className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-accent transition-colors cursor-pointer">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64" align="start">
            <Command>
              <CommandInput placeholder="Add collaborator..." />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {allUsers
                    .filter(u => !others.some(o => o.user_id === u.id))
                    .map(user => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => assignMutation.mutate({ userId: user.id, role: 'collaborator' })}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-muted">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{user.full_name || user.email}</span>
                          {user.full_name && (
                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
