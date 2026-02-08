import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, RefreshCw, Unplug, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';

export function GmailIntegrationCard() {
  const [searchParams] = useSearchParams();
  const {
    isConnected,
    integration,
    statusLoading,
    isAuthenticating,
    startAuth,
    exchangeCode,
    syncEmails,
    disconnect,
  } = useGmailIntegration();

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      exchangeCode.mutate(code);
    }
  }, [searchParams]);

  const isLoading = statusLoading || exchangeCode.isPending;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📧</span>
            <div>
              <CardTitle className="text-lg">Gmail</CardTitle>
            </div>
          </div>
          {isConnected && (
            <Badge className="bg-success/10 text-success border-0">Connected</Badge>
          )}
        </div>
        <CardDescription className="mt-2">
          {isConnected 
            ? `Connected as ${integration?.email_address}`
            : 'Connect Gmail to import and parse emails for action items'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isConnected ? (
          <>
            {integration?.last_sync_at && (
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date(integration.last_sync_at).toLocaleString()}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => syncEmails.mutate(undefined)}
                disabled={syncEmails.isPending}
              >
                {syncEmails.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Emails
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Unplug className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={startAuth}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Connect Gmail
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
