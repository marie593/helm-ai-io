import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GATEWAY_URL = 'https://gateway.lovable.dev/google_calendar/calendar/v3';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const GOOGLE_CALENDAR_API_KEY = Deno.env.get('GOOGLE_CALENDAR_API_KEY');
    if (!GOOGLE_CALENDAR_API_KEY) {
      throw new Error('GOOGLE_CALENDAR_API_KEY is not configured. Please connect Google Calendar integration first.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { action, projectId, calendarId } = await req.json();
    console.log(`Processing ${action} for project ${projectId}`);

    const headers = {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_CALENDAR_API_KEY,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'list-calendars': {
        const response = await fetch(`${GATEWAY_URL}/users/me/calendarList`, {
          method: 'GET',
          headers,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(`Google Calendar API failed [${response.status}]: ${JSON.stringify(data)}`);
        }
        return new Response(JSON.stringify({ success: true, calendars: data.items }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'connect': {
        // Save integration settings
        const { error: upsertError } = await supabase
          .from('google_calendar_integrations')
          .upsert({
            project_id: projectId,
            calendar_id: calendarId,
            sync_enabled: true,
          }, { onConflict: 'project_id' });

        if (upsertError) {
          throw new Error(`Failed to save integration: ${upsertError.message}`);
        }

        // Perform initial sync
        await syncProjectToCalendar(supabase, projectId, calendarId, headers);

        return new Response(JSON.stringify({ success: true, message: 'Calendar connected and synced' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync': {
        // Get integration settings
        const { data: integration, error: fetchError } = await supabase
          .from('google_calendar_integrations')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (fetchError || !integration) {
          throw new Error('Google Calendar not connected for this project');
        }

        await syncProjectToCalendar(supabase, projectId, integration.calendar_id, headers);
        await syncCalendarToProject(supabase, projectId, integration.calendar_id, headers, integration.sync_token);

        // Update last sync time
        await supabase
          .from('google_calendar_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('project_id', projectId);

        return new Response(JSON.stringify({ success: true, message: 'Sync completed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        await supabase
          .from('google_calendar_integrations')
          .delete()
          .eq('project_id', projectId);

        await supabase
          .from('calendar_sync_mappings')
          .delete()
          .eq('project_id', projectId);

        return new Response(JSON.stringify({ success: true, message: 'Calendar disconnected' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Error in google-calendar-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function syncProjectToCalendar(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  calendarId: string,
  headers: Record<string, string>
) {
  console.log('Syncing project events to Google Calendar...');

  // Get project info
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();

  const projectPrefix = project?.name ? `[${project.name}] ` : '';

  // Get milestones to sync
  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', projectId);

  // Get calendar events to sync
  const { data: calendarEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('project_id', projectId);

  // Get existing mappings
  const { data: existingMappings } = await supabase
    .from('calendar_sync_mappings')
    .select('*')
    .eq('project_id', projectId);

  const mappingsMap = new Map(
    existingMappings?.map(m => [m.local_milestone_id || m.local_event_id, m]) || []
  );

  // Sync milestones
  for (const milestone of milestones || []) {
    const existingMapping = mappingsMap.get(milestone.id);
    const eventData: CalendarEvent = {
      summary: `${projectPrefix}📍 ${milestone.name}`,
      description: milestone.description || `Milestone: ${milestone.name}\nStatus: ${milestone.status}`,
      start: { date: milestone.target_date },
      end: { date: milestone.target_date },
    };

    if (existingMapping) {
      // Update existing event
      const response = await fetch(
        `${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events/${existingMapping.google_event_id}`,
        { method: 'PUT', headers, body: JSON.stringify(eventData) }
      );
      if (!response.ok) {
        console.error(`Failed to update milestone ${milestone.id}:`, await response.text());
      }
    } else {
      // Create new event
      const response = await fetch(
        `${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: 'POST', headers, body: JSON.stringify(eventData) }
      );
      if (response.ok) {
        const newEvent = await response.json();
        await supabase.from('calendar_sync_mappings').insert({
          project_id: projectId,
          local_milestone_id: milestone.id,
          google_event_id: newEvent.id,
          event_type: 'milestone',
        });
      } else {
        console.error(`Failed to create milestone event ${milestone.id}:`, await response.text());
      }
    }
  }

  // Sync calendar events
  for (const event of calendarEvents || []) {
    const existingMapping = mappingsMap.get(event.id);
    const eventData: CalendarEvent = {
      summary: `${projectPrefix}${event.title}`,
      description: event.description || '',
      start: { date: event.event_date },
      end: { date: event.event_date },
    };

    if (existingMapping) {
      const response = await fetch(
        `${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events/${existingMapping.google_event_id}`,
        { method: 'PUT', headers, body: JSON.stringify(eventData) }
      );
      if (!response.ok) {
        console.error(`Failed to update event ${event.id}:`, await response.text());
      }
    } else {
      const response = await fetch(
        `${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: 'POST', headers, body: JSON.stringify(eventData) }
      );
      if (response.ok) {
        const newEvent = await response.json();
        await supabase.from('calendar_sync_mappings').insert({
          project_id: projectId,
          local_event_id: event.id,
          google_event_id: newEvent.id,
          event_type: 'calendar_event',
        });
      } else {
        console.error(`Failed to create calendar event ${event.id}:`, await response.text());
      }
    }
  }

  console.log('Finished syncing to Google Calendar');
}

async function syncCalendarToProject(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  calendarId: string,
  headers: Record<string, string>,
  syncToken?: string | null
) {
  console.log('Syncing from Google Calendar to project...');

  // Get events from Google Calendar
  let url = `${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events?maxResults=100`;
  if (syncToken) {
    url += `&syncToken=${encodeURIComponent(syncToken)}`;
  } else {
    // Initial sync - only get future events
    const now = new Date().toISOString();
    url += `&timeMin=${encodeURIComponent(now)}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  
  if (!response.ok) {
    // If sync token is invalid, do a full sync
    if (response.status === 410 && syncToken) {
      return syncCalendarToProject(supabase, projectId, calendarId, headers, null);
    }
    console.error('Failed to fetch calendar events:', await response.text());
    return;
  }

  const data = await response.json();

  // Get existing mappings
  const { data: existingMappings } = await supabase
    .from('calendar_sync_mappings')
    .select('google_event_id')
    .eq('project_id', projectId);

  const syncedGoogleIds = new Set(existingMappings?.map(m => m.google_event_id) || []);

  // Import new events (those not already synced from our system)
  for (const googleEvent of data.items || []) {
    if (syncedGoogleIds.has(googleEvent.id)) {
      continue; // Skip events we created
    }

    // Check if this looks like one of our events (has our prefix)
    if (googleEvent.summary?.includes('📍') || googleEvent.summary?.startsWith('[')) {
      continue;
    }

    // Check if we've already imported this event
    const { data: existingImport } = await supabase
      .from('calendar_sync_mappings')
      .select('id')
      .eq('google_event_id', googleEvent.id)
      .eq('project_id', projectId)
      .single();

    if (existingImport) {
      continue;
    }

    // Get event date
    const eventDate = googleEvent.start?.date || 
      (googleEvent.start?.dateTime ? googleEvent.start.dateTime.split('T')[0] : null);

    if (!eventDate) continue;

    // Create local calendar event
    const { data: newEvent, error } = await supabase
      .from('calendar_events')
      .insert({
        project_id: projectId,
        title: googleEvent.summary || 'Imported Event',
        description: googleEvent.description || null,
        event_date: eventDate,
        event_type: 'meeting',
      })
      .select()
      .single();

    if (!error && newEvent) {
      await supabase.from('calendar_sync_mappings').insert({
        project_id: projectId,
        local_event_id: newEvent.id,
        google_event_id: googleEvent.id,
        event_type: 'calendar_event',
      });
    }
  }

  // Save new sync token for incremental sync
  if (data.nextSyncToken) {
    await supabase
      .from('google_calendar_integrations')
      .update({ sync_token: data.nextSyncToken })
      .eq('project_id', projectId);
  }

  console.log('Finished syncing from Google Calendar');
}
