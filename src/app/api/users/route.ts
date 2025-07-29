import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // Traer usuarios que tienen rol asignado (admin, viewer, etc.)
  const { data: users, error } = await supabase
    .from("Users")
    .select("id, email, role")
    .not("role", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];

  for (const user of users) {
    const { data: permissions } = await supabase
      .from("UserPermissions")
      .select("permission")
      .eq("user_id", user.id);

    results.push({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: permissions?.map(p => p.permission) ?? [],
    });
  }

  return NextResponse.json(results);
}
