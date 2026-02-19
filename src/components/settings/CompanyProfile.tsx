import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Upload, FileText, Link2, Plus, Trash2, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/sonner';

interface DocLink {
  label: string;
  url: string;
}

interface DocFile {
  name: string;
  path: string;
  uploaded_at: string;
}

export function CompanyProfile() {
  const { isVendorAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLink, setNewLink] = useState<DocLink>({ label: '', url: '' });
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});

  // Merge fetched data into form on load
  const getField = (key: string): string => {
    const val = form[key] ?? (profile as Record<string, unknown>)?.[key] ?? '';
    return String(val);
  };

  const docLinks: DocLink[] = (() => {
    const raw = (profile?.documentation_links as unknown) || [];
    if (Array.isArray(raw)) return raw as DocLink[];
    return [];
  })();

  const [uploadedFiles, setUploadedFiles] = useState<DocFile[]>([]);

  // Fetch uploaded files from storage
  const { data: storedFiles } = useQuery({
    queryKey: ['company-docs-files'],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('company-docs').list('', { limit: 100 });
      if (error) throw error;
      return (data || []).map(f => ({
        name: f.name,
        path: f.name,
        uploaded_at: f.created_at || '',
      }));
    },
  });

  const save = useMutation({
    mutationFn: async (fields: Record<string, unknown>) => {
      if (profile?.id) {
        const { error } = await supabase
          .from('company_profile')
          .update(fields)
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_profile')
          .insert(fields);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      toast.success('Company profile saved');
    },
    onError: (err: Error) => {
      toast.error('Failed to save', { description: err.message });
    },
  });

  const handleSave = () => {
    save.mutate({
      company_description: getField('company_description'),
      client_types: getField('client_types'),
      industry: getField('industry'),
      avg_onboarding_length: getField('avg_onboarding_length'),
      onboarding_processes: getField('onboarding_processes'),
      team_size_structure: getField('team_size_structure'),
      tools_tech_stack: getField('tools_tech_stack'),
      success_metrics: getField('success_metrics'),
    });
  };

  const handleAddLink = () => {
    if (!newLink.label.trim() || !newLink.url.trim()) {
      toast.error('Please provide both a label and URL');
      return;
    }
    const updated = [...docLinks, newLink];
    save.mutate({ documentation_links: JSON.stringify(updated) });
    setNewLink({ label: '', url: '' });
  };

  const handleRemoveLink = (index: number) => {
    const updated = docLinks.filter((_, i) => i !== index);
    save.mutate({ documentation_links: JSON.stringify(updated) });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large', { description: 'Max 20MB' });
      return;
    }
    setIsUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('company-docs').upload(path, file);
    setIsUploading(false);
    if (error) {
      toast.error('Upload failed', { description: error.message });
    } else {
      toast.success(`Uploaded ${file.name}`);
      queryClient.invalidateQueries({ queryKey: ['company-docs-files'] });
    }
    e.target.value = '';
  };

  const handleDeleteFile = async (path: string) => {
    const { error } = await supabase.storage.from('company-docs').remove([path]);
    if (error) {
      toast.error('Failed to delete file');
    } else {
      toast.success('File deleted');
      queryClient.invalidateQueries({ queryKey: ['company-docs-files'] });
    }
  };

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const readOnly = !isVendorAdmin;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-5">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">AI Foundation Knowledge</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The information below trains the AI to generate better roadmaps, timelines, and recommendations tailored to your company's onboarding process.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Core Info */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Company Profile
          </CardTitle>
          <CardDescription>
            Describe your company, clients, and industry so the AI understands your context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="company_description">Company Description</Label>
            <Textarea
              id="company_description"
              placeholder="What does your company do? What products/services do you offer?"
              value={getField('company_description')}
              onChange={e => update('company_description', e.target.value)}
              disabled={readOnly}
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g. SaaS, FinTech, Healthcare"
                value={getField('industry')}
                onChange={e => update('industry', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_types">Typical Client Types</Label>
              <Input
                id="client_types"
                placeholder="e.g. Enterprise, SMB, Agencies"
                value={getField('client_types')}
                onChange={e => update('client_types', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="avg_onboarding_length">Average Onboarding Length</Label>
              <Input
                id="avg_onboarding_length"
                placeholder="e.g. 30 days, 6-8 weeks, 90 days"
                value={getField('avg_onboarding_length')}
                onChange={e => update('avg_onboarding_length', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team_size_structure">Team Size & Structure</Label>
              <Input
                id="team_size_structure"
                placeholder="e.g. 5-person CS team, dedicated onboarding manager"
                value={getField('team_size_structure')}
                onChange={e => update('team_size_structure', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding_processes">Onboarding Processes</Label>
            <Textarea
              id="onboarding_processes"
              placeholder="Describe your typical onboarding steps, phases, and milestones..."
              value={getField('onboarding_processes')}
              onChange={e => update('onboarding_processes', e.target.value)}
              disabled={readOnly}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tools_tech_stack">Tools & Tech Stack</Label>
            <Input
              id="tools_tech_stack"
              placeholder="e.g. Salesforce, HubSpot, Jira, Slack"
              value={getField('tools_tech_stack')}
              onChange={e => update('tools_tech_stack', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success_metrics">Success Metrics / KPIs</Label>
            <Textarea
              id="success_metrics"
              placeholder="How do you measure a successful onboarding? e.g. Time-to-value, adoption rate, NPS..."
              value={getField('success_metrics')}
              onChange={e => update('success_metrics', e.target.value)}
              disabled={readOnly}
              rows={3}
            />
          </div>

          {!readOnly && (
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Company Profile
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Documentation & Resources
          </CardTitle>
          <CardDescription>
            Upload existing playbooks, SOPs, or link Notion pages — the AI will reference these when building roadmaps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Uploaded Files */}
          <div className="space-y-3">
            <Label>Uploaded Documents</Label>
            {(storedFiles || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No documents uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {(storedFiles || []).map(file => (
                  <div key={file.path} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDeleteFile(file.path)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!readOnly && (
              <>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                  Upload Document
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.pptx,.xlsx,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </>
            )}
          </div>

          <Separator />

          {/* Links */}
          <div className="space-y-3">
            <Label>Documentation Links</Label>
            {docLinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No links added yet</p>
            ) : (
              <div className="space-y-2">
                {docLinks.map((link, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate"
                      >
                        {link.label}
                      </a>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemoveLink(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!readOnly && (
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Label (e.g. Onboarding Playbook)"
                  value={newLink.label}
                  onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))}
                  className="max-w-[200px]"
                />
                <Input
                  placeholder="URL (e.g. Notion link)"
                  value={newLink.url}
                  onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
                  className="flex-1 min-w-[200px]"
                />
                <Button variant="outline" size="sm" onClick={handleAddLink}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
