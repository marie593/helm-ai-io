import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, customerId } = await req.json();

    // ─── Fetch context from database ────────────────────────
    const [
      customersRes,
      projectsRes,
      tasksRes,
      milestonesRes,
      feedbackRes,
      companyRes,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, industry, company_size, goals, contact_email")
        .order("name"),
      supabase
        .from("projects")
        .select(
          "id, name, status, health_score, start_date, target_end_date, description, customer_id, customers(name)"
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, due_date, project_id, projects(name)"
        )
        .in("status", ["todo", "in_progress", "blocked"])
        .order("due_date", { ascending: true })
        .limit(30),
      supabase
        .from("milestones")
        .select(
          "id, name, status, target_date, project_id, projects(name)"
        )
        .in("status", ["pending", "in_progress", "delayed"])
        .order("target_date", { ascending: true })
        .limit(20),
      supabase
        .from("feedback_items")
        .select(
          "id, title, type, status, priority, ai_summary, project_id, projects(name)"
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("company_profile").select("*").limit(1).maybeSingle(),
    ]);

    // Filter by customer if selected
    let customers = customersRes.data || [];
    let projects = projectsRes.data || [];
    let tasks = tasksRes.data || [];
    let milestones = milestonesRes.data || [];
    let feedback = feedbackRes.data || [];

    if (customerId && customerId !== "all") {
      customers = customers.filter((c: any) => c.id === customerId);
      const customerProjectIds = projects
        .filter((p: any) => p.customer_id === customerId)
        .map((p: any) => p.id);
      projects = projects.filter(
        (p: any) => p.customer_id === customerId
      );
      tasks = tasks.filter((t: any) =>
        customerProjectIds.includes(t.project_id)
      );
      milestones = milestones.filter((m: any) =>
        customerProjectIds.includes(m.project_id)
      );
      feedback = feedback.filter((f: any) =>
        customerProjectIds.includes(f.project_id)
      );
    }

    const companyProfile = companyRes.data;

    // ─── Build system prompt with context ───────────────────
    const systemPrompt = `You are Helm AI, an intelligent implementation management assistant. You help vendor teams manage customer onboarding and implementation projects.

${
  companyProfile
    ? `## Company Context
- Industry: ${companyProfile.industry || "N/A"}
- Description: ${companyProfile.company_description || "N/A"}
- Client types: ${companyProfile.client_types || "N/A"}
- Avg onboarding: ${companyProfile.avg_onboarding_length || "N/A"}
- Team structure: ${companyProfile.team_size_structure || "N/A"}
- Success metrics: ${companyProfile.success_metrics || "N/A"}
- Tools/Tech: ${companyProfile.tools_tech_stack || "N/A"}`
    : ""
}

## Current Customers (${customers.length})
${customers
  .map(
    (c: any) =>
      `- ${c.name} | ${c.industry || "?"} | ${c.company_size || "?"} | Goals: ${c.goals || "N/A"}`
  )
  .join("\n")}

## Active Projects (${projects.length})
${projects
  .map(
    (p: any) =>
      `- ${p.name} (${(p as any).customers?.name || "?"}) | Status: ${p.status} | Health: ${p.health_score ?? "N/A"}/100 | ${p.start_date} → ${p.target_end_date}${p.description ? " | " + p.description : ""}`
  )
  .join("\n")}

## Open Tasks (${tasks.length})
${tasks
  .map(
    (t: any) =>
      `- [${t.priority || "medium"}] ${t.title} | ${t.status} | Due: ${t.due_date || "none"} | Project: ${(t as any).projects?.name || "?"}`
  )
  .join("\n")}

## Upcoming Milestones (${milestones.length})
${milestones
  .map(
    (m: any) =>
      `- ${m.name} | ${m.status} | Target: ${m.target_date} | Project: ${(m as any).projects?.name || "?"}`
  )
  .join("\n")}

## Recent Feedback (${feedback.length})
${feedback
  .map(
    (f: any) =>
      `- [${f.type}/${f.priority}] ${f.title} | Status: ${f.status} | Project: ${(f as any).projects?.name || "?"}${f.ai_summary ? " | Summary: " + f.ai_summary : ""}`
  )
  .join("\n")}

## Guidelines
- Be concise but thorough. Use markdown formatting (bold, bullets, headers).
- Reference specific projects, customers, tasks by name when relevant.
- Proactively flag risks: overdue tasks, low health scores, delayed milestones.
- Suggest concrete next actions when appropriate.
- If asked to create/update data, explain what you'd do (you cannot write to the DB directly yet).
- Today's date is ${new Date().toISOString().split("T")[0]}.`;

    // ─── Call Lovable AI Gateway ─────────────────────────────
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
