import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, FolderKanban, ArrowRight, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthScore } from '@/components/ui/health-score';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { Project, Customer } from '@/types/database';
import { format, differenceInDays } from 'date-fns';

interface ProjectWithCustomer extends Project {
  customers: Customer;
}

export default function Projects() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, customers(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ProjectWithCustomer[];
    },
  });

  const getTimeProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(now, start);
    
    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const days = differenceInDays(end, now);
    return days;
  };

  return (
    <AppLayout
      title="Projects"
      description="All implementation projects"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      }
    >
      <div className="animate-fade-in">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project) => {
              const daysRemaining = getDaysRemaining(project.target_end_date);
              const timeProgress = getTimeProgress(project.start_date, project.target_end_date);
              
              return (
                <Link key={project.id} to={`/projects/${project.id}`}>
                  <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <HealthScore score={project.health_score || 100} size="lg" />
                          <div>
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {project.customers?.name}
                            </p>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusBadge status={project.status} />
                          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-border">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Timeline Progress</span>
                          <span className={`font-medium ${daysRemaining < 14 ? 'text-warning' : 'text-foreground'}`}>
                            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Past due'}
                          </span>
                        </div>
                        <Progress value={timeProgress} className="h-2" />
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{format(new Date(project.start_date), 'MMM d, yyyy')}</span>
                          <span>{format(new Date(project.target_end_date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first implementation project
              </p>
              <Button asChild>
                <Link to="/projects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
