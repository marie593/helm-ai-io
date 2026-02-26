import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, FileText, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChatMessage, MOCK_MESSAGES } from '@/types/home';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const QUICK_ACTIONS = [
  { label: 'Summarize call', icon: FileText },
  { label: 'Update roadmap', icon: RotateCcw },
  { label: 'Create ticket', icon: Sparkles },
  { label: 'Flag risk', icon: AlertTriangle },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface ChatPaneProps {
  customerId?: string | null;
}

export function ChatPane({ customerId }: ChatPaneProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const streamChat = async (allMessages: { role: string; content: string }[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: 'Not authenticated', description: 'Please log in to use chat.', variant: 'destructive' });
      return;
    }

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        customerId: customerId || 'all',
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
      if (resp.status === 429) {
        toast({ title: 'Rate limited', description: err.error, variant: 'destructive' });
      } else if (resp.status === 402) {
        toast({ title: 'Credits exhausted', description: err.error, variant: 'destructive' });
      } else {
        toast({ title: 'Chat error', description: err.error || 'Something went wrong', variant: 'destructive' });
      }
      throw new Error(err.error);
    }

    if (!resp.body) throw new Error('No response body');
    return resp.body;
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    // Build conversation history (exclude streaming markers)
    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const body = await streamChat(history);
      if (!body) { setIsStreaming(false); return; }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantSoFar = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: snapshot } : m
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: snapshot } : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }

      // Mark streaming done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (e) {
      console.error('Chat stream error:', e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleQuickAction = (label: string) => {
    setInput(label);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-5 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Sparkles className="h-10 w-10 text-primary/40 mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">What can I help you with?</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask me to summarize a project, flag a risk, create a task, or get a briefing on any customer.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn('animate-fade-in', msg.role === 'system' && 'flex justify-center')}>
              {msg.role === 'system' ? (
                <span className="text-xs text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              ) : (
                <div
                  className={cn(
                    'group flex flex-col gap-1',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%]',
                      msg.role === 'user'
                        ? 'bg-accent text-accent-foreground rounded-br-md'
                        : 'bg-card border border-border shadow-subtle rounded-bl-md'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-neutral max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse-soft ml-0.5 align-text-bottom rounded-sm" />
                        )}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {format(new Date(msg.timestamp), 'h:mm a')}
                  </span>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t border-border bg-card/60 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Quick actions */}
          <div className="flex gap-2 mb-2 flex-wrap">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
                onClick={() => handleQuickAction(action.label)}
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Helm anything…"
              className="min-h-[44px] max-h-32 resize-none pr-20 bg-background border-border/60 rounded-xl text-sm"
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-7 w-7"
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
