import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FolderKanban, Loader2, Calendar } from 'lucide-react';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Customer } from '@/types/database';

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100, 'Name must be less than 100 characters'),
  customer_id: z.string().uuid('Please select a customer'),
  description: z.string().trim().max(500, 'Description must be less than 500 characters').optional(),
  start_date: z.string().min(1, 'Start date is required'),
  target_end_date: z.string().min(1, 'Target end date is required'),
}).refine((data) => {
  const start = new Date(data.start_date);
  const end = new Date(data.target_end_date);
  return end > start;
}, {
  message: 'End date must be after start date',
  path: ['target_end_date'],
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultEndDate = format(addDays(new Date(), 90), 'yyyy-MM-dd');
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    customer_id: '',
    description: '',
    start_date: today,
    target_end_date: defaultEndDate,
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Customer[];
    },
  });

  const createProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          customer_id: data.customer_id,
          description: data.description || null,
          start_date: data.start_date,
          target_end_date: data.target_end_date,
          status: 'planning',
          health_score: 100,
        })
        .select()
        .single();
      
      if (error) throw error;
      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
      navigate(`/projects/${project.id}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create project', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = projectSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProjectFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProjectFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    
    setErrors({});
    createProject.mutate(result.data);
  };

  const handleChange = (field: keyof ProjectFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCustomerChange = (value: string) => {
    setFormData((prev) => ({ ...prev, customer_id: value }));
    if (errors.customer_id) {
      setErrors((prev) => ({ ...prev, customer_id: undefined }));
    }
  };

  return (
    <AppLayout
      title="New Project"
      description="Create a new implementation project"
      actions={
        <Button variant="outline" onClick={() => navigate('/projects')}>
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
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                  Enter the information for your new project
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={handleCustomerChange}
                  disabled={customersLoading}
                >
                  <SelectTrigger className={errors.customer_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder={customersLoading ? 'Loading customers...' : 'Select a customer'} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer_id && (
                  <p className="text-sm text-destructive">{errors.customer_id}</p>
                )}
                {customers?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No customers found.{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => navigate('/customers/new')}
                    >
                      Create a customer first
                    </Button>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="Q1 Implementation"
                  value={formData.name}
                  onChange={handleChange('name')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the project scope and goals..."
                  value={formData.description}
                  onChange={handleChange('description')}
                  rows={3}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <div className="relative">
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleChange('start_date')}
                      className={errors.start_date ? 'border-destructive' : ''}
                    />
                  </div>
                  {errors.start_date && (
                    <p className="text-sm text-destructive">{errors.start_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_end_date">Target End Date *</Label>
                  <div className="relative">
                    <Input
                      id="target_end_date"
                      type="date"
                      value={formData.target_end_date}
                      onChange={handleChange('target_end_date')}
                      className={errors.target_end_date ? 'border-destructive' : ''}
                    />
                  </div>
                  {errors.target_end_date && (
                    <p className="text-sm text-destructive">{errors.target_end_date}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/projects')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProject.isPending || customers?.length === 0}
                  className="flex-1"
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
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
