import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, isPast } from 'date-fns';
import { Sparkles, CheckCircle2, Circle, Clock, AlertTriangle, ChevronDown, ChevronRight, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProjectRoadmapProps {
  projectId: string;
  projectDescription?: string | null;
}

export function ProjectRoadmap({ projectId, projectDescription }: ProjectRoadmapProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [projectBrief, setProjectBrief] = useState(projectDescription || '');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date');
      
      if (error) throw error;
      return data;
    },
  });

  const generateRoadmap = async (isRefresh = false) => {
    if (!isRefresh && !projectBrief.trim()) {
      toast({ title: 'Please provide a project brief', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setBriefOpen(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body: { projectId, projectBrief, refresh: isRefresh }
      });

      if (error) throw error;

      toast({ title: isRefresh ? 'Roadmap refreshed successfully!' : 'Roadmap generated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast({ 
        title: 'Failed to generate roadmap', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleMilestone = (id: string) => {
    const next = new Set(expandedMilestones);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedMilestones(next);
  };

  const getTasksForMilestone = (milestoneId: string) => {
    return tasks?.filter(t => t.milestone_id === milestoneId) || [];
  };

  const getMilestoneProgress = (milestoneId: string) => {
    const milestoneTasks = getTasksForMilestone(milestoneId);
    if (milestoneTasks.length === 0) return 0;
    const completed = milestoneTasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / milestoneTasks.length) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'delayed':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
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

  if (!milestones || milestones.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Sparkles className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No roadmap yet</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Generate an AI-powered implementation roadmap with milestones and tasks
          </p>
          <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
            <DialogTrigger asChild>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Roadmap
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Implementation Roadmap</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="brief">Project Brief</Label>
                  <Textarea
                    id="brief"
                    placeholder="Describe the project goals, requirements, integrations needed, timeline constraints, and any special considerations..."
                    value={projectBrief}
                    onChange={(e) => setProjectBrief(e.target.value)}
                    className="min-h-[150px] mt-2"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBriefOpen(false)}>Cancel</Button>
                <Button onClick={() => generateRoadmap(false)} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Implementation Roadmap</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => generateRoadmap(true)} 
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Refreshing...' : 'Refresh Roadmap'}
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {milestones.map((milestone, index) => {
          const progress = getMilestoneProgress(milestone.id);
          const milestoneTasks = getTasksForMilestone(milestone.id);
          const isExpanded = expandedMilestones.has(milestone.id);
          const isPastDue = isPast(new Date(milestone.target_date)) && milestone.status !== 'completed';
          
          return (
            <Card key={milestone.id} className="shadow-card">
              <CardContent className="p-4">
                <div 
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => toggleMilestone(milestone.id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    {getStatusIcon(milestone.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Phase {index + 1}
                      </span>
                      <h3 className="font-semibold text-foreground">{milestone.name}</h3>
                      {isPastDue && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-medium',
                      isPastDue ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {milestoneTasks.length} tasks
                    </p>
                  </div>
                  
                  <div className="w-24">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center mt-1">{progress}%</p>
                  </div>
                </div>
                
                {isExpanded && milestoneTasks.length > 0 && (
                  <div className="mt-4 ml-10 space-y-2 border-l-2 border-border pl-4">
                    {milestoneTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        {getStatusIcon(task.status)}
                        <div className="flex-1">
                          <p className={cn(
                            'text-sm',
                            task.status === 'completed' && 'line-through text-muted-foreground'
                          )}>
                            {task.title}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            task.priority === 'high' && 'border-warning text-warning',
                            task.priority === 'urgent' && 'border-destructive text-destructive'
                          )}
                        >
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
