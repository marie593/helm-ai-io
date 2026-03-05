import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Plus, GripVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface CustomerGoal {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface NorthStarGoalsProps {
  customerId: string;
}

export function NorthStarGoals({ customerId }: NorthStarGoalsProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['customer-goals', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_goals')
        .select('*')
        .eq('customer_id', customerId)
        .order('order_index');
      if (error) throw error;
      return data as CustomerGoal[];
    },
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('customer_goals').insert({
        customer_id: customerId,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        order_index: goals.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-goals', customerId] });
      setNewTitle('');
      setNewDescription('');
      setIsAdding(false);
      toast({ title: 'Goal added' });
    },
    onError: () => toast({ title: 'Failed to add goal', variant: 'destructive' }),
  });

  const updateGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_goals')
        .update({ title: editTitle.trim(), description: editDescription.trim() || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-goals', customerId] });
      setEditingId(null);
      toast({ title: 'Goal updated' });
    },
    onError: () => toast({ title: 'Failed to update goal', variant: 'destructive' }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customer_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-goals', customerId] });
      toast({ title: 'Goal removed' });
    },
    onError: () => toast({ title: 'Failed to remove goal', variant: 'destructive' }),
  });

  const startEdit = (goal: CustomerGoal) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditDescription(goal.description || '');
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent shadow-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-primary/10 p-2">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
              North Star Goals
            </h3>
          </div>
          {!isAdding && (
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="text-primary hover:text-primary">
              <Plus className="h-4 w-4 mr-1" />
              Add Goal
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading goals…</p>
        ) : goals.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground">No goals defined yet. Add your first north star goal to keep the team aligned.</p>
        ) : (
          <div className="space-y-3">
            {goals.map((goal, index) => (
              <div key={goal.id}>
                {editingId === goal.id ? (
                  <div className="space-y-2 rounded-lg border border-primary/20 bg-background p-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Goal title"
                      className="font-medium"
                    />
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={() => updateGoal.mutate(goal.id)} disabled={!editTitle.trim()}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start gap-3 rounded-lg p-2.5 hover:bg-primary/5 transition-colors">
                    <div className="flex items-center gap-1 mt-0.5">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <span className="text-xs font-bold text-primary/60 min-w-[1.25rem]">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{goal.title}</p>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(goal)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteGoal.mutate(goal.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="mt-3 space-y-2 rounded-lg border border-primary/20 bg-background p-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Goal title"
              className="font-medium"
              autoFocus
            />
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewTitle(''); setNewDescription(''); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={() => addGoal.mutate()} disabled={!newTitle.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
