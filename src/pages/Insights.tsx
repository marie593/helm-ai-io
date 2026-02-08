import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles,
  Bug, Lightbulb, MessageSquare, BarChart3, Users, FolderKanban
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Insights() {
  // Fetch all feedback items across projects
  const { data: allFeedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['all-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_items')
        .select('*, projects(name, customers(name))')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch projects for stats
  const { data: projects } = useQuery({
    queryKey: ['projects-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate theme aggregations
  const themeStats = allFeedback?.reduce((acc, item) => {
    if (item.ai_themes) {
      item.ai_themes.forEach((theme: string) => {
        if (!acc[theme]) {
          acc[theme] = { count: 0, projects: new Set(), types: {} };
        }
        acc[theme].count++;
        if (item.projects?.name) {
          acc[theme].projects.add(item.projects.name);
        }
        const type = item.type || 'feedback';
        acc[theme].types[type] = (acc[theme].types[type] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, { count: number; projects: Set<string>; types: Record<string, number> }>);

  const sortedThemes = themeStats 
    ? Object.entries(themeStats)
        .map(([theme, data]) => ({
          theme,
          count: data.count,
          projectCount: data.projects.size,
          projects: Array.from(data.projects),
          types: data.types,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];

  // Calculate type breakdown
  const typeBreakdown = allFeedback?.reduce((acc, item) => {
    const type = item.type || 'feedback';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Calculate stats
  const stats = {
    totalFeedback: allFeedback?.length || 0,
    openItems: allFeedback?.filter(f => ['new', 'acknowledged', 'in_progress'].includes(f.status)).length || 0,
    featureRequests: allFeedback?.filter(f => f.type === 'feature_request').length || 0,
    bugs: allFeedback?.filter(f => f.type === 'bug').length || 0,
    avgHealthScore: projects?.length 
      ? Math.round(projects.reduce((sum, p) => sum + (p.health_score || 100), 0) / projects.length)
      : 0,
    atRiskProjects: projects?.filter(p => p.status === 'at_risk').length || 0,
  };

  // Recent critical feedback
  const criticalFeedback = allFeedback
    ?.filter(f => f.priority === 'urgent' || f.priority === 'high')
    .slice(0, 5) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4 text-destructive" />;
      case 'feature_request':
        return <Lightbulb className="h-4 w-4 text-warning" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <AppLayout
      title="Product Insights"
      description="Cross-customer feedback analysis and trends"
    >
      <div className="space-y-6 animate-fade-in">
        {/* KPI Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <KPICard
            title="Avg. Health Score"
            value={stats.avgHealthScore.toString()}
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
            trend="up"
            change="+5%"
          />
          <KPICard
            title="Total Feedback"
            value={stats.totalFeedback.toString()}
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
            trend="neutral"
            change={`${stats.openItems} open`}
          />
          <KPICard
            title="Feature Requests"
            value={stats.featureRequests.toString()}
            icon={<Lightbulb className="h-5 w-5 text-warning" />}
            trend="up"
            change="Across all projects"
          />
          <KPICard
            title="At Risk Projects"
            value={stats.atRiskProjects.toString()}
            icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
            trend={stats.atRiskProjects > 0 ? "down" : "neutral"}
            change={stats.atRiskProjects > 0 ? "Needs attention" : "All healthy"}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Themes */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Top Feedback Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : sortedThemes.length > 0 ? (
                <div className="space-y-4">
                  {sortedThemes.map((theme, index) => (
                    <div key={theme.theme} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <span className="font-medium text-foreground capitalize">
                            {theme.theme}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {theme.count} mentions
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {theme.projectCount} projects
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={(theme.count / (sortedThemes[0]?.count || 1)) * 100} 
                        className="h-2"
                      />
                      <div className="flex gap-1">
                        {Object.entries(theme.types).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type.replace('_', ' ')}: {count as number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No feedback data yet</p>
                  <p className="text-sm">Add feedback to projects to see insights</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Type Breakdown */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Feedback by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackLoading ? (
                <Skeleton className="h-48" />
              ) : Object.keys(typeBreakdown).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(typeBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const total = stats.totalFeedback || 1;
                      const percentage = Math.round((count / total) * 100);
                      
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(type)}
                              <span className="font-medium text-foreground capitalize">
                                {type.replace('_', ' ')}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No data to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Critical Feedback */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              High Priority Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : criticalFeedback.length > 0 ? (
              <div className="space-y-3">
                {criticalFeedback.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-4 p-4 rounded-lg bg-accent/50"
                  >
                    {getTypeIcon(item.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{item.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            item.priority === 'urgent' && 'border-destructive text-destructive',
                            item.priority === 'high' && 'border-warning text-warning'
                          )}
                        >
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {item.ai_summary || item.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {(item as any).projects?.name || 'Unknown project'}
                        </span>
                        <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-success opacity-50" />
                <p>No high priority items</p>
                <p className="text-sm">All feedback is under control</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="shadow-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">More insights coming soon</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Trend analysis, predictive recommendations, and automated alerts will be available as you add more data.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function KPICard({
  title,
  value,
  icon,
  trend,
  change,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
  change: string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : CheckCircle2;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            {change}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
