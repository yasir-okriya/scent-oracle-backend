import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const openaiUrl = "https://api.openai.com/v1/chat/completions";

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const { messages } = await req.json();
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return new Response("Missing OpenAI API key", {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // 🔍 Fetch the first prompt from oracle_scent_prompt table
  const { data: promptData, error } = await supabase
    .from("oracle_scent_prompt")
    .select("prompt")
    .limit(1)
    .maybeSingle();

  if (error || !promptData?.prompt) {
    return new Response(
      JSON.stringify({ error: "Prompt not found in oracle_scent_prompt" }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    );
  }

  // 🧠 Create system prompt message
  const systemMessage = {
    id: "1",
    role: "system",
    content: promptData.prompt,
  };

  // 🧩 Prepend system message to the messages array
  const fullMessages = [systemMessage, ...messages];

  // 🤖 Call OpenAI API
  const openaiRes = await fetch(openaiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: fullMessages,
      temperature: 0.7,
    }),
  });

  const result = await openaiRes.json();

  return new Response(JSON.stringify({ reply: result }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
