import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSuccess: () => void;
  inviteToken?: string;
  defaultEmail?: string;
}

export function SignupForm({ onSuccess, inviteToken, defaultEmail }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      fullName: '', 
      email: defaultEmail || '', 
      password: '', 
      confirmPassword: '' 
    },
  });

  // Update email field if defaultEmail changes
  useEffect(() => {
    if (defaultEmail) {
      form.setValue('email', defaultEmail);
    }
  }, [defaultEmail, form]);

  const processInvitation = async (userId: string) => {
    if (!inviteToken) return;

    try {
      // Find the invitation by token
      const { data: invitation, error: findError } = await supabase
        .from('customer_invitations')
        .select('id, customer_id, status, expires_at')
        .eq('token', inviteToken)
        .eq('status', 'pending')
        .single();

      if (findError || !invitation) {
        console.error('Invitation not found or already used');
        return;
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        toast({
          variant: 'destructive',
          title: 'Invitation expired',
          description: 'This invitation has expired. Please request a new one.',
        });
        return;
      }

      // Add user to customer team - need to wait for profile to be created
      // The profile is created by a trigger, so we may need to wait
      let retries = 0;
      while (retries < 5) {
        const { error: roleError } = await supabase
          .from('user_customer_roles')
          .insert({
            user_id: userId,
            customer_id: invitation.customer_id,
          });

        if (!roleError) {
          // Update invitation status
          await supabase
            .from('customer_invitations')
            .update({ status: 'accepted' })
            .eq('id', invitation.id);

          toast({
            title: 'Invitation accepted!',
            description: 'You have been added to the team.',
          });
          return;
        }

        // If RLS error, wait and retry
        if (roleError.code === '42501') {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.error('Error adding user to customer:', roleError);
          return;
        }
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
    }
  };

  const handleSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error, data: authData } = await signUp(data.email, data.password, data.fullName);
    
    if (error) {
      setIsLoading(false);
      const message = error.message.includes('already registered')
        ? 'This email is already registered. Please sign in instead.'
        : error.message;
      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: message,
      });
    } else {
      // Process invitation if there is one
      if (inviteToken && authData?.user?.id) {
        await processInvitation(authData.user.id);
      }
      
      setIsLoading(false);
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
      onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="John Doe" 
                  autoComplete="name"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  disabled={!!defaultEmail}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {inviteToken ? 'Create account & accept invitation' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
}
