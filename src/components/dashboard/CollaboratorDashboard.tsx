import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FolderKanban,
  Mail,
  Phone,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthScore } from '@/components/ui/health-score';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Project, Customer, Profile } from '@/types/database';

interface ProjectWithCustomer extends Project {
  customers: Customer;
}

export function CollaboratorDashboard() {
  const { user, profile } = useAuth();

  // Fetch projects the collaborator has access to
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['collaborator-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, customers(*)')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ProjectWithCustomer[];
    },
    enabled: !!user,
  });

  // Fetch tasks across accessible projects
  const { data: tasks } = useQuery({
    queryKey: ['collaborator-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, project_id');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch support team (vendor staff who are collaborators on user's projects)
  const { data: supportTeam } = useQuery({
    queryKey: ['collaborator-support-team', user?.id],
    queryFn: async () => {
      if (!projects?.length) return [];
      const projectIds = projects.map((p) => p.id);
      const { data: collabs, error } = await supabase
        .from('project_collaborators')
        .select('user_id, role, profiles(id, full_name, avatar_url, email, title)')
        .in('project_id', projectIds);
      if (error) throw error;

      // Deduplicate by user_id, exclude current user
      const seen = new Set<string>();
      const team: Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        email: string;
        title?: string | null;
        role: string;
      }> = [];
      for (const c of collabs || []) {
        const p = c.profiles as unknown as Profile;
        if (p && !seen.has(p.id) && p.id !== user?.id) {
          seen.add(p.id);
          team.push({ ...p, role: c.role });
        }
      }
      return team;
    },
    enabled: !!user && !!projects?.length,
  });

  // Fetch milestones for progress
  const { data: milestones } = useQuery({
    queryKey: ['collaborator-milestones', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('id, status, project_id, name, target_date')
        .order('target_date');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0;
  const blockedTasks = tasks?.filter((t) => t.status === 'blocked').length || 0;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const atRiskProjects = projects?.filter(
    (p) => p.status === 'at_risk' || (p.health_score && p.health_score < 50)
  ) || [];

  const upcomingMilestones = milestones
    ?.filter((m) => m.status !== 'completed' && new Date(m.target_date) >= new Date())
    .slice(0, 4) || [];

  const overdueMilestones = milestones
    ?.filter((m) => m.status !== 'completed' && new Date(m.target_date) < new Date()) || [];

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'} 👋
          </h2>
          <p className="text-muted-foreground mt-1 max-w-lg">
            Here's the latest on your implementation projects.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card border-0 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            {projectsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground">{taskProgress}%</p>
                <Progress value={taskProgress} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">{completedTasks} of {totalTasks} tasks completed</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-info/10 to-info/5">
                <FolderKanban className="h-5 w-5 text-info" />
              </div>
            </div>
            {projectsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground">{projects?.filter(p => p.status === 'in_progress').length || 0}</p>
                <p className="text-xs text-muted-foreground mt-2">{projects?.length || 0} total projects</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-0 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Items Needing Attention</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-warning/10 to-warning/5">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
            </div>
            {projectsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground">{atRiskProjects.length + blockedTasks + overdueMilestones.length}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {atRiskProjects.length} at-risk projects · {blockedTasks} blocked tasks
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects */}
        <Card className="lg:col-span-2 shadow-card border-0 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Your Projects</CardTitle>
            <Link to="/projects" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {projectsLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="divide-y divide-border">
                {projects.slice(0, 5).map((project) => (
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
                          Target: {new Date(project.target_end_date).toLocaleDateString()}
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
                <p className="text-muted-foreground">No projects assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Red Flags */}
        <Card className="shadow-card border-0 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {projectsLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (atRiskProjects.length > 0 || overdueMilestones.length > 0) ? (
              <div className="divide-y divide-border">
                {atRiskProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <HealthScore score={project.health_score || 0} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{project.name}</p>
                      <p className="text-xs text-destructive">Project at risk</p>
                    </div>
                  </Link>
                ))}
                {overdueMilestones.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                      <Clock className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">{m.name}</p>
                      <p className="text-xs text-destructive">Overdue since {new Date(m.target_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium text-foreground">Everything looks good!</p>
                <p className="text-xs text-muted-foreground mt-1">No red flags</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Support Team */}
      <Card className="shadow-card border-0 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Your Support Team</CardTitle>
        </CardHeader>
        <CardContent>
          {!supportTeam || supportTeam.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members assigned yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {supportTeam.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4 hover:bg-muted/60 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{member.full_name || 'Team Member'}</p>
                    <p className="text-xs text-muted-foreground truncate capitalize">{member.role?.replace('_', ' ')}</p>
                    {member.title && (
                      <p className="text-xs text-muted-foreground truncate">{member.title}</p>
                    )}
                  </div>
                  <a
                    href={`mailto:${member.email}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={`Email ${member.full_name}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <Card className="shadow-card border-0 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Upcoming Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {upcomingMilestones.map((m) => {
                const project = projects?.find((p) => p.id === m.project_id);
                return (
                  <div key={m.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-foreground text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{project?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(m.target_date).toLocaleDateString()}
                      </p>
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
