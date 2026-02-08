import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(100, 'Name must be less than 100 characters'),
  industry: z.string().trim().max(50, 'Industry must be less than 50 characters').optional(),
  contact_email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters').optional().or(z.literal('')),
  logo_url: z.string().trim().url('Invalid URL').max(500, 'URL must be less than 500 characters').optional().or(z.literal('')),
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
  });
  
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
        })
        .select()
        .single();
      
      if (error) throw error;
      return customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
      navigate(`/customers`);
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
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
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
