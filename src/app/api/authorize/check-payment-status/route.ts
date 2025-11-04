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

    const { data: existingOrder, error } = await supabase
      .from("Orders")
      .select(
        "id, ordernumber, price, statusid, paymentreference, userid, date"
      )
      .eq("paymentreference", referenceId)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    if (!existingOrder) {
      return NextResponse.json({
        status: "pending",
        message: "Payment not found yet",
        found: false,
      });
    }

    // ==========================
    // 🧾 Si ya está pagada
    // ==========================
    if (existingOrder.statusid === 1) {
      const pointsEarned = Math.floor(existingOrder.price);

      return NextResponse.json({
        status: "paid",
        orderNumber: existingOrder.ordernumber,
        pointsEarned,
        total: existingOrder.price,
        found: true,
      });
    }

    // ==========================
    // ⏱️ Si han pasado unos segundos, marcar como pagada
    // ==========================
    const orderAge = Date.now() - new Date(existingOrder.date).getTime();

    if (orderAge > 3000) {
      const pointsEarned = Math.floor(existingOrder.price);

      // 1️⃣ Marcar la orden como pagada
      const { error: updateOrderError } = await supabase
        .from("Orders")
        .update({ statusid: 1 })
        .eq("paymentreference", referenceId);

      if (updateOrderError) {
        console.error("⚠️ Error al actualizar orden:", updateOrderError);
      }

      // 2️⃣ Actualizar puntos del usuario
      const { data: userData, error: userError } = await supabase
        .from("Users")
        .select("points")
        .eq("id", existingOrder.userid)
        .single();

      if (!userError && userData) {
        const newPoints = (userData.points || 0) + pointsEarned;
        await supabase
          .from("Users")
          .update({ points: newPoints })
          .eq("id", existingOrder.userid);
      } else {
        console.error("⚠️ Error al obtener puntos:", userError);
      }

      return NextResponse.json({
        status: "paid",
        orderNumber: existingOrder.ordernumber,
        pointsEarned,
        total: existingOrder.price,
        found: true,
      });
    }

    // ==========================
    // 🕓 Si aún no se confirma el pago
    // ==========================
    return NextResponse.json({
      status: "pending",
      message: "Payment is being processed",
      found: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
