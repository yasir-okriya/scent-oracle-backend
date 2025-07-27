import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Auth: Validate access-token
  const token = req.headers.get("access-token")?.trim();
  if (!token) {
    return jsonResponse({ error: "Missing access-token header" }, 401);
  }

  let payload: { id?: string };
  try {
    const jwtKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    const result = await verify(token, jwtKey);
    payload = result as typeof payload;
  } catch {
    return jsonResponse({ error: "Invalid or expired token" }, 403);
  }

  // Confirm admin access
  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("id")
    .eq("id", payload.id)
    .single();

  if (adminError || !admin) {
    return jsonResponse({ error: "Unauthorized access" }, 403);
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { id, prompt } = body;
  if (!id || typeof id !== "string" || !prompt || typeof prompt !== "string") {
    return jsonResponse({ error: "Missing or invalid 'id' or 'prompt'" }, 400);
  }

  // Update record by id
  const { data: updated, error: updateError } = await supabase
    .from("oracle_scent_prompt")
    .update({ prompt })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({ message: "Prompt updated", prompt: updated });
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, access-token",
    "Content-Type": "application/json",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}
