import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface GmailStatus {
  connected: boolean;
  integration: {
    email_address: string;
    last_sync_at: string | null;
    created_at: string;
  } | null;
}

export function useGmailIntegration() {
  const queryClient = useQueryClient();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check Gmail connection status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: async (): Promise<GmailStatus> => {
      const response = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'status' },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      
      return response.data;
    },
  });

  // Start OAuth flow
  const startAuth = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      const redirectUri = `${window.location.origin}/integrations`;
      
      const response = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'get-auth-url', redirectUri },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      // Redirect to Google OAuth
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      console.error('Failed to start Gmail auth:', error);
      toast.error('Failed to start Gmail authentication', { description: error.message });
      setIsAuthenticating(false);
    }
  }, []);

  // Exchange code for tokens (called after OAuth redirect)
  const exchangeCode = useMutation({
    mutationFn: async (code: string) => {
      const redirectUri = `${window.location.origin}/integrations`;
      
      const response = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'exchange-code', code, redirectUri },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      toast.success('Gmail connected successfully', { 
        description: `Connected as ${data.email}` 
      });
      
      // Clean up URL
      window.history.replaceState({}, '', '/integrations');
    },
    onError: (error: Error) => {
      toast.error('Failed to connect Gmail', { description: error.message });
      window.history.replaceState({}, '', '/integrations');
    },
  });

  // Sync emails
  const syncEmails = useMutation({
    mutationFn: async (projectId?: string) => {
      const response = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'sync', projectId, maxResults: 30 },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      queryClient.invalidateQueries({ queryKey: ['imported-emails'] });
      toast.success('Emails synced', { description: data.message });
    },
    onError: (error: Error) => {
      toast.error('Failed to sync emails', { description: error.message });
    },
  });

  // Disconnect Gmail
  const disconnect = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'disconnect' },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      toast.success('Gmail disconnected');
    },
    onError: (error: Error) => {
      toast.error('Failed to disconnect Gmail', { description: error.message });
    },
  });

  return {
    isConnected: status?.connected ?? false,
    integration: status?.integration ?? null,
    statusLoading,
    isAuthenticating,
    startAuth,
    exchangeCode,
    syncEmails,
    disconnect,
  };
}
