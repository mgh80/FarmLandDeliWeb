import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, name, redeemedPoints, remainingPoints } = await req.json();

    if (!email || redeemedPoints === undefined || remainingPoints === undefined) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    await resend.emails.send({
      from: "no-reply@farmlanddeli.com",
      to: email,
      subject: "Redención de puntos - Farmland Deli",
      html: `
        <h2>¡Hola ${name || "cliente"}!</h2>
        <p>Se han redimido <strong>${redeemedPoints}</strong> puntos de tu cuenta.</p>
        <p>Te quedan <strong>${remainingPoints}</strong> puntos disponibles.</p>
        <br/>
        <p>Gracias por confiar en <strong>Farmland Deli</strong> 🍓🧀</p>
      `,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error al enviar correo:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
