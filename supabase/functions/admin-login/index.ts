import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import * as bcrypt from "npm:bcryptjs";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { decode } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

const JWT_SECRET_KEY = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(Deno.env.get("JWT_SECRET")!),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  try {
    
    const { email, password } = await req.json();

    if (!email || !password) {
      return jsonResponse({ error: "Email and password are required" }, 400);
    }

    const { data: admin, error } = await supabase
      .from("admins")
      .select("id, email, password")
      .eq("email", email)
      .single();

    if (error || !admin) {
      return jsonResponse({ error: "Invalid email or password" }, 401);
    }

    const passwordMatch = bcrypt.compareSync(password, admin.password);

    if (!passwordMatch) {
      return jsonResponse({ error: "Invalid email or password" }, 401);
    }

    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      {
        id: admin.id,
        email: admin.email,
        exp: getNumericDate(60 * 60 * 24), // 1 day
      },
      JWT_SECRET_KEY,
    );

    

    // Return token and user info (excluding password)
    return jsonResponse({
      token: jwt,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    }, 200);
  } catch (_err) {
    return jsonResponse({ error: "Invalid JSON or server error" }, 500);
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}
