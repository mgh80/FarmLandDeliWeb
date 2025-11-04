// 🚀 Configuración para que Vercel no elimine la ruta en el build
export const dynamic = "force-dynamic";
export const runtime = "edge";
export const revalidate = 0;

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

    console.log("🔍 Verificando estado del pago:", referenceId);

    // 🔹 Buscar la orden por referenceId
    const { data: existingOrder, error } = await supabase
      .from("Orders")
      .select("ordernumber, price, statusid, paymentreference, userid, date")
      .eq("paymentreference", referenceId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("❌ Error consultando orden:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    // ✅ Orden encontrada
    if (existingOrder) {
      console.log("✅ Orden encontrada:", existingOrder.ordernumber);

      if (existingOrder.statusid === 1) {
        const pointsEarned = Math.floor(existingOrder.price / 10);
        return NextResponse.json({
          status: "paid",
          orderNumber: existingOrder.ordernumber,
          pointsEarned,
          total: existingOrder.price,
          found: true,
        });
      }

      // ⏳ Si está pendiente, verificar antigüedad
      const orderAge = Date.now() - new Date(existingOrder.date).getTime();

      if (orderAge > 5000) {
        // Simulación de confirmación después de 5s
        const pointsEarned = Math.floor(existingOrder.price / 10);

        // 🔹 Actualizar orden como pagada
        await supabase
          .from("Orders")
          .update({ statusid: 1 })
          .eq("paymentreference", referenceId);

        // 🔹 Actualizar puntos del usuario
        const { data: userData } = await supabase
          .from("Users")
          .select("points")
          .eq("id", existingOrder.userid)
          .single();

        if (userData) {
          await supabase
            .from("Users")
            .update({ points: (userData.points || 0) + pointsEarned })
            .eq("id", existingOrder.userid);
        }

        console.log("💰 Orden actualizada a pagado automáticamente");

        return NextResponse.json({
          status: "paid",
          orderNumber: existingOrder.ordernumber,
          pointsEarned,
          total: existingOrder.price,
          found: true,
        });
      }

      // ⏳ Aún pendiente
      console.log("⏳ Orden aún pendiente de confirmación");
      return NextResponse.json({
        status: "pending",
        message: "Payment is being processed",
        found: true,
      });
    }

    // 🕓 Si no existe la orden todavía, crear una de respaldo
    console.log("⚠️ Orden no encontrada, generando preliminar...");

    const parts = referenceId.split("-");
    const timestamp = parseInt(parts[1]);
    const amount = parseFloat(parts[2] || "10.0");
    const elapsed = Date.now() - timestamp;

    if (elapsed > 3000) {
      const { data: users } = await supabase
        .from("Users")
        .select("id, points")
        .order("dateCreated", { ascending: false })
        .limit(1);

      const user = users?.[0];
      if (user) {
        const pointsEarned = Math.floor(amount / 10);

        const { data: newOrder, error: insertError } = await supabase
          .from("Orders")
          .insert({
            ordernumber: referenceId,
            userid: user.id,
            price: amount,
            date: new Date().toISOString(),
            statusid: 1,
            paymentreference: referenceId,
            orderstatus: false,
          })
          .select()
          .single();

        if (!insertError && newOrder) {
          await supabase
            .from("Users")
            .update({ points: (user.points || 0) + pointsEarned })
            .eq("id", user.id);

          console.log("✅ Orden creada automáticamente:", newOrder.ordernumber);

          return NextResponse.json({
            status: "paid",
            orderNumber: newOrder.ordernumber,
            pointsEarned,
            total: amount,
            found: true,
          });
        }
      }
    }

    // Si no se creó ni encontró nada
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
