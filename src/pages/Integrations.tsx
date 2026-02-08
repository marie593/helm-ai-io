import { Plug, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const integrations = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and updates in your Slack channels',
    status: 'available',
    icon: '💬',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Forward emails for AI parsing and action item extraction',
    status: 'available',
    icon: '📧',
  },
  {
    id: 'gcalendar',
    name: 'Google Calendar',
    description: 'Sync milestones and events with your calendar',
    status: 'available',
    icon: '📅',
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    description: 'Access and share project documents and files',
    status: 'available',
    icon: '📁',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync project documentation and knowledge bases',
    status: 'available',
    icon: '📝',
  },
  {
    id: 'otterai',
    name: 'Otter.ai',
    description: 'Import meeting transcripts and extract action items',
    status: 'available',
    icon: '🎙️',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Sync tasks and issues with Jira projects',
    status: 'available',
    icon: '📋',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Connect customer data with Salesforce CRM',
    status: 'coming_soon',
    icon: '☁️',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Integrate with HubSpot for marketing automation',
    status: 'coming_soon',
    icon: '🧡',
  },
];

export default function Integrations() {
  return (
    <AppLayout
      title="Integrations"
      description="Connect your favorite tools and services"
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Card key={integration.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                  </div>
                  {integration.status === 'coming_soon' && (
                    <Badge variant="secondary">Coming Soon</Badge>
                  )}
                </div>
                <CardDescription className="mt-2">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={integration.status === 'coming_soon'}
                >
                  {integration.status === 'coming_soon' ? (
                    'Coming Soon'
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state for connected integrations */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Connected Integrations
            </CardTitle>
            <CardDescription>
              Your active integrations will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No integrations connected yet</p>
              <p className="text-sm">Connect an integration above to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
