import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Map, MessageSquare, Settings, MessageCircle, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthScore } from '@/components/ui/health-score';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProjectCalendar } from '@/components/project/ProjectCalendar';
import { ProjectRoadmap } from '@/components/project/ProjectRoadmap';
import { FeedbackTracker } from '@/components/project/FeedbackTracker';
import { ProjectChats } from '@/components/project/ProjectChats';
import { ProjectInsights } from '@/components/project/ProjectInsights';
import { Project, Customer } from '@/types/database';

interface ProjectWithCustomer extends Project {
  customers: Customer;
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, customers(*)')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data as unknown as ProjectWithCustomer;
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
          <Button asChild className="mt-4">
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={project.name}
      description={project.customers?.name}
      actions={
        <div className="flex items-center gap-4">
          <HealthScore score={project.health_score || 100} size="lg" />
          <StatusBadge status={project.status} />
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>

        <Tabs defaultValue="roadmap" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="roadmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Roadmap
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roadmap" className="mt-6">
            <ProjectRoadmap projectId={projectId!} projectDescription={project.description} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <ProjectCalendar projectId={projectId!} />
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <FeedbackTracker projectId={projectId!} />
          </TabsContent>

          <TabsContent value="chats" className="mt-6">
            <ProjectChats projectId={projectId!} />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <ProjectInsights projectId={projectId!} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
