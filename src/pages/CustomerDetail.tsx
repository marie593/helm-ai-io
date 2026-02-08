import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Building2, Loader2, Mail, Users, Target, 
  Trash2, Edit2, Save, X, Plus, UserPlus, UserCheck, Send 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/database';

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

interface CustomerWithDetails {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  industry: string | null;
  company_size: string | null;
  teams_involved: string[] | null;
  goals: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerTeamMember {
  id: string;
  user_id: string;
  customer_id: string;
  created_at: string;
  profile?: Profile;
}

interface PendingInvitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(100),
  industry: z.string().trim().max(50).optional().or(z.literal('')),
  contact_email: z.string().trim().email('Invalid email').max(255).optional().or(z.literal('')),
  logo_url: z.string().trim().url('Invalid URL').max(500).optional().or(z.literal('')),
  company_size: z.string().optional().or(z.literal('')),
  teams_involved: z.array(z.string()).optional(),
  goals: z.string().trim().max(2000).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isVendorAdmin, isVendorStaff } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newTeam, setNewTeam] = useState('');
  const [isConnectMemberOpen, setIsConnectMemberOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberEmailError, setMemberEmailError] = useState('');
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    industry: '',
    contact_email: '',
    logo_url: '',
    company_size: '',
    teams_involved: [],
    goals: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});

  const memberEmailSchema = z.string().trim().email('Please enter a valid email address').max(255);

  // Fetch customer details
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (error) throw error;
      return data as CustomerWithDetails;
    },
    enabled: !!customerId,
  });

  // Fetch customer team members with profiles
  const { data: teamMembers } = useQuery({
    queryKey: ['customer-team-members', customerId],
    queryFn: async () => {
      // First get the user_customer_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_customer_roles')
        .select('*')
        .eq('customer_id', customerId);
      
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];
      
      // Then fetch profiles for those users
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Combine the data
      return roles.map(role => ({
        ...role,
        profile: profiles?.find(p => p.id === role.user_id) as Profile | undefined,
      })) as CustomerTeamMember[];
    },
    enabled: !!customerId,
  });

  // Fetch customer projects
  const { data: projects } = useQuery({
    queryKey: ['customer-projects', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  // Fetch pending invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ['customer-invitations', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_invitations')
        .select('id, email, status, expires_at, created_at')
        .eq('customer_id', customerId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PendingInvitation[];
    },
    enabled: !!customerId && isVendorStaff,
  });

  // Update customer mutation
  const updateCustomer = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const { error } = await supabase
        .from('customers')
        .update({
          name: data.name,
          industry: data.industry || null,
          contact_email: data.contact_email || null,
          logo_url: data.logo_url || null,
          company_size: data.company_size || null,
          teams_involved: data.teams_involved?.length ? data.teams_involved : null,
          goals: data.goals || null,
          notes: data.notes || null,
        })
        .eq('id', customerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update customer', { description: error.message });
    },
  });

  // Delete customer mutation
  const deleteCustomer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
      navigate('/customers');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete customer', { description: error.message });
    },
  });

  // Add team member mutation - uses edge function to handle both existing users and new invitations
  const addTeamMember = useMutation({
    mutationFn: async ({ email }: { email: string; name: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email,
            customerId,
            customerName: customer?.name || 'Customer',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add team member');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer-team-members', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-invitations', customerId] });
      
      if (result.type === 'linked') {
        toast.success('Team member added', { 
          description: 'Existing user has been added to this customer.' 
        });
      } else {
        toast.success('Invitation sent!', { 
          description: 'An email invitation has been sent to the new user.' 
        });
      }
      
      setIsConnectMemberOpen(false);
      setIsInviteMemberOpen(false);
      setMemberEmail('');
      setMemberEmailError('');
    },
    onError: (error: Error) => {
      toast.error('Failed to add team member', { description: error.message });
    },
  });

  // Remove team member mutation
  const removeTeamMember = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_customer_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-team-members', customerId] });
      toast.success('Team member removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove team member', { description: error.message });
    },
  });

  // Cancel invitation mutation
  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('customer_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invitations', customerId] });
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel invitation', { description: error.message });
    },
  });

  const handleConnectMember = () => {
    const result = memberEmailSchema.safeParse(memberEmail);
    if (!result.success) {
      setMemberEmailError(result.error.errors[0].message);
      return;
    }
    setMemberEmailError('');
    addTeamMember.mutate({ email: memberEmail, name: '' });
  };

  const handleInviteMember = () => {
    const result = memberEmailSchema.safeParse(memberEmail);
    if (!result.success) {
      setMemberEmailError(result.error.errors[0].message);
      return;
    }
    setMemberEmailError('');
    addTeamMember.mutate({ email: memberEmail, name: '' });
  };

  const startEditing = () => {
    if (customer) {
      setFormData({
        name: customer.name,
        industry: customer.industry || '',
        contact_email: customer.contact_email || '',
        logo_url: customer.logo_url || '',
        company_size: customer.company_size || '',
        teams_involved: customer.teams_involved || [],
        goals: customer.goals || '',
        notes: customer.notes || '',
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = customerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CustomerFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof CustomerFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    
    setErrors({});
    updateCustomer.mutate(result.data);
  };

  const handleChange = (field: keyof CustomerFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const addTeam = () => {
    if (newTeam.trim() && !formData.teams_involved?.includes(newTeam.trim())) {
      setFormData((prev) => ({
        ...prev,
        teams_involved: [...(prev.teams_involved || []), newTeam.trim()],
      }));
      setNewTeam('');
    }
  };

  const removeTeam = (team: string) => {
    setFormData((prev) => ({
      ...prev,
      teams_involved: prev.teams_involved?.filter((t) => t !== team) || [],
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <AppLayout title="Customer Details" description="Loading...">
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout title="Customer Not Found" description="The customer you're looking for doesn't exist">
        <Button onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={customer.name}
      description={customer.industry || 'Customer Profile'}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {isVendorAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {customer.name}? This will also delete all associated projects and data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteCustomer.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteCustomer.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      }
    >
      <div className="space-y-6 animate-fade-in">
        {/* Main Profile Card */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={customer.logo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{customer.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {customer.industry && <Badge variant="secondary">{customer.industry}</Badge>}
                    {customer.company_size && (
                      <Badge variant="outline">{customer.company_size} employees</Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={startEditing}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={handleChange('name')}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={handleChange('industry')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={handleChange('contact_email')}
                      className={errors.contact_email ? 'border-destructive' : ''}
                    />
                    {errors.contact_email && (
                      <p className="text-sm text-destructive">{errors.contact_email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company_size">Company Size</Label>
                    <Select
                      value={formData.company_size}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, company_size: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      type="url"
                      value={formData.logo_url}
                      onChange={handleChange('logo_url')}
                      className={errors.logo_url ? 'border-destructive' : ''}
                    />
                    {errors.logo_url && (
                      <p className="text-sm text-destructive">{errors.logo_url}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Teams Involved</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add team name..."
                      value={newTeam}
                      onChange={(e) => setNewTeam(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTeam())}
                    />
                    <Button type="button" variant="outline" onClick={addTeam}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.teams_involved?.map((team) => (
                      <Badge key={team} variant="secondary" className="gap-1">
                        {team}
                        <button
                          type="button"
                          onClick={() => removeTeam(team)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="goals">Implementation Goals</Label>
                  <Textarea
                    id="goals"
                    placeholder="Describe the customer's goals for this implementation..."
                    value={formData.goals}
                    onChange={handleChange('goals')}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about this customer..."
                    value={formData.notes}
                    onChange={handleChange('notes')}
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={cancelEditing}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateCustomer.isPending}>
                    {updateCustomer.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {customer.contact_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Contact Email</p>
                        <p className="font-medium">{customer.contact_email}</p>
                      </div>
                    </div>
                  )}
                  
                  {customer.company_size && (
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Company Size</p>
                        <p className="font-medium">{customer.company_size} employees</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {customer.teams_involved && customer.teams_involved.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Teams Involved</p>
                    <div className="flex flex-wrap gap-2">
                      {customer.teams_involved.map((team) => (
                        <Badge key={team} variant="secondary">{team}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {customer.goals && (
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Implementation Goals</p>
                      <p className="mt-1 whitespace-pre-wrap">{customer.goals}</p>
                    </div>
                  </div>
                )}
                
                {customer.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{customer.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  Customer contacts linked to this profile
                </CardDescription>
              </div>
              {isVendorAdmin && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsConnectMemberOpen(true)}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Connect Existing User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsInviteMemberOpen(true)}>
                        <Send className="h-4 w-4 mr-2" />
                        Invite New User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Connect Existing User Dialog */}
                  <Dialog open={isConnectMemberOpen} onOpenChange={setIsConnectMemberOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Connect Existing User</DialogTitle>
                        <DialogDescription>
                          Link an existing user account as a team member for this customer. They must already have an account in the system.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="connect-member-email">Email Address *</Label>
                          <Input
                            id="connect-member-email"
                            type="email"
                            placeholder="user@example.com"
                            value={memberEmail}
                            onChange={(e) => {
                              setMemberEmail(e.target.value);
                              if (memberEmailError) setMemberEmailError('');
                            }}
                            className={memberEmailError ? 'border-destructive' : ''}
                          />
                          {memberEmailError && (
                            <p className="text-sm text-destructive">{memberEmailError}</p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsConnectMemberOpen(false);
                            setMemberEmail('');
                            setMemberEmailError('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleConnectMember}
                          disabled={addTeamMember.isPending}
                        >
                          {addTeamMember.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4 mr-2" />
                          )}
                          Connect User
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Invite New User Dialog */}
                  <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite New User</DialogTitle>
                        <DialogDescription>
                          Send an email invitation to a new user. They will receive a link to create their account and join this customer.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="invite-member-email">Email Address *</Label>
                          <Input
                            id="invite-member-email"
                            type="email"
                            placeholder="newuser@example.com"
                            value={memberEmail}
                            onChange={(e) => {
                              setMemberEmail(e.target.value);
                              if (memberEmailError) setMemberEmailError('');
                            }}
                            className={memberEmailError ? 'border-destructive' : ''}
                          />
                          {memberEmailError && (
                            <p className="text-sm text-destructive">{memberEmailError}</p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsInviteMemberOpen(false);
                            setMemberEmail('');
                            setMemberEmailError('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleInviteMember}
                          disabled={addTeamMember.isPending}
                        >
                          {addTeamMember.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send Invitation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Team Members */}
            {teamMembers && teamMembers.length > 0 ? (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profile?.full_name
                            ? getInitials(member.profile.full_name)
                            : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.profile?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Customer Contact</Badge>
                      {isVendorAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.profile?.full_name || 'this user'} from this customer? They will lose access to customer data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeTeamMember.mutate(member.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : !pendingInvitations?.length ? (
              <p className="text-muted-foreground text-center py-8">
                No team members linked yet
              </p>
            ) : null}

            {/* Pending Invitations */}
            {pendingInvitations && pendingInvitations.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Pending Invitations</p>
                {pendingInvitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  return (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-muted">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {isExpired ? 'Expired' : `Expires ${new Date(invitation.expires_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isExpired ? 'destructive' : 'outline'}>
                          {isExpired ? 'Expired' : 'Pending'}
                        </Badge>
                        {isVendorAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => cancelInvitation.mutate(invitation.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Projects
                </CardTitle>
                <CardDescription>
                  Implementation projects for this customer
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/projects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{project.name}</span>
                    <Badge variant="outline">{project.status.replace('_', ' ')}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No projects yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
