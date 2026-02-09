import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageSquare, Send, Loader2, ExternalLink, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/sonner';

interface ProjectChatsProps {
  projectId: string;
}

export function ProjectChats({ projectId }: ProjectChatsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  // Fetch activity feed as chat thread
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['project-chat-activity', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch Gmail integration status
  const { data: gmailIntegration } = useQuery({
    queryKey: ['gmail-integration-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmail_integrations')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Send in-app chat message
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('activity_feed').insert({
        project_id: projectId,
        user_id: user?.id,
        activity_type: 'chat_message',
        title: 'Chat Message',
        description: content,
        metadata: { source: 'in_app' },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-chat-activity', projectId] });
      setMessage('');
    },
    onError: (error: Error) => {
      toast.error('Failed to send message', { description: error.message });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate(message.trim());
  };

  const chatActivities = activities?.filter(a =>
    ['chat_message', 'email_imported', 'slack_message'].includes(a.activity_type)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Integration Tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Gmail Tile */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📧</span>
                <CardTitle className="text-base">Gmail</CardTitle>
              </div>
              {gmailIntegration ? (
                <Badge className="bg-success/10 text-success border-0 text-xs">Connected</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3 text-xs">
              Import emails and parse them for action items
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.location.href = '/integrations'}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              {gmailIntegration ? 'Manage' : 'Connect'}
            </Button>
          </CardContent>
        </Card>

        {/* Slack Tile */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <CardTitle className="text-base">Slack</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">Not Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3 text-xs">
              Sync Slack channels and log conversations
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

        {/* In-App Chat Tile */}
        <Card className="shadow-card border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💭</span>
                <CardTitle className="text-base">In-App Chat</CardTitle>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 text-xs">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-3 text-xs">
              Send messages directly within this project
            </CardDescription>
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => document.getElementById('chat-input')?.focus()}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Start Chatting
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Activity Thread */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Activity Thread
          </CardTitle>
          <CardDescription>
            All chats from Gmail, Slack, and in-app messages in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : chatActivities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start a conversation or connect an integration</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatActivities.map((activity) => {
                  const meta = activity.metadata as Record<string, unknown> | null;
                  const source = (meta?.source as string) || 'system';
                  const sourceIcon = source === 'gmail' ? '📧' : source === 'slack' ? '💬' : '💭';

                  return (
                    <div key={activity.id} className="flex gap-3">
                      <span className="text-lg mt-0.5 shrink-0">{sourceIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{activity.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <Separator className="my-4" />

          {/* Chat Input */}
          <div className="flex gap-2">
            <Textarea
              id="chat-input"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
