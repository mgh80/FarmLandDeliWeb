import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "unknown";
    const orderId = searchParams.get("orderId") || "no-order";
    const referenceId = searchParams.get("referenceId") || "";
    const amount = searchParams.get("amount") || "";

    console.log("🔁 Clover redirigió con estado:", status);
    console.log("📦 Datos:", { orderId, referenceId, amount });
    console.log(
      "🔁 Clover redirigió con estado:",
      status,
      "referencia:",
      referenceId
    );

    // URL de destino en tu frontend (puede ser la app web o una vista interna)
    const redirectBase =
      process.env.PUBLIC_BASE_URL || "https://farm-land-deli-web.vercel.app";

    // Redirige al OrderConfirmationScreen de tu app web
    const redirectUrl = `${redirectBase}/order-confirmation?status=${status}&referenceId=${referenceId}&amount=${amount}`;

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("❌ Error en redirección Clover:", err);
    return NextResponse.json(
      { error: "Error en redirección Clover", details: String(err) },
      { status: 500 }
    );
  }
}
