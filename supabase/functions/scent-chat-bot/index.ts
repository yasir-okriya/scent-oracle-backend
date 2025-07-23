import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const openaiUrl = "https://api.openai.com/v1/chat/completions";

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
      headers: {
        "Access-Control-Allow-Origin": "*", 
      },
    });
  }

  const openaiRes = await fetch(openaiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
    }),
  });

  const result = await openaiRes.json();

  return new Response(
    JSON.stringify({ reply: result }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", 
      },
    }
  );
});
