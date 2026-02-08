import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvitationRequest {
  email: string;
  customerId: string;
  customerName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Verify user is authenticated and is a vendor admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is vendor admin
    const { data: vendorRole } = await supabaseClient
      .from("user_vendor_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!vendorRole || vendorRole.role !== "admin") {
      throw new Error("Only vendor admins can send invitations");
    }

    const { email, customerId, customerName }: InvitationRequest = await req.json();

    // Validate required fields
    if (!email || !customerId || !customerName) {
      throw new Error("Missing required fields: email, customerId, customerName");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Check if user already exists
    const { data: existingProfile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      // Check if already a team member
      const { data: existingRole } = await supabaseClient
        .from("user_customer_roles")
        .select("id")
        .eq("user_id", existingProfile.id)
        .eq("customer_id", customerId)
        .maybeSingle();

      if (existingRole) {
        throw new Error("This user is already a team member of this customer");
      }

      // Add existing user as team member directly
      const { error: insertError } = await supabaseClient
        .from("user_customer_roles")
        .insert({
          user_id: existingProfile.id,
          customer_id: customerId,
        });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          type: "linked",
          message: "Existing user added as team member" 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabaseClient
      .from("customer_invitations")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("customer_id", customerId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitation) {
      throw new Error("An invitation is already pending for this email");
    }

    // Create invitation record using service role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("customer_invitations")
      .insert({
        customer_id: customerId,
        email: email.toLowerCase(),
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw new Error("Failed to create invitation");
    }

    // Get the app URL from the request origin or use a default
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const signupUrl = `${origin}/auth?invite=${invitation.token}&email=${encodeURIComponent(email)}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "Invitations <noreply@helm-ai.io>",
      to: [email],
      subject: `You've been invited to join ${customerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              You've been invited to join <strong>${customerName}</strong> as a team member.
            </p>
            <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
              Click the button below to create your account and get started:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="font-size: 12px; color: #999; margin-top: 25px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type: "invited",
        message: "Invitation sent successfully",
        invitationId: invitation.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-invitation function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
