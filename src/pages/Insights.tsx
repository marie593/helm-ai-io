import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';

export default function Insights() {
  return (
    <AppLayout
      title="Insights"
      description="AI-powered analytics across all implementations"
    >
      <div className="space-y-6 animate-fade-in">
        {/* KPI Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <KPICard
            title="Avg. Health Score"
            value="87"
            trend="up"
            change="+5%"
          />
          <KPICard
            title="On-Time Rate"
            value="92%"
            trend="up"
            change="+2%"
          />
          <KPICard
            title="Ticket Velocity"
            value="24/week"
            trend="down"
            change="-12%"
          />
          <KPICard
            title="At Risk Projects"
            value="2"
            trend="neutral"
            change="No change"
          />
        </div>

        {/* AI Insights */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <InsightItem
                type="warning"
                title="Milestone Risk Detected"
                description="Project 'Acme Corp Integration' has a 78% chance of missing the Q1 milestone based on current ticket velocity."
              />
              <InsightItem
                type="success"
                title="Strong Adoption Pattern"
                description="3 implementations showing above-average user adoption rates. Consider using their onboarding flow as a template."
              />
              <InsightItem
                type="info"
                title="Recommended Action"
                description="Schedule check-in calls for 2 projects approaching Day 45 mark. Historical data shows this is a critical engagement point."
              />
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="shadow-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">More insights coming soon</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Detailed analytics, trend analysis, and predictive recommendations will be available as you add more data.
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
  trend,
  change,
}: {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  change: string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : CheckCircle2;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-end justify-between mt-2">
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

function InsightItem({
  type,
  title,
  description,
}: {
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
}) {
  const icons = {
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    success: <CheckCircle2 className="h-5 w-5 text-success" />,
    info: <Sparkles className="h-5 w-5 text-primary" />,
  };

  const bgColors = {
    warning: 'bg-warning/10',
    success: 'bg-success/10',
    info: 'bg-primary/10',
  };

  return (
    <div className={`flex gap-4 p-4 rounded-lg ${bgColors[type]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div>
        <h4 className="font-semibold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
