import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, Sailboat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const waitlistSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  workEmail: z.string().trim().email('Please enter a valid work email').max(255),
  companyName: z.string().trim().min(1, 'Company name is required').max(200),
  companySize: z.string().min(1, 'Please select a company size'),
  role: z.string().min(1, 'Please select your role'),
  topPainPoint: z.string().trim().min(1, 'Please share your top pain point').max(500),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

const companySizes = ['1-10', '11-50', '51-200', '201-500', '500+'];
const roles = [
  'Implementation / Onboarding Lead',
  'Customer Success Manager',
  'Project Manager',
  'Operations Lead',
  'Product Manager',
  'Founder / Executive',
  'Other',
];

export default function WaitlistForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { fullName: '', workEmail: '', companyName: '', companySize: '', role: '', topPainPoint: '' },
  });

  const handleSubmit = async (data: WaitlistFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('demo_requests').insert({
        full_name: data.fullName,
        work_email: data.workEmail,
        company_name: data.companyName,
        company_size: data.companySize,
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Something went wrong', description: 'Please try again later.' });
        return;
      }

      // Send notification email (fire-and-forget, don't block success)
      supabase.functions.invoke('notify-waitlist', {
        body: {
          fullName: data.fullName,
          workEmail: data.workEmail,
          companyName: data.companyName,
          companySize: data.companySize,
          role: data.role,
          topPainPoint: data.topPainPoint,
        },
      }).catch((err) => console.error('Notification email failed:', err));

      setIsSubmitted(true);
    } catch (err) {
      console.error('Waitlist submission error:', err);
      toast({ variant: 'destructive', title: 'Something went wrong', description: 'Please try again later.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">You're on the list!</h2>
          <p className="text-muted-foreground">Thanks for your interest in HelmAI. We'll reach out shortly to schedule a demo.</p>
          <Button variant="outline" asChild><a href="/">Back to Home</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sailboat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">HelmAI</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Join Our Waitlist</h1>
            <p className="text-muted-foreground">Tell us a bit about yourself and we'll reach out to get you started.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Jane Smith" autoComplete="name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="workEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email</FormLabel>
                    <FormControl><Input type="email" placeholder="jane@company.com" autoComplete="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input placeholder="Acme Inc." autoComplete="organization" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="companySize" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {companySizes.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="topPainPoint" render={({ field }) => (
                <FormItem>
                  <FormLabel>What's your #1 pain point with customer implementations today?</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Tracking milestones across multiple customers is a nightmare..." className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join the Waitlist
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
