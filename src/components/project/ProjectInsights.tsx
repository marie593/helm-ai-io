import { useQuery } from '@tanstack/react-query';
import { Lightbulb, FileText, Palette, Presentation, ExternalLink, Plus, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ProjectInsightsProps {
  projectId: string;
}

export function ProjectInsights({ projectId }: ProjectInsightsProps) {
  // Fetch feedback insights for this project
  const { data: feedbackItems, isLoading } = useQuery({
    queryKey: ['project-insights', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const themes = feedbackItems?.flatMap(f => f.ai_themes || []) || [];
  const uniqueThemes = [...new Set(themes)];
  const sentimentCounts = feedbackItems?.reduce((acc, f) => {
    if (f.ai_sentiment) acc[f.ai_sentiment] = (acc[f.ai_sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      {/* Export Integration Tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Notion Tile */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <CardTitle className="text-base">Notion</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3 text-xs">
              Export insights and reports to Notion pages
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.location.href = '/integrations'}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Connect
            </Button>
          </CardContent>
        </Card>

        {/* Canva Tile */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <CardTitle className="text-base">Canva</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3 text-xs">
              Create visual reports and infographics from insights
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled
            >
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Google Slides Tile */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <CardTitle className="text-base">Google Slides</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3 text-xs">
              Export insights as presentation decks
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled
            >
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Insights Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Themes */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Top Themes
            </CardTitle>
            <CardDescription>
              AI-extracted themes from project feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : uniqueThemes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No themes extracted yet</p>
                <p className="text-xs mt-1">Themes will appear as feedback is analyzed</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {uniqueThemes.slice(0, 12).map((theme) => (
                  <Badge key={theme} variant="outline" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment Overview */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5" />
              Sentiment Overview
            </CardTitle>
            <CardDescription>
              Customer sentiment from analyzed feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(sentimentCounts).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No sentiment data yet</p>
                <p className="text-xs mt-1">Sentiment analysis will appear with feedback</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(sentimentCounts).map(([sentiment, count]) => (
                  <div key={sentiment} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{sentiment}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Feedback with Insights */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Recent Feedback Insights
          </CardTitle>
          <CardDescription>
            AI-summarized feedback with extracted action items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !feedbackItems || feedbackItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No feedback insights yet</p>
              <p className="text-xs mt-1">Submit feedback to see AI-generated insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackItems.slice(0, 5).map((item) => (
                <div key={item.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.ai_sentiment && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.ai_sentiment}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs capitalize">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                  {item.ai_summary && (
                    <p className="text-xs text-muted-foreground mb-2">{item.ai_summary}</p>
                  )}
                  {item.ai_themes && item.ai_themes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.ai_themes.map((theme) => (
                        <Badge key={theme} variant="outline" className="text-[10px] px-1.5 py-0">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
