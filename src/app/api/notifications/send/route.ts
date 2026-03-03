//notifications/send/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// Inicializa Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔵 Body recibido:", body);

    const { userIds, title, body: messageBody } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !title || !messageBody) {
      console.warn("🟡 Datos incompletos en request");
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const { data: users, error } = await supabase
      .from("Users")
      .select("email, name, phone")
      .in("id", userIds);

    if (error) {
      console.error("🔴 Error al consultar Supabase:", error.message);
      return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
    }

    if (!users || users.length === 0) {
      console.warn("🟡 No se encontraron usuarios para los IDs proporcionados");
      return NextResponse.json({ error: "Usuarios no encontrados" }, { status: 404 });
    }

    for (const user of users) {
  if (user.email === "delifarmland@gmail.com") { // 👈 tu propio correo
    console.log(`📨 Enviando correo a ${user.email}`);
    const result = await resend.emails.send({
      from: "Farmland Deli <onboarding@resend.dev>",
      to: user.email,
      subject: title,
      html: `
        <h2>Hola ${user.name || "cliente"}!</h2>
        <p>${messageBody}</p>
        <br/>
        <p>Gracias por confiar en <strong>Farmland Deli</strong> 🍓🧀</p>
      `,
    });
    console.log("✅ Resultado envío:", result);
  } else {
    console.warn(`⚠️ Usuario omitido por no ser correo permitido en pruebas: ${user.email}`);
  }
}


    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: unknown) {
  console.error("🔴 Error interno:", error);
  if (error instanceof Error) {
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "Error desconocido" }, { status: 500 });
}

}
