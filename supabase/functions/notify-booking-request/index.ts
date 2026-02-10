import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, requestedDate, requestedTime, durationMinutes, notes, requestedByUserId } = await req.json();

    if (!projectId || !requestedDate || !requestedTime) {
      throw new Error("Missing required fields");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get project info
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, customer_id")
      .eq("id", projectId)
      .single();
    if (projectError) throw projectError;

    // Get customer name
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("id", project.customer_id)
      .single();

    // Get requester info
    let requesterName = "A customer";
    let requesterEmail = "";
    if (requestedByUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", requestedByUserId)
        .single();
      if (profile) {
        requesterName = profile.full_name || profile.email;
        requesterEmail = profile.email;
      }
    }

    // Find the vendor lead for this project
    const { data: vendorLead } = await supabase
      .from("project_collaborators")
      .select("user_id, profiles:user_id(full_name, email)")
      .eq("project_id", projectId)
      .eq("role", "vendor_lead")
      .maybeSingle();

    // Fallback: get all vendor staff if no vendor lead assigned
    let recipientEmail = "";
    let recipientName = "";

    if (vendorLead?.profiles) {
      const profile = vendorLead.profiles as any;
      recipientEmail = profile.email;
      recipientName = profile.full_name || profile.email;
    } else {
      // Fallback to first vendor admin
      const { data: vendorAdmins } = await supabase
        .from("user_vendor_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);

      if (vendorAdmins && vendorAdmins.length > 0) {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", vendorAdmins[0].user_id)
          .single();
        if (adminProfile) {
          recipientEmail = adminProfile.email;
          recipientName = adminProfile.full_name || adminProfile.email;
        }
      }
    }

    if (!recipientEmail) {
      console.log("No recipient found for booking notification");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "No CSM found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const formattedDate = new Date(requestedDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailResponse = await resend.emails.send({
      from: "Helm <noreply@helm-ai.io>",
      to: [recipientEmail],
      subject: `📞 New Call Request – ${project.name}`,
      html: `
        <div style="font-family: 'Nunito', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <div style="background: #f5f0eb; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
            <h2 style="margin: 0 0 4px; color: #4a5a4a; font-size: 20px;">New Call Request</h2>
            <p style="margin: 0; color: #7a7a6a; font-size: 14px;">${project.name}${customer?.name ? ` · ${customer.name}` : ''}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #4a5a4a;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; width: 120px;">Requested by</td>
              <td style="padding: 8px 0;">${requesterName}${requesterEmail ? ` (${requesterEmail})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600;">Date</td>
              <td style="padding: 8px 0;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600;">Time</td>
              <td style="padding: 8px 0;">${requestedTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600;">Duration</td>
              <td style="padding: 8px 0;">${durationMinutes} minutes</td>
            </tr>
            ${notes ? `<tr>
              <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Notes</td>
              <td style="padding: 8px 0;">${notes}</td>
            </tr>` : ''}
          </table>
          
          <p style="font-size: 12px; color: #999; margin-top: 24px;">
            Log in to Helm to confirm or decline this request.
          </p>
        </div>
      `,
    });

    console.log("Booking notification sent to", recipientEmail, emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-booking-request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
