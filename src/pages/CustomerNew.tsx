import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Loader2, Plus, X } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(100, 'Name must be less than 100 characters'),
  industry: z.string().trim().max(50, 'Industry must be less than 50 characters').optional(),
  contact_email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters').optional().or(z.literal('')),
  logo_url: z.string().trim().url('Invalid URL').max(500, 'URL must be less than 500 characters').optional().or(z.literal('')),
  company_size: z.string().optional().or(z.literal('')),
  teams_involved: z.array(z.string()).optional(),
  goals: z.string().trim().max(2000).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomerNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
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
  
  const [newTeam, setNewTeam] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});

  const createCustomer = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          name: data.name,
          industry: data.industry || null,
          contact_email: data.contact_email || null,
          logo_url: data.logo_url || null,
          company_size: data.company_size || null,
          teams_involved: data.teams_involved?.length ? data.teams_involved : null,
          goals: data.goals || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
      navigate(`/customers/${customer.id}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create customer', {
        description: error.message,
      });
    },
  });

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
    createCustomer.mutate(result.data);
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

  return (
    <AppLayout
      title="Add Customer"
      description="Create a new corporate customer"
      actions={
        <Button variant="outline" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Customer Details</CardTitle>
                <CardDescription>
                  Enter the information for your new customer
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  placeholder="Acme Corporation"
                  value={formData.name}
                  onChange={handleChange('name')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="Technology, Healthcare, Finance..."
                  value={formData.industry}
                  onChange={handleChange('industry')}
                  className={errors.industry ? 'border-destructive' : ''}
                />
                {errors.industry && (
                  <p className="text-sm text-destructive">{errors.industry}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="contact@acme.com"
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
                  placeholder="https://example.com/logo.png"
                  value={formData.logo_url}
                  onChange={handleChange('logo_url')}
                  className={errors.logo_url ? 'border-destructive' : ''}
                />
                {errors.logo_url && (
                  <p className="text-sm text-destructive">{errors.logo_url}</p>
                )}
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
                {formData.teams_involved && formData.teams_involved.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.teams_involved.map((team) => (
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
                )}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/customers')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCustomer.isPending}
                  className="flex-1"
                >
                  {createCustomer.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Customer'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
