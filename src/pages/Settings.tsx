import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Bell, Shield, Palette, Users, Building2, Filter, Plus, Trash2, Edit2, Loader2, X } from 'lucide-react';
import { CompanyProfile } from '@/components/settings/CompanyProfile';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/sonner';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  title: string | null;
  avatar_url: string | null;
  created_at: string;
  vendor_role?: 'admin' | 'team_member' | null;
  customer_ids?: string[];
  customer_names?: string[];
}

const newUserSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').max(255),
  full_name: z.string().trim().min(1, 'Name is required').max(100),
  title: z.string().trim().max(100).optional(),
  is_vendor_staff: z.boolean(),
  vendor_role: z.enum(['admin', 'team_member']).optional(),
  customer_ids: z.array(z.string()).optional(),
});

type NewUserFormData = z.infer<typeof newUserSchema>;

const editUserSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100),
  title: z.string().trim().max(100).optional(),
  is_vendor_staff: z.boolean(),
  vendor_role: z.enum(['admin', 'team_member']).optional(),
  customer_ids: z.array(z.string()).optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

export default function Settings() {
  const { profile, isVendorStaff, isVendorAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  
  // Dialog states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  
  // Form states
  const [newUserForm, setNewUserForm] = useState<NewUserFormData>({
    email: '',
    full_name: '',
    title: '',
    is_vendor_staff: false,
    vendor_role: undefined,
    customer_ids: [],
  });
  const [editUserForm, setEditUserForm] = useState<EditUserFormData>({
    full_name: '',
    title: '',
    is_vendor_staff: false,
    vendor_role: undefined,
    customer_ids: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: vendorRoles, error: vendorError } = await supabase
        .from('user_vendor_roles')
        .select('user_id, role');

      if (vendorError) throw vendorError;

      const { data: customerRoles, error: customerError } = await supabase
        .from('user_customer_roles')
        .select(`user_id, customer_id, customers (name)`);

      if (customerError) throw customerError;

      return profiles.map((profile) => {
        const vendorRole = vendorRoles?.find((vr) => vr.user_id === profile.id);
        const userCustomerRoles = customerRoles?.filter((cr) => cr.user_id === profile.id) || [];
        const customerIds = userCustomerRoles.map((cr) => cr.customer_id);
        const customerNames = userCustomerRoles
          .map((cr) => (cr.customers as { name: string } | null)?.name)
          .filter(Boolean) as string[];

        return {
          ...profile,
          vendor_role: vendorRole?.role || null,
          customer_ids: customerIds,
          customer_names: customerNames,
        } as UserWithRoles;
      });
    },
    enabled: isVendorStaff,
  });

  // Fetch all customers
  const { data: customers } = useQuery({
    queryKey: ['all-customers-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isVendorStaff,
  });

  // Invite new user mutation
  const inviteUser = useMutation({
    mutationFn: async (data: NewUserFormData) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // For each selected customer, send an invitation
      if (data.customer_ids && data.customer_ids.length > 0) {
        for (const customerId of data.customer_ids) {
          const customer = customers?.find(c => c.id === customerId);
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                email: data.email,
                customerId,
                customerName: customer?.name || 'Customer',
              }),
            }
          );

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Failed to invite user');
          }
        }
      }
      
      return { email: data.email, isVendorStaff: data.is_vendor_staff };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User invitation sent successfully');
      setIsAddUserOpen(false);
      resetNewUserForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to invite user', { description: error.message });
    },
  });

  // Update user profile mutation
  const updateUserProfile = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserFormData }) => {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, title: data.title || null })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Handle vendor role changes
      if (data.is_vendor_staff && data.vendor_role) {
        // Check if already has a vendor role
        const { data: existingRole } = await supabase
          .from('user_vendor_roles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingRole) {
          await supabase
            .from('user_vendor_roles')
            .update({ role: data.vendor_role })
            .eq('user_id', userId);
        } else {
          await supabase
            .from('user_vendor_roles')
            .insert({ user_id: userId, role: data.vendor_role });
        }
      } else {
        // Remove vendor role if unchecked
        await supabase
          .from('user_vendor_roles')
          .delete()
          .eq('user_id', userId);
      }

      // Handle customer assignments
      // First remove all existing customer roles
      await supabase
        .from('user_customer_roles')
        .delete()
        .eq('user_id', userId);

      // Then add new ones
      if (data.customer_ids && data.customer_ids.length > 0) {
        const customerRolesToInsert = data.customer_ids.map(customerId => ({
          user_id: userId,
          customer_id: customerId,
        }));
        
        const { error: insertError } = await supabase
          .from('user_customer_roles')
          .insert(customerRolesToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User updated successfully');
      setIsEditUserOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to update user', { description: error.message });
    },
  });

  // Delete user mutation (removes all roles, keeps profile for audit)
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Remove vendor roles
      await supabase
        .from('user_vendor_roles')
        .delete()
        .eq('user_id', userId);

      // Remove customer roles
      await supabase
        .from('user_customer_roles')
        .delete()
        .eq('user_id', userId);

      // Note: We don't delete the profile as it may be needed for audit purposes
      // and is linked to auth.users which we can't delete via client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User access removed successfully');
      setIsDeleteUserOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to remove user', { description: error.message });
    },
  });

  const handleSaveProfile = () => {
    toast.success('Profile settings saved');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const resetNewUserForm = () => {
    setNewUserForm({
      email: '',
      full_name: '',
      title: '',
      is_vendor_staff: false,
      vendor_role: undefined,
      customer_ids: [],
    });
    setFormErrors({});
  };

  const handleAddUser = () => {
    const result = newUserSchema.safeParse(newUserForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        errors[err.path[0] as string] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    if (!newUserForm.is_vendor_staff && (!newUserForm.customer_ids || newUserForm.customer_ids.length === 0)) {
      setFormErrors({ customer_ids: 'Please select at least one customer or mark as vendor staff' });
      return;
    }

    setFormErrors({});
    inviteUser.mutate(result.data);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    
    const result = editUserSchema.safeParse(editUserForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        errors[err.path[0] as string] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    updateUserProfile.mutate({ userId: selectedUser.id, data: result.data });
  };

  const openEditDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditUserForm({
      full_name: user.full_name || '',
      title: user.title || '',
      is_vendor_staff: user.vendor_role !== null,
      vendor_role: user.vendor_role || undefined,
      customer_ids: user.customer_ids || [],
    });
    setFormErrors({});
    setIsEditUserOpen(true);
  };

  const openDeleteDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setIsDeleteUserOpen(true);
  };

  const toggleCustomerSelection = (customerId: string, isEdit: boolean) => {
    if (isEdit) {
      setEditUserForm(prev => ({
        ...prev,
        customer_ids: prev.customer_ids?.includes(customerId)
          ? prev.customer_ids.filter(id => id !== customerId)
          : [...(prev.customer_ids || []), customerId],
      }));
    } else {
      setNewUserForm(prev => ({
        ...prev,
        customer_ids: prev.customer_ids?.includes(customerId)
          ? prev.customer_ids.filter(id => id !== customerId)
          : [...(prev.customer_ids || []), customerId],
      }));
    }
  };

  // Filter users
  const filteredUsers = users?.filter((user) => {
    if (customerFilter === 'all') return true;
    if (customerFilter === 'vendor') return user.vendor_role !== null;
    if (customerFilter === 'unassigned') {
      return user.vendor_role === null && user.customer_names?.length === 0;
    }
    const customer = customers?.find((c) => c.id === customerFilter);
    return customer && user.customer_names?.includes(customer.name);
  });

  // Group users by customer
  const usersByCustomer = customers?.map((customer) => ({
    customer,
    users: users?.filter((u) => u.customer_names?.includes(customer.name)) || [],
  })) || [];

  const vendorUsers = users?.filter((u) => u.vendor_role !== null) || [];

  return (
    <AppLayout title="Settings" description="Manage your account and preferences">
      <div className="space-y-6 animate-fade-in">
        <Tabs defaultValue={isVendorAdmin ? (isVendorStaff ? 'users' : 'company') : 'profile'} className="space-y-6">
          <TabsList className="flex-wrap">
            {!isVendorAdmin && (
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
            )}
            {isVendorStaff && (
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users & Groups
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            {isVendorStaff && (
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="h-4 w-4" />
                Company Profile
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab (non-admin only) */}
          {!isVendorAdmin && (
            <TabsContent value="profile">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" defaultValue={profile?.full_name || ''} placeholder="Enter your name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={profile?.email || ''} disabled />
                    </div>
                  </div>
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Users & Groups Tab */}
          {isVendorStaff && (
            <TabsContent value="users" className="space-y-6">
              {/* All Users Card */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        All Users
                      </CardTitle>
                      <CardDescription>View and manage all onboarded users</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={customerFilter} onValueChange={setCustomerFilter}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by customer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="vendor">Vendor Staff Only</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <Separator className="my-1" />
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {isVendorAdmin && (
                        <Button onClick={() => { resetNewUserForm(); setIsAddUserOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add User
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : filteredUsers && filteredUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Customer(s)</TableHead>
                          <TableHead>Joined</TableHead>
                          {isVendorAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.title || '—'}
                            </TableCell>
                            <TableCell>
                              {user.vendor_role ? (
                                <Badge variant={user.vendor_role === 'admin' ? 'default' : 'secondary'}>
                                  {user.vendor_role === 'admin' ? 'Admin' : 'Team Member'}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Customer Contact</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.customer_names && user.customer_names.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.customer_names.slice(0, 2).map((name) => (
                                    <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
                                  ))}
                                  {user.customer_names.length > 2 && (
                                    <Badge variant="outline" className="text-xs">+{user.customer_names.length - 2}</Badge>
                                  )}
                                </div>
                              ) : user.vendor_role ? (
                                <span className="text-sm text-muted-foreground">All customers</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            {isVendorAdmin && (
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                      <Edit2 className="h-4 w-4 mr-2" />
                                      Edit User
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => openDeleteDialog(user)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove Access
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No users found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Groups by Customer */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    User Groups by Customer
                  </CardTitle>
                  <CardDescription>See which users are assigned to each customer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Vendor Staff Group */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Vendor Staff</Badge>
                        <span className="text-sm text-muted-foreground">({vendorUsers.length} members)</span>
                      </div>
                    </div>
                    {vendorUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {vendorUsers.map((user) => (
                          <div key={user.id} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.full_name || user.email}</span>
                            {user.vendor_role === 'admin' && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No vendor staff members</p>
                    )}
                  </div>

                  {/* Customer Groups */}
                  {usersByCustomer.map(({ customer, users: customerUsers }) => (
                    <div key={customer.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-sm text-muted-foreground">({customerUsers.length} members)</span>
                        </div>
                      </div>
                      {customerUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {customerUsers.map((user) => (
                            <div key={user.id} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{user.full_name || user.email}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No users assigned</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <p className="text-sm text-muted-foreground">Change your password to keep your account secure</p>
                  <Button variant="outline">Change Password</Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">Select your preferred color theme</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Light</Button>
                    <Button variant="outline" size="sm">Dark</Button>
                    <Button variant="outline" size="sm">System</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Profile Tab */}
          {isVendorStaff && (
            <TabsContent value="company">
              <CompanyProfile />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Invite a new user to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email Address *</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="user@example.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Full Name *</Label>
              <Input
                id="new-name"
                placeholder="John Doe"
                value={newUserForm.full_name}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                className={formErrors.full_name ? 'border-destructive' : ''}
              />
              {formErrors.full_name && <p className="text-sm text-destructive">{formErrors.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                placeholder="Product Manager"
                value={newUserForm.title}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <Separator />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-vendor"
                checked={newUserForm.is_vendor_staff}
                onCheckedChange={(checked) => setNewUserForm(prev => ({ 
                  ...prev, 
                  is_vendor_staff: checked === true,
                  vendor_role: checked ? 'team_member' : undefined,
                }))}
              />
              <Label htmlFor="is-vendor">Mark as Vendor Staff</Label>
            </div>
            {newUserForm.is_vendor_staff && (
              <div className="space-y-2 ml-6">
                <Label>Vendor Role</Label>
                <Select
                  value={newUserForm.vendor_role}
                  onValueChange={(value: 'admin' | 'team_member') => setNewUserForm(prev => ({ ...prev, vendor_role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!newUserForm.is_vendor_staff && (
              <div className="space-y-2">
                <Label>Assign to Customer(s) *</Label>
                <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto space-y-2">
                  {customers?.map((customer) => (
                    <div key={customer.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`new-customer-${customer.id}`}
                        checked={newUserForm.customer_ids?.includes(customer.id)}
                        onCheckedChange={() => toggleCustomerSelection(customer.id, false)}
                      />
                      <Label htmlFor={`new-customer-${customer.id}`} className="font-normal">
                        {customer.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {formErrors.customer_ids && <p className="text-sm text-destructive">{formErrors.customer_ids}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={inviteUser.isPending}>
              {inviteUser.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser?.avatar_url || undefined} />
                <AvatarFallback>{getInitials(selectedUser?.full_name || null)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser?.email}</p>
                <p className="text-sm text-muted-foreground">User ID: {selectedUser?.id.slice(0, 8)}...</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={editUserForm.full_name}
                onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                className={formErrors.full_name ? 'border-destructive' : ''}
              />
              {formErrors.full_name && <p className="text-sm text-destructive">{formErrors.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Product Manager"
                value={editUserForm.title}
                onChange={(e) => setEditUserForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <Separator />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is-vendor"
                checked={editUserForm.is_vendor_staff}
                onCheckedChange={(checked) => setEditUserForm(prev => ({ 
                  ...prev, 
                  is_vendor_staff: checked === true,
                  vendor_role: checked ? (prev.vendor_role || 'team_member') : undefined,
                }))}
              />
              <Label htmlFor="edit-is-vendor">Vendor Staff</Label>
            </div>
            {editUserForm.is_vendor_staff && (
              <div className="space-y-2 ml-6">
                <Label>Vendor Role</Label>
                <Select
                  value={editUserForm.vendor_role}
                  onValueChange={(value: 'admin' | 'team_member') => setEditUserForm(prev => ({ ...prev, vendor_role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Customer Assignments</Label>
              <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto space-y-2">
                {customers?.map((customer) => (
                  <div key={customer.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-customer-${customer.id}`}
                      checked={editUserForm.customer_ids?.includes(customer.id)}
                      onCheckedChange={() => toggleCustomerSelection(customer.id, true)}
                    />
                    <Label htmlFor={`edit-customer-${customer.id}`} className="font-normal">
                      {customer.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={updateUserProfile.isPending}>
              {updateUserProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit2 className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all access for {selectedUser?.full_name || selectedUser?.email}? 
              This will remove them from all customers and vendor roles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && deleteUser.mutate(selectedUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
