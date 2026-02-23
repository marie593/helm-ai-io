import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, subDays, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Sparkles, BarChart3, AlertTriangle, Clock,
  Bug, Lightbulb, MessageSquare, Users, FolderKanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type InsightSection = 'themes' | 'types' | 'priority' | 'time-to-value';

const SECTION_META: Record<InsightSection, { title: string; icon: React.ReactNode }> = {
  themes: { title: 'Feedback Themes', icon: <Sparkles className="h-5 w-5 text-primary" /> },
  types: { title: 'Feedback by Type', icon: <BarChart3 className="h-5 w-5 text-primary" /> },
  priority: { title: 'High Priority Items', icon: <AlertTriangle className="h-5 w-5 text-warning" /> },
  'time-to-value': { title: 'Time-to-Value', icon: <Clock className="h-5 w-5 text-primary" /> },
};

const TIME_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
];

function getDateCutoff(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case '7d': return subDays(now, 7);
    case '30d': return subDays(now, 30);
    case '90d': return subDays(now, 90);
    case '6m': return subMonths(now, 6);
    default: return null;
  }
}

export default function InsightDetail() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const currentSection = (section as InsightSection) || 'themes';
  const meta = SECTION_META[currentSection] || SECTION_META.themes;

  const [timeRange, setTimeRange] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');

  const { data: allFeedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['all-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_items')
        .select('*, projects(name, customer_id, customers(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, customers(name)');
      if (error) throw error;
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Apply filters
  const filteredFeedback = useMemo(() => {
    if (!allFeedback) return [];
    const cutoff = getDateCutoff(timeRange);
    return allFeedback.filter((item) => {
      if (cutoff && new Date(item.created_at) < cutoff) return false;
      if (customerFilter !== 'all' && (item as any).projects?.customer_id !== customerFilter) return false;
      return true;
    });
  }, [allFeedback, timeRange, customerFilter]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      if (customerFilter !== 'all' && p.customer_id !== customerFilter) return false;
      const cutoff = getDateCutoff(timeRange);
      if (cutoff && new Date(p.start_date) < cutoff) return false;
      return true;
    });
  }, [projects, timeRange, customerFilter]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="h-4 w-4 text-destructive" />;
      case 'feature_request': return <Lightbulb className="h-4 w-4 text-warning" />;
      default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <AppLayout
      title={meta.title}
      description="Filtered view with detailed breakdown"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Back + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/insights')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Insights
          </Button>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[180px]">
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
        </div>

        {/* Section Content */}
        {currentSection === 'themes' && (
          <ThemesDetail feedback={filteredFeedback} loading={feedbackLoading} />
        )}
        {currentSection === 'types' && (
          <TypesDetail feedback={filteredFeedback} loading={feedbackLoading} getTypeIcon={getTypeIcon} />
        )}
        {currentSection === 'priority' && (
          <PriorityDetail feedback={filteredFeedback} loading={feedbackLoading} getTypeIcon={getTypeIcon} />
        )}
        {currentSection === 'time-to-value' && (
          <TimeToValueDetail projects={filteredProjects} />
        )}
      </div>
    </AppLayout>
  );
}

/* ---- Sub-sections ---- */

