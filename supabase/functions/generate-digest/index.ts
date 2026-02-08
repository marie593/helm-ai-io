import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId } = await req.json();

    // Calculate date range for the past week
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString();

    console.log(`Generating digest for week starting ${weekAgoStr}`);

    // Fetch recent data based on whether projectId is provided
    let projectsData, tasksData, milestonesData, activityData, feedbackData;

    if (projectId) {
      // Fetch data for a specific project
      const [projects, tasks, milestones, activity, feedback] = await Promise.all([
        supabase.from("projects").select("*, customer:customers(name)").eq("id", projectId).single(),
        supabase.from("tasks").select("*").eq("project_id", projectId).gte("updated_at", weekAgoStr),
        supabase.from("milestones").select("*").eq("project_id", projectId).gte("updated_at", weekAgoStr),
        supabase.from("activity_feed").select("*").eq("project_id", projectId).gte("created_at", weekAgoStr).order("created_at", { ascending: false }).limit(20),
        supabase.from("feedback_items").select("*").eq("project_id", projectId).gte("created_at", weekAgoStr),
      ]);

      projectsData = projects.data ? [projects.data] : [];
      tasksData = tasks.data || [];
      milestonesData = milestones.data || [];
      activityData = activity.data || [];
      feedbackData = feedback.data || [];
    } else {
      // Fetch data across all projects
      const [projects, tasks, milestones, activity, feedback] = await Promise.all([
        supabase.from("projects").select("*, customer:customers(name)").in("status", ["planning", "in_progress", "at_risk"]),
        supabase.from("tasks").select("*, project:projects(name)").gte("updated_at", weekAgoStr),
        supabase.from("milestones").select("*, project:projects(name)").gte("updated_at", weekAgoStr),
        supabase.from("activity_feed").select("*, project:projects(name)").gte("created_at", weekAgoStr).order("created_at", { ascending: false }).limit(50),
        supabase.from("feedback_items").select("*, project:projects(name)").gte("created_at", weekAgoStr),
      ]);

      projectsData = projects.data || [];
      tasksData = tasks.data || [];
      milestonesData = milestones.data || [];
      activityData = activity.data || [];
      feedbackData = feedback.data || [];
    }

    // Build context for AI
    const completedTasks = tasksData.filter((t: any) => t.status === "completed");
    const inProgressTasks = tasksData.filter((t: any) => t.status === "in_progress");
    const blockedTasks = tasksData.filter((t: any) => t.status === "blocked");
    const completedMilestones = milestonesData.filter((m: any) => m.status === "completed");
    const delayedMilestones = milestonesData.filter((m: any) => m.status === "delayed");

    const contextSummary = `
## Weekly Progress Summary Data

**Active Projects:** ${projectsData.length}
${projectsData.map((p: any) => `- ${p.name} (${p.customer?.name || 'Unknown customer'}) - Status: ${p.status}, Health: ${p.health_score}%`).join('\n')}

**Tasks This Week:**
- Completed: ${completedTasks.length}
- In Progress: ${inProgressTasks.length}
- Blocked: ${blockedTasks.length}

${completedTasks.length > 0 ? `**Completed Tasks:**\n${completedTasks.slice(0, 10).map((t: any) => `- ${t.title}`).join('\n')}` : ''}

${blockedTasks.length > 0 ? `**Blocked Tasks (Attention Needed):**\n${blockedTasks.map((t: any) => `- ${t.title}`).join('\n')}` : ''}

**Milestones:**
- Completed this week: ${completedMilestones.length}
- Delayed: ${delayedMilestones.length}

${completedMilestones.length > 0 ? `**Milestones Achieved:**\n${completedMilestones.map((m: any) => `- ${m.name}`).join('\n')}` : ''}

${delayedMilestones.length > 0 ? `**Delayed Milestones:**\n${delayedMilestones.map((m: any) => `- ${m.name}`).join('\n')}` : ''}

**Feedback Received:** ${feedbackData.length} items
${feedbackData.slice(0, 5).map((f: any) => `- ${f.title} (${f.type}, ${f.priority} priority)`).join('\n')}

**Recent Activity:**
${activityData.slice(0, 10).map((a: any) => `- ${a.title}`).join('\n')}
`;

    console.log("Context prepared, calling AI...");

    // Call Lovable AI to generate the digest
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional implementation project manager assistant. Generate concise, professional weekly digest summaries for client communication.

Your digest should:
1. Start with a brief executive summary (2-3 sentences)
2. Highlight key accomplishments and wins
3. Note any blockers or risks that need attention
4. Preview upcoming milestones and priorities
5. End with suggested talking points for weekly sync calls

Keep the tone professional but warm. Be specific about achievements. If there's limited data, acknowledge it and focus on what's available.`
          },
          {
            role: "user",
            content: `Generate a weekly digest summary based on this data:\n\n${contextSummary}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const digest = aiData.choices?.[0]?.message?.content;

    if (!digest) {
      throw new Error("No content in AI response");
    }

    console.log("Digest generated successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      digest,
      metadata: {
        projectCount: projectsData.length,
        tasksCompleted: completedTasks.length,
        tasksBlocked: blockedTasks.length,
        milestonesCompleted: completedMilestones.length,
        feedbackCount: feedbackData.length,
        periodStart: weekAgoStr,
        periodEnd: now.toISOString(),
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-digest:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
