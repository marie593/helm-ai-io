import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const sigBasestring = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", signingSecret);
  hmac.update(sigBasestring);
  const mySignature = `v0=${hmac.digest("hex")}`;
  try {
    const a = new TextEncoder().encode(mySignature);
    const b = new TextEncoder().encode(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN");
  const SLACK_SIGNING_SECRET = Deno.env.get("SLACK_SIGNING_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const rawBody = await req.text();
    const contentType = req.headers.get("content-type") || "";

    // Handle Slack Events API (POST from Slack)
    if (req.method === "POST" && !contentType.includes("application/json; charset=utf-8")) {
      // Could be URL-encoded or JSON from Slack
    }

    // Try to parse as JSON
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // If not JSON, check if it's a request from our frontend
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Slack URL Verification Challenge ===
    if (payload.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: payload.challenge }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // === Slack Event Callback ===
    if (payload.type === "event_callback") {
      if (!SLACK_SIGNING_SECRET) {
        console.error("SLACK_SIGNING_SECRET not configured");
        return new Response("OK", { status: 200 });
      }

      const slackSignature = req.headers.get("x-slack-signature") || "";
      const slackTimestamp = req.headers.get("x-slack-request-timestamp") || "";

      // Verify request is from Slack
      if (!verifySlackSignature(SLACK_SIGNING_SECRET, slackSignature, slackTimestamp, rawBody)) {
        console.error("Invalid Slack signature");
        return new Response("Invalid signature", { status: 401 });
      }

      const event = payload.event;
      console.log("Received Slack event:", event.type, event);

      // Handle message events
      if (event.type === "message" && !event.bot_id) {
        // Store incoming message or process it
        // You can extend this to match channels to projects, create activity feed entries, etc.
        console.log(`Slack message from ${event.user}: ${event.text}`);
      }

      // Handle app_mention events
      if (event.type === "app_mention") {
        console.log(`App mentioned by ${event.user}: ${event.text}`);
      }

      // Respond immediately to Slack (must respond within 3 seconds)
      return new Response("OK", { status: 200 });
    }

    // === Frontend API calls ===
    // Send message to a Slack channel
    if (payload.action === "send-message") {
      if (!SLACK_BOT_TOKEN) {
        return new Response(
          JSON.stringify({ success: false, error: "SLACK_BOT_TOKEN is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { channel, text, thread_ts } = payload;
      const slackBody: any = { channel, text };
      if (thread_ts) slackBody.thread_ts = thread_ts;

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackBody),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List channels
    if (payload.action === "list-channels") {
      if (!SLACK_BOT_TOKEN) {
        return new Response(
          JSON.stringify({ success: false, error: "SLACK_BOT_TOKEN is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200", {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          channels: data.channels.map((c: any) => ({ id: c.id, name: c.name, is_private: c.is_private })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test connection
    if (payload.action === "test-connection") {
      if (!SLACK_BOT_TOKEN) {
        return new Response(
          JSON.stringify({ success: false, error: "SLACK_BOT_TOKEN is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch("https://slack.com/api/auth.test", {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });

      const data = await response.json();
      return new Response(JSON.stringify({ success: data.ok, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Slack integration error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
