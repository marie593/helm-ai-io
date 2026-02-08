import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
    }>;
  };
  internalDate?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid authorization token');
    }

    const { action, code, redirectUri, projectId, maxResults } = await req.json();
    console.log(`Gmail sync: ${action} for user ${user.id}`);

    switch (action) {
      case 'get-auth-url': {
        const scopes = [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
        ].join(' ');
        
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', user.id);

        return new Response(JSON.stringify({ success: true, authUrl: authUrl.toString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'exchange-code': {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error('Token exchange failed:', error);
          throw new Error('Failed to exchange authorization code');
        }

        const tokens: TokenResponse = await tokenResponse.json();
        
        // Get user's email address
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const userInfo = await userInfoResponse.json();

        // Calculate token expiry
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Store or update integration
        const { error: upsertError } = await supabase
          .from('gmail_integrations')
          .upsert({
            user_id: user.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            email_address: userInfo.email,
          }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('Failed to save integration:', upsertError);
          throw new Error('Failed to save Gmail integration');
        }

        return new Response(JSON.stringify({ 
          success: true, 
          email: userInfo.email,
          message: 'Gmail connected successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync': {
        // Get user's Gmail integration
        const { data: integration, error: fetchError } = await supabase
          .from('gmail_integrations')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError || !integration) {
          throw new Error('Gmail not connected. Please connect your Gmail account first.');
        }

        // Refresh token if expired
        const accessToken = await ensureValidToken(
          integration, 
          GOOGLE_CLIENT_ID, 
          GOOGLE_CLIENT_SECRET, 
          supabase
        );

        // Fetch recent emails
        const messagesResponse = await fetch(
          `${GMAIL_API_URL}/users/me/messages?maxResults=${maxResults || 20}&labelIds=INBOX`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!messagesResponse.ok) {
          throw new Error('Failed to fetch messages from Gmail');
        }

        const messagesData = await messagesResponse.json();
        const messages: GmailMessage[] = [];

        // Fetch full message details
        for (const msg of messagesData.messages || []) {
          const msgResponse = await fetch(
            `${GMAIL_API_URL}/users/me/messages/${msg.id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (msgResponse.ok) {
            messages.push(await msgResponse.json());
          }
        }

        // Process and store emails
        const importedEmails = [];
        for (const message of messages) {
          const emailData = parseGmailMessage(message);
          
          // Upsert email
          const { data: imported, error: importError } = await supabase
            .from('imported_emails')
            .upsert({
              gmail_integration_id: integration.id,
              project_id: projectId || null,
              gmail_message_id: message.id,
              thread_id: message.threadId,
              subject: emailData.subject,
              sender: emailData.senderName,
              sender_email: emailData.senderEmail,
              recipient: emailData.recipient,
              received_at: emailData.receivedAt,
              snippet: message.snippet,
              body_text: emailData.bodyText,
              labels: message.labelIds,
            }, { onConflict: 'gmail_integration_id,gmail_message_id' })
            .select()
            .single();

          if (!importError && imported) {
            importedEmails.push(imported);
          }
        }

        // Update last sync time
        await supabase
          .from('gmail_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);

        return new Response(JSON.stringify({ 
          success: true, 
          synced: importedEmails.length,
          message: `Synced ${importedEmails.length} emails` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        const { data: integration } = await supabase
          .from('gmail_integrations')
          .select('email_address, last_sync_at, created_at')
          .eq('user_id', user.id)
          .single();

        return new Response(JSON.stringify({ 
          success: true, 
          connected: !!integration,
          integration: integration || null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        await supabase
          .from('gmail_integrations')
          .delete()
          .eq('user_id', user.id);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Gmail disconnected successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Error in gmail-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function ensureValidToken(
  integration: { access_token: string; refresh_token: string | null; token_expires_at: string | null; id: string },
  clientId: string,
  clientSecret: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;
  
  // Check if token is still valid (with 5 min buffer)
  if (expiresAt && expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return integration.access_token;
  }

  // Token expired, refresh it
  if (!integration.refresh_token) {
    throw new Error('No refresh token available. Please reconnect Gmail.');
  }

  console.log('Refreshing Gmail access token...');

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh access token. Please reconnect Gmail.');
  }

  const tokens: TokenResponse = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Update stored token
  await supabase
    .from('gmail_integrations')
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt.toISOString(),
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
    })
    .eq('id', integration.id);

  return tokens.access_token;
}

function parseGmailMessage(message: GmailMessage) {
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const from = getHeader('From');
  const senderMatch = from.match(/^(.+?)\s*<(.+?)>$/) || [null, from, from];
  
  let bodyText = '';
  
  // Try to get body from parts
  if (message.payload?.parts) {
    const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      bodyText = decodeBase64(textPart.body.data);
    }
  } else if (message.payload?.body?.data) {
    bodyText = decodeBase64(message.payload.body.data);
  }

  return {
    subject: getHeader('Subject'),
    senderName: senderMatch[1]?.trim() || '',
    senderEmail: senderMatch[2]?.trim() || '',
    recipient: getHeader('To'),
    receivedAt: message.internalDate 
      ? new Date(parseInt(message.internalDate)).toISOString() 
      : null,
    bodyText,
  };
}

function decodeBase64(data: string): string {
  try {
    // Gmail uses URL-safe base64
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    return atob(normalized);
  } catch {
    return '';
  }
}
