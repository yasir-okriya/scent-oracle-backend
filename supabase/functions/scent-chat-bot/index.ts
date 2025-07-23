import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const openaiUrl = "https://api.openai.com/v1/chat/completions";

Deno.serve(async (req) => {
  const { messages } = await req.json();
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return new Response("Missing OpenAI API key", { status: 500 });
  }

  const openaiRes = await fetch(openaiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages,
      temperature: 0.7
    })
  });

  const result = await openaiRes.json();

  const reply = result;

  return new Response(
    JSON.stringify({ reply }),
    { headers: { "Content-Type": "application/json" } }
  );
});
