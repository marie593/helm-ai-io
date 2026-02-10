import { useState } from 'react';
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
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HealthScore } from '@/components/ui/health-score';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project, Customer } from '@/types/database';

interface ProjectWithCustomer extends Project {
  customers: Customer;
}

export default function Dashboard() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');

  const { data: customers } = useQuery({
    queryKey: ['customers-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

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

  const filteredProjects = projects?.filter(
    (p) => selectedCustomerId === 'all' || p.customer_id === selectedCustomerId
  ) || [];

  const atRiskProjects = filteredProjects.filter(
    (p) => p.status === 'at_risk' || (p.health_score && p.health_score < 50)
  );

  const recentProjects = filteredProjects.slice(0, 5);

  return (
    <AppLayout
      title="Dashboard"
      description="Overview of all your implementations"
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="w-[180px] h-9 bg-secondary/50">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back 👋
            </h2>
            <p className="text-muted-foreground mt-1 max-w-lg">
              Here's what's happening across your implementations today.
            </p>
          </div>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute -right-4 -bottom-8 h-24 w-24 rounded-full bg-accent/5 blur-xl" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Customers"
            value={stats?.totalCustomers || 0}
            icon={Users}
            loading={statsLoading}
            gradient="from-info/10 to-info/5"
            iconColor="text-info"
          />
          <StatsCard
            title="Active Projects"
            value={stats?.activeProjects || 0}
            icon={FolderKanban}
            loading={statsLoading}
            gradient="from-primary/10 to-primary/5"
            iconColor="text-primary"
          />
          <StatsCard
            title="At Risk"
            value={stats?.atRiskProjects || 0}
            icon={AlertTriangle}
            loading={statsLoading}
            gradient="from-warning/10 to-warning/5"
            iconColor="text-warning"
          />
          <StatsCard
            title="Tasks Completed"
            value={`${stats?.completedTasks || 0}/${stats?.totalTasks || 0}`}
            icon={CheckCircle2}
            loading={statsLoading}
            gradient="from-success/10 to-success/5"
            iconColor="text-success"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <Card className="lg:col-span-2 shadow-card border-0 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Projects</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects" className="text-muted-foreground hover:text-primary">
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
                  {recentProjects.map((project, idx) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      style={{ animationDelay: `${idx * 50}ms` }}
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
          <Card className="shadow-card border-0 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mx-auto mb-3">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <p className="text-sm font-medium text-foreground">All projects healthy!</p>
                  <p className="text-xs text-muted-foreground mt-1">No action needed</p>
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
  loading,
  gradient,
  iconColor,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  loading?: boolean;
  gradient: string;
  iconColor: string;
}) {
  return (
    <Card className="shadow-card border-0 bg-card overflow-hidden">
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
            className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
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
      <Card className="shadow-card border-0 bg-card hover:shadow-elevated transition-all duration-200 cursor-pointer group hover:-translate-y-0.5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</p>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
