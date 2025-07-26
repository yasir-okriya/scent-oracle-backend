import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  try {
    const token = req.headers.get("access-token")?.trim() ||
      (await req.json().catch(() => ({}))).token;

    if (!token || typeof token !== "string") {
      return jsonResponse({ error: "Token is required in request body" }, 400);
    }

    const JWT_SECRET_KEY = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    let payload: { id?: string; email?: string; exp?: number } | undefined;
    try {
      const result = await verify(token, JWT_SECRET_KEY);

      payload = result as {
        id?: string;
        email?: string;
        exp?: number;
      };
    } catch (_err) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const userId = payload?.id;
    if (!userId) {
      return jsonResponse({ error: "Invalid token payload (missing id)" }, 400);
    }

    const { data: admin, error } = await supabase
      .from("admins")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (error || !admin) {
      return jsonResponse({ error: "Admin not found" }, 404);
    }

    return jsonResponse({ admin });
  } catch (_err) {
    return jsonResponse({ error: "Unexpected server error" }, 500);
  }
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
