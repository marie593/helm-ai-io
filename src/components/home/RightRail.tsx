import { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Radio, ExternalLink, X, Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { HomeTask, Flag, Signal, MOCK_TASKS, MOCK_FLAGS, MOCK_SIGNALS } from '@/types/home';
import { format, formatDistanceToNow } from 'date-fns';

// ─── Task Tile ───────────────────────────────────────────
function TasksTile() {
  const [tasks, setTasks] = useState<HomeTask[]>(MOCK_TASKS);
  const [selected, setSelected] = useState<HomeTask | null>(null);

  const markDone = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const priorityColor: Record<string, string> = {
    urgent: 'bg-destructive/10 text-destructive',
    high: 'bg-warning/10 text-warning',
    medium: 'bg-info/10 text-info',
    low: 'bg-muted text-muted-foreground',
  };

  return (
    <>
      <RailCard title="Upcoming Tasks" icon={<Clock className="h-4 w-4 text-primary" />} count={tasks.length}>
        {tasks.length === 0 ? (
          <EmptyState text="All caught up!" />
        ) : (
          tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.projectName}</p>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', priorityColor[t.priority])}>
                  {t.priority}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Due {formatDistanceToNow(new Date(t.dueDate), { addSuffix: true })}
              </p>
            </button>
          ))
        )}
      </RailCard>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.projectName} · Due {selected && format(new Date(selected.dueDate), 'MMM d')}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => { markDone(selected!.id); setSelected(null); }}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Done
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              <Clock className="h-4 w-4 mr-1" /> Snooze
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Flags Tile ──────────────────────────────────────────
function FlagsTile() {
  const [flags, setFlags] = useState<Flag[]>(MOCK_FLAGS);
  const [selected, setSelected] = useState<Flag | null>(null);

  const resolve = (id: string) => setFlags((prev) => prev.filter((f) => f.id !== id));

  return (
    <>
      <RailCard title="Top Flags" icon={<AlertTriangle className="h-4 w-4 text-warning" />} count={flags.length}>
        {flags.length === 0 ? (
          <EmptyState text="No active flags" />
        ) : (
          flags.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelected(f)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className={cn('mt-1 h-2 w-2 rounded-full shrink-0', f.severity === 'critical' ? 'bg-destructive' : 'bg-warning')} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.projectName} · {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </RailCard>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.projectName} · {selected?.severity} severity</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="destructive" onClick={() => { resolve(selected!.id); setSelected(null); }}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              <BellOff className="h-4 w-4 mr-1" /> Snooze
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Signals Tile ────────────────────────────────────────
function SignalsTile() {
  const [signals, setSignals] = useState<Signal[]>(MOCK_SIGNALS);
  const [selected, setSelected] = useState<Signal | null>(null);

  const markRead = (id: string) => setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, read: true } : s)));

  const sourceIcon: Record<string, string> = { email: '📧', chat: '💬', call: '📞', ticket: '🎫' };

  return (
    <>
      <RailCard title="Recent Signals" icon={<Radio className="h-4 w-4 text-info" />} count={signals.filter((s) => !s.read).length}>
        {signals.length === 0 ? (
          <EmptyState text="No new signals" />
        ) : (
          signals.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelected(s); markRead(s.id); }}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors',
                !s.read && 'bg-primary/[0.03]'
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">{sourceIcon[s.source]}</span>
                <div className="min-w-0">
                  <p className={cn('text-sm truncate', !s.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.projectName} · {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true })}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </RailCard>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>
              {selected?.source} from {selected?.projectName} · {selected && formatDistanceToNow(new Date(selected.timestamp), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => setSelected(null)}>
              <ExternalLink className="h-4 w-4 mr-1" /> Open Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Shared Components ───────────────────────────────────
function RailCard({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <Card className="shadow-subtle border-border/60 bg-card">
      <CardHeader className="px-3 py-3 pb-1 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
        {count > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold">
            {count}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="px-1.5 pb-2 pt-1 space-y-0.5">
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground text-center py-4">{text}</p>
  );
}

// ─── Export ──────────────────────────────────────────────
export function RightRail() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
        <TasksTile />
        <FlagsTile />
        <SignalsTile />
      </div>
    </ScrollArea>
  );
}
