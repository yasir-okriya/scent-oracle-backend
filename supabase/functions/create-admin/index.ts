import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import * as bcrypt from "npm:bcryptjs";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const SALT_ROUNDS = 10;

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
      return jsonResponse({ error: "Email and password required" }, 400);
    }

    // Check if admin already exists using .maybeSingle()
    const { data: existingAdmin, error: lookupError } = await supabase
      .from("admins")
      .select("id")
      .eq("email", email)
      .maybeSingle(); // prevents exception if no rows

    if (lookupError) {
      return jsonResponse({ error: "Error checking admin", details: lookupError.message }, 500);
    }

    if (existingAdmin) {
      return jsonResponse({ error: "Admin already exists" }, 409);
    }

    // Hash password with salt rounds
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

    const { data: newAdmin, error: insertError } = await supabase
      .from("admins")
      .insert([{ email, password: hashedPassword }])
      .select("id, email")
      .single();

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({ message: "Admin created", admin: newAdmin }, 201);
  } catch (err) {
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
