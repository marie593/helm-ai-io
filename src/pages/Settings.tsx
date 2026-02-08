import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Bell, Shield, Palette, Users, Building2, Filter } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/sonner';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  vendor_role?: 'admin' | 'team_member' | null;
  customer_names?: string[];
}

export default function Settings() {
  const { profile, isVendorStaff } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // Fetch all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch vendor roles
      const { data: vendorRoles, error: vendorError } = await supabase
        .from('user_vendor_roles')
        .select('user_id, role');

      if (vendorError) throw vendorError;

      // Fetch customer roles with customer names
      const { data: customerRoles, error: customerError } = await supabase
        .from('user_customer_roles')
        .select(`
          user_id,
          customer_id,
          customers (name)
        `);

      if (customerError) throw customerError;

      // Combine data
      return profiles.map((profile) => {
        const vendorRole = vendorRoles?.find((vr) => vr.user_id === profile.id);
        const userCustomerRoles = customerRoles?.filter((cr) => cr.user_id === profile.id) || [];
        const customerNames = userCustomerRoles
          .map((cr) => (cr.customers as { name: string } | null)?.name)
          .filter(Boolean) as string[];

        return {
          ...profile,
          vendor_role: vendorRole?.role || null,
          customer_names: customerNames,
        } as UserWithRoles;
      });
    },
    enabled: isVendorStaff,
  });

  // Fetch all customers for filter dropdown
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

  const handleSaveProfile = () => {
    toast.success('Profile settings saved');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter users based on selected customer
  const filteredUsers = users?.filter((user) => {
    if (customerFilter === 'all') return true;
    if (customerFilter === 'vendor') return user.vendor_role !== null;
    if (customerFilter === 'unassigned') {
      return user.vendor_role === null && user.customer_names?.length === 0;
    }
    // Filter by specific customer
    const customer = customers?.find((c) => c.id === customerFilter);
    return customer && user.customer_names?.includes(customer.name);
  });

  // Group users by customer for the groups view
  const usersByCustomer = customers?.map((customer) => ({
    customer,
    users: users?.filter((u) => u.customer_names?.includes(customer.name)) || [],
  })) || [];

  const vendorUsers = users?.filter((u) => u.vendor_role !== null) || [];

  return (
    <AppLayout
      title="Settings"
      description="Manage your account and preferences"
    >
      <div className="space-y-6 animate-fade-in">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
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
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      defaultValue={profile?.full_name || ''}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={profile?.email || ''}
                      disabled
                    />
                  </div>
                </div>
                <Button onClick={handleSaveProfile}>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users & Groups Tab */}
          {isVendorStaff && (
            <TabsContent value="users" className="space-y-6">
              {/* All Users Card */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        All Users
                      </CardTitle>
                      <CardDescription>
                        View and manage all onboarded users
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select value={customerFilter} onValueChange={setCustomerFilter}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by customer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="vendor">Vendor Staff Only</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          <Separator className="my-1" />
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : filteredUsers && filteredUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Customer(s)</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(user.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
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
                                    <Badge key={name} variant="outline" className="text-xs">
                                      {name}
                                    </Badge>
                                  ))}
                                  {user.customer_names.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{user.customer_names.length - 2}
                                    </Badge>
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
                  <CardDescription>
                    See which users are assigned to each customer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Vendor Staff Group */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Vendor Staff</Badge>
                        <span className="text-sm text-muted-foreground">
                          ({vendorUsers.length} members)
                        </span>
                      </div>
                    </div>
                    {vendorUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {vendorUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.full_name || user.email}</span>
                            {user.vendor_role === 'admin' && (
                              <Badge variant="secondary" className="text-xs">Admin</Badge>
                            )}
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
                          <span className="text-sm text-muted-foreground">
                            ({customerUsers.length} members)
                          </span>
                        </div>
                      </div>
                      {customerUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {customerUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
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
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <p className="text-sm text-muted-foreground">
                    Change your password to keep your account secure
                  </p>
                  <Button variant="outline">Change Password</Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
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
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred color theme
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Light</Button>
                    <Button variant="outline" size="sm">Dark</Button>
                    <Button variant="outline" size="sm">System</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