function ThemesDetail({ feedback, loading }: { feedback: any[]; loading: boolean }) {
  const themeStats = feedback.reduce((acc, item) => {
    if (item.ai_themes) {
      item.ai_themes.forEach((theme: string) => {
        if (!acc[theme]) acc[theme] = { count: 0, projects: new Set(), types: {} as Record<string, number> };
        acc[theme].count++;
        if (item.projects?.name) acc[theme].projects.add(item.projects.name);
        const type = item.type || 'feedback';
        acc[theme].types[type] = (acc[theme].types[type] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, { count: number; projects: Set<string>; types: Record<string, number> }>);

  const sorted = Object.entries(themeStats)
    .map(([theme, data]: [string, any]) => ({ theme, count: data.count, projectCount: data.projects.size, types: data.types as Record<string, number> }))
    .sort((a, b) => b.count - a.count);

  if (loading) return <Skeleton className="h-64" />;
  if (sorted.length === 0) return <EmptyState icon={<Sparkles />} text="No themes found" />;

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {sorted.map((theme, i) => (
            <div key={theme.theme} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-6">#{i + 1}</span>
                  <span className="font-medium text-foreground capitalize">{theme.theme}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{theme.count} mentions</Badge>
                  <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />{theme.projectCount} projects
                  </Badge>
                </div>
              </div>
              <Progress value={(theme.count / (sorted[0]?.count || 1)) * 100} className="h-2" />
              <div className="flex gap-1">
                {Object.entries(theme.types).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-xs">{type.replace('_', ' ')}: {count as number}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TypesDetail({ feedback, loading, getTypeIcon }: { feedback: any[]; loading: boolean; getTypeIcon: (t: string) => React.ReactNode }) {
  const breakdown = feedback.reduce((acc, item) => {
    const type = item.type || 'feedback';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = feedback.length || 1;
  if (loading) return <Skeleton className="h-48" />;
  if (Object.keys(breakdown).length === 0) return <EmptyState icon={<BarChart3 />} text="No feedback data" />;

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6 space-y-4">
        {Object.entries(breakdown).sort(([, a], [, b]) => (b as number) - (a as number)).map(([type, count]) => {
          const numCount = count as number;
          const pct = Math.round((numCount / total) * 100);
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(type)}
                  <span className="font-medium text-foreground capitalize">{type.replace('_', ' ')}</span>
                </div>
                <span className="text-sm text-muted-foreground">{numCount} ({pct}%)</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PriorityDetail({ feedback, loading, getTypeIcon }: { feedback: any[]; loading: boolean; getTypeIcon: (t: string) => React.ReactNode }) {
  const items = feedback.filter(f => f.priority === 'urgent' || f.priority === 'high');
  if (loading) return <Skeleton className="h-48" />;
  if (items.length === 0) return <EmptyState icon={<AlertTriangle />} text="No high priority items" />;

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-accent/50">
            {getTypeIcon(item.type)}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground">{item.title}</h4>
                <Badge variant="outline" className={cn('text-xs', item.priority === 'urgent' && 'border-destructive text-destructive', item.priority === 'high' && 'border-warning text-warning')}>
                  {item.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.ai_summary || item.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><FolderKanban className="h-3 w-3" />{item.projects?.name || 'Unknown'}</span>
                <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TimeToValueDetail({ projects }: { projects: any[] }) {
  if (!projects || projects.length === 0) return <EmptyState icon={<Clock />} text="No project data" />;

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Target End</TableHead>
              <TableHead className="text-right">Days Elapsed</TableHead>
              <TableHead className="text-right">Target (days)</TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.slice().sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()).map((project) => {
              const start = new Date(project.start_date);
              const targetEnd = new Date(project.target_end_date);
              const now = new Date();
              const endRef = project.status === 'completed' ? targetEnd : now;
              const elapsed = differenceInDays(endRef, start);
              const targetDays = differenceInDays(targetEnd, start);
              const pct = targetDays > 0 ? Math.min(Math.round((elapsed / targetDays) * 100), 100) : 0;
              const overdue = elapsed > targetDays && project.status !== 'completed';
              return (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{project.customers?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs capitalize', project.status === 'completed' && 'border-success text-success', project.status === 'at_risk' && 'border-destructive text-destructive', project.status === 'in_progress' && 'border-primary text-primary')}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(start, 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(targetEnd, 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right font-medium"><span className={overdue ? 'text-destructive' : ''}>{elapsed}d</span></TableCell>
                  <TableCell className="text-right text-muted-foreground">{targetDays}d</TableCell>
                  <TableCell className="w-[140px]">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className={cn('h-2 flex-1', overdue && '[&>div]:bg-destructive')} />
                      <span className={cn('text-xs font-medium w-10 text-right', overdue ? 'text-destructive' : 'text-muted-foreground')}>{pct}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="h-12 w-12 mb-2 opacity-50">{icon}</div>
        <p>{text}</p>
      </CardContent>
    </Card>
  );
}
