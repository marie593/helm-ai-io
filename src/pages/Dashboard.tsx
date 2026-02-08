import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HealthScore } from '@/components/ui/health-score';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Project, Customer } from '@/types/database';

interface ProjectWithCustomer extends Project {
  customers: Customer;
}

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading } = useQuery({
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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [customersRes, projectsRes, tasksRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('projects').select('id, status, health_score'),
        supabase.from('tasks').select('id, status'),
      ]);

      const allProjects = projectsRes.data || [];
      const allTasks = tasksRes.data || [];

      return {
        totalCustomers: customersRes.count || 0,
        totalProjects: allProjects.length,
        activeProjects: allProjects.filter((p) => p.status === 'in_progress').length,
        atRiskProjects: allProjects.filter((p) => p.status === 'at_risk' || (p.health_score && p.health_score < 50)).length,
        completedTasks: allTasks.filter((t) => t.status === 'completed').length,
        totalTasks: allTasks.length,
      };
    },
  });

  const atRiskProjects = projects?.filter(
    (p) => p.status === 'at_risk' || (p.health_score && p.health_score < 50)
  ) || [];

  const recentProjects = projects?.slice(0, 5) || [];

  return (
    <AppLayout
      title="Dashboard"
      description="Overview of all your implementations"
      actions={
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Customers"
            value={stats?.totalCustomers || 0}
            icon={Users}
            loading={statsLoading}
          />
          <StatsCard
            title="Active Projects"
            value={stats?.activeProjects || 0}
            icon={FolderKanban}
            loading={statsLoading}
          />
          <StatsCard
            title="At Risk"
            value={stats?.atRiskProjects || 0}
            icon={AlertTriangle}
            variant="warning"
            loading={statsLoading}
          />
          <StatsCard
            title="Tasks Completed"
            value={`${stats?.completedTasks || 0}/${stats?.totalTasks || 0}`}
            icon={CheckCircle2}
            loading={statsLoading}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Projects</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects" className="text-muted-foreground">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {projectsLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentProjects.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <HealthScore score={project.health_score || 100} />
                        <div>
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.customers?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={project.status} />
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <Button asChild>
                    <Link to="/projects/new">Create your first project</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* At Risk Projects */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {projectsLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : atRiskProjects.length > 0 ? (
                <div className="divide-y divide-border">
                  {atRiskProjects.slice(0, 4).map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <HealthScore score={project.health_score || 0} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.customers?.name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="text-sm text-muted-foreground">All projects healthy!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <QuickActionCard
            icon={TrendingUp}
            title="View Insights"
            description="AI-powered analytics across all implementations"
            href="/insights"
          />
          <QuickActionCard
            icon={Clock}
            title="Weekly Digest"
            description="Generate client-ready progress summaries"
            href="/calendar"
          />
          <QuickActionCard
            icon={Users}
            title="Manage Customers"
            description="Add or manage customer accounts"
            href="/customers"
          />
        </div>
      </div>
    </AppLayout>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  loading,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  variant?: 'default' | 'warning';
  loading?: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            )}
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              variant === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
            }`}
          >
            <Icon
              className={`h-5 w-5 ${
                variant === 'warning' ? 'text-warning' : 'text-primary'
              }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link to={href}>
      <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer group">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
