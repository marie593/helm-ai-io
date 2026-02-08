import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateRoadmapRequest {
  projectId: string;
  projectBrief: string;
  startDate?: string;
  durationDays?: number;
}

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

    const { projectId, projectBrief, startDate, durationDays = 90 }: GenerateRoadmapRequest = await req.json();

    if (!projectId || !projectBrief) {
      return new Response(JSON.stringify({ error: "projectId and projectBrief are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    console.log(`Generating ${durationDays}-day roadmap for project ${projectId}`);

    // Call AI to generate roadmap
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
            content: `You are an expert implementation project manager. Generate a detailed roadmap for software implementation projects.

Create milestones and tasks that follow best practices for enterprise software implementations:
- Discovery & Planning phase
- Configuration & Setup phase  
- Data Migration phase
- Integration phase
- User Training phase
- UAT & Go-Live phase
- Post-Launch Support phase

Each milestone should have 3-6 specific tasks. Be realistic about timelines.`
          },
          {
            role: "user",
            content: `Generate a ${durationDays}-day implementation roadmap starting from ${start.toISOString().split('T')[0]} for this project:

${projectBrief}

Create milestones with specific tasks, target dates, and priorities.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_roadmap",
              description: "Create implementation roadmap with milestones and tasks",
              parameters: {
                type: "object",
                properties: {
                  milestones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        targetDate: { type: "string", description: "ISO date string" },
                        tasks: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              description: { type: "string" },
                              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                              dueDate: { type: "string", description: "ISO date string" },
                              estimatedHours: { type: "number" }
                            },
                            required: ["title", "priority", "dueDate"]
                          }
                        }
                      },
                      required: ["name", "targetDate", "tasks"]
                    }
                  }
                },
                required: ["milestones"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_roadmap" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const roadmap = JSON.parse(toolCall.function.arguments);
    console.log(`Generated ${roadmap.milestones.length} milestones`);

    // Insert milestones and tasks into database
    const createdMilestones = [];
    
    for (let i = 0; i < roadmap.milestones.length; i++) {
      const milestone = roadmap.milestones[i];
      
      // Insert milestone
      const { data: milestoneData, error: milestoneError } = await supabase
        .from("milestones")
        .insert({
          project_id: projectId,
          name: milestone.name,
          description: milestone.description || null,
          target_date: milestone.targetDate,
          status: "pending",
          order_index: i,
        })
        .select()
        .single();

      if (milestoneError) {
        console.error("Error creating milestone:", milestoneError);
        continue;
      }

      // Insert tasks for this milestone
      const tasksToInsert = milestone.tasks.map((task: any) => ({
        project_id: projectId,
        milestone_id: milestoneData.id,
        title: task.title,
        description: task.description || null,
        priority: task.priority,
        due_date: task.dueDate,
        status: "todo",
      }));

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select();

      if (tasksError) {
        console.error("Error creating tasks:", tasksError);
      }

      createdMilestones.push({
        ...milestoneData,
        tasks: tasksData || [],
      });
    }

    // Update project dates if needed
    const lastMilestone = roadmap.milestones[roadmap.milestones.length - 1];
    if (lastMilestone) {
      await supabase
        .from("projects")
        .update({
          start_date: start.toISOString().split('T')[0],
          target_end_date: lastMilestone.targetDate,
        })
        .eq("id", projectId);
    }

    console.log("Roadmap generated successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      milestones: createdMilestones,
      roadmap
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-roadmap:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
