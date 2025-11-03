import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const referenceId = searchParams.get("referenceId");

    if (!referenceId) {
      return NextResponse.json(
        { error: "Missing referenceId" },
        { status: 400 }
      );
    }

    console.log("🔍 Verificando estado del pago para:", referenceId);

    // Buscar orden en la base de datos
    const { data: existingOrder, error } = await supabase
      .from("Orders")
      .select("ordernumber, price, statusid, paymentreference")
      .eq("paymentreference", referenceId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("❌ Error consultando orden:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    if (existingOrder) {
      console.log("✅ Orden encontrada:", existingOrder.ordernumber);
      const pointsEarned = Math.floor(existingOrder.price / 10);

      return NextResponse.json({
        status: "paid",
        orderNumber: existingOrder.ordernumber,
        pointsEarned,
        total: existingOrder.price,
        found: true,
      });
    }

    console.log("⏳ Orden no encontrada aún");
    return NextResponse.json({
      status: "pending",
      message: "Payment is being processed",
      found: false,
    });
  } catch (err) {
    console.error("💥 Error en check-payment-status:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
