import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  MessageSquare, Bug, Lightbulb, HelpCircle, AlertCircle, 
  Plus, Sparkles, ThumbsUp, ArrowUpRight, Filter,
  Mail, MessageCircle, Phone, Ticket
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FeedbackTrackerProps {
  projectId: string;
}

type FeedbackSource = 'email' | 'chat' | 'call' | 'ticket' | 'manual';
type FeedbackType = 'bug' | 'feature_request' | 'feedback' | 'question' | 'complaint';

export function FeedbackTracker({ projectId }: FeedbackTrackerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [source, setSource] = useState<FeedbackSource>('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedback', projectId],
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

  const submitFeedback = async () => {
    if (!content.trim()) {
      toast({ title: 'Please enter feedback content', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-feedback', {
        body: { content, source, projectId }
      });

      if (error) throw error;

      toast({ title: 'Feedback processed successfully!' });
      queryClient.invalidateQueries({ queryKey: ['feedback', projectId] });
      setContent('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error processing feedback:', error);
      toast({ 
        title: 'Failed to process feedback', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4 text-destructive" />;
      case 'feature_request':
        return <Lightbulb className="h-4 w-4 text-warning" />;
      case 'question':
        return <HelpCircle className="h-4 w-4 text-primary" />;
      case 'complaint':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSourceIcon = (source: FeedbackSource) => {
    switch (source) {
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'chat':
        return <MessageCircle className="h-3 w-3" />;
      case 'call':
        return <Phone className="h-3 w-3" />;
      case 'ticket':
        return <Ticket className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-primary/20 text-primary';
      case 'acknowledged':
        return 'bg-muted text-muted-foreground';
      case 'in_progress':
        return 'bg-warning/20 text-warning';
      case 'resolved':
        return 'bg-success/20 text-success';
      case 'wont_fix':
        return 'bg-muted text-muted-foreground line-through';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredFeedback = feedback?.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'features') return item.type === 'feature_request';
    if (activeFilter === 'bugs') return item.type === 'bug';
    if (activeFilter === 'open') return ['new', 'acknowledged', 'in_progress'].includes(item.status);
    return true;
  });

  const stats = {
    total: feedback?.length || 0,
    open: feedback?.filter(f => ['new', 'acknowledged', 'in_progress'].includes(f.status)).length || 0,
    features: feedback?.filter(f => f.type === 'feature_request').length || 0,
    bugs: feedback?.filter(f => f.type === 'bug').length || 0,
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card 
          className={cn('shadow-card cursor-pointer transition-colors', activeFilter === 'all' && 'ring-2 ring-primary')}
          onClick={() => setActiveFilter('all')}
        >
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card 
          className={cn('shadow-card cursor-pointer transition-colors', activeFilter === 'open' && 'ring-2 ring-primary')}
          onClick={() => setActiveFilter('open')}
        >
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-primary">{stats.open}</p>
            <p className="text-sm text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card 
          className={cn('shadow-card cursor-pointer transition-colors', activeFilter === 'features' && 'ring-2 ring-primary')}
          onClick={() => setActiveFilter('features')}
        >
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-warning">{stats.features}</p>
            <p className="text-sm text-muted-foreground">Feature Requests</p>
          </CardContent>
        </Card>
        <Card 
          className={cn('shadow-card cursor-pointer transition-colors', activeFilter === 'bugs' && 'ring-2 ring-primary')}
          onClick={() => setActiveFilter('bugs')}
        >
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{stats.bugs}</p>
            <p className="text-sm text-muted-foreground">Bugs</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Feedback & Requests</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Add Client Feedback
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="source">Source</Label>
                <Select value={source} onValueChange={(v) => setSource(v as FeedbackSource)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="call">Call Transcript</SelectItem>
                    <SelectItem value="ticket">Support Ticket</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Paste the email, chat transcript, call notes, or describe the feedback..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px] mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  AI will automatically extract action items, categorize the feedback, and detect sentiment
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={submitFeedback} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Process with AI
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Feedback List */}
      {filteredFeedback && filteredFeedback.length > 0 ? (
        <div className="space-y-3">
          {filteredFeedback.map((item) => (
            <Card key={item.id} className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getTypeIcon(item.type as FeedbackType)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <Badge className={cn('text-xs', getStatusColor(item.status))}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {getSourceIcon(item.source as FeedbackSource)}
                        {item.source}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.ai_summary || item.description}
                    </p>
                    
                    {item.ai_themes && item.ai_themes.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {item.ai_themes.slice(0, 4).map((theme: string) => (
                          <Badge key={theme} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {item.submitted_by && (
                        <span>From: {item.submitted_by}</span>
                      )}
                      <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                      {item.ai_sentiment && (
                        <span className={getSentimentColor(item.ai_sentiment)}>
                          {item.ai_sentiment} sentiment
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        item.priority === 'high' && 'border-warning text-warning',
                        item.priority === 'urgent' && 'border-destructive text-destructive'
                      )}
                    >
                      {item.priority}
                    </Badge>
                    {item.votes > 0 && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {item.votes}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No feedback yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Add client feedback from emails, calls, or support tickets. AI will automatically extract insights.
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Feedback
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
