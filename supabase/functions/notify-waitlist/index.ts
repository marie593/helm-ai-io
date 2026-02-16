import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, workEmail, companyName, companySize, role, topPainPoint } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailHtml = `
      <h2>New Waitlist Signup 🎉</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${fullName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;"><a href="mailto:${workEmail}">${workEmail}</a></td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Company</td><td style="padding:8px;">${companyName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Size</td><td style="padding:8px;">${companySize}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Role</td><td style="padding:8px;">${role}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Top Pain Point</td><td style="padding:8px;">${topPainPoint}</td></tr>
      </table>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "HelmAI <noreply@helm-ai.io>",
        to: ["marie@helm-ai.io"],
        subject: `New Waitlist Signup: ${fullName} (${companyName})`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend error:", errorText);
      throw new Error(`Resend API error: ${res.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending waitlist notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
