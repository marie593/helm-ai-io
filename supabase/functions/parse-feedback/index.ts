import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParseFeedbackRequest {
  content: string;
  source: 'email' | 'chat' | 'call' | 'ticket' | 'manual';
  projectId: string;
  submittedBy?: string;
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

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content, source, projectId, submittedBy }: ParseFeedbackRequest = await req.json();

    if (!content || !projectId) {
      return new Response(JSON.stringify({ error: "Content and projectId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Parsing feedback for project ${projectId}, source: ${source}`);

    // Call AI to parse and extract insights
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
            content: `You are an expert at analyzing customer feedback from implementation projects. Extract structured insights from the provided content.

Always respond with a valid JSON object containing:
- title: A concise title summarizing the main point (max 100 chars)
- type: One of "bug", "feature_request", "feedback", "question", "complaint"
- priority: One of "low", "medium", "high", "urgent"
- summary: A 2-3 sentence summary of the feedback
- sentiment: One of "positive", "negative", "neutral"
- themes: Array of 1-5 theme tags (e.g., "onboarding", "performance", "ui", "integration", "billing")
- actions: Array of specific action items extracted from the content, each with:
  - action: The action to take
  - owner: Who should handle it (if mentioned)
  - due: Any mentioned deadline or timeframe

Be precise and extract only what's explicitly stated or strongly implied.`
          },
          {
            role: "user",
            content: `Analyze this ${source} content and extract structured feedback:\n\n${content}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_feedback",
              description: "Extract structured feedback from customer communication",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Concise title for the feedback" },
                  type: { 
                    type: "string", 
                    enum: ["bug", "feature_request", "feedback", "question", "complaint"]
                  },
                  priority: { 
                    type: "string", 
                    enum: ["low", "medium", "high", "urgent"]
                  },
                  summary: { type: "string", description: "2-3 sentence summary" },
                  sentiment: { 
                    type: "string", 
                    enum: ["positive", "negative", "neutral"]
                  },
                  themes: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "1-5 theme tags"
                  },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        owner: { type: "string" },
                        due: { type: "string" }
                      },
                      required: ["action"]
                    }
                  }
                },
                required: ["title", "type", "priority", "summary", "sentiment", "themes", "actions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_feedback" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log("Extracted feedback:", extracted);

    // Insert the feedback item into the database
    const { data: feedbackItem, error: insertError } = await supabase
      .from("feedback_items")
      .insert({
        project_id: projectId,
        source: source,
        type: extracted.type,
        status: "new",
        priority: extracted.priority,
        title: extracted.title,
        description: extracted.summary,
        original_content: content,
        ai_summary: extracted.summary,
        ai_extracted_actions: extracted.actions,
        ai_sentiment: extracted.sentiment,
        ai_themes: extracted.themes,
        submitted_by: submittedBy,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to save feedback: ${insertError.message}`);
    }

    console.log("Feedback saved:", feedbackItem.id);

    return new Response(JSON.stringify({ 
      success: true, 
      feedbackItem,
      extracted 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in parse-feedback:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
