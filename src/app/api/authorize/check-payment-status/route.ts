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

    if (!referenceId) return NextResponse.json({ error: "No referenceId" }, { status: 400 });

    const { data: order } = await supabase
      .from("Orders")
      .select("*")
      .eq("paymentreference", referenceId)
      .single();

    if (!order || order.statusid === 1) {
      return NextResponse.json({ status: "already_paid", orderNumber: order?.ordernumber });
    }

    // 1. Marcar como pagada
    await supabase.from("Orders").update({ statusid: 1, date: new Date().toISOString() }).eq("id", order.id);

    // 2. Sumar puntos al dueño de la orden (order.userid)
    const pointsEarned = Math.floor(parseFloat(order.price));
    const { data: user } = await supabase.from("Users").select("points").eq("id", order.userid).single();
    
    const newTotal = (user?.points || 0) + pointsEarned;
    await supabase.from("Users").update({ points: newTotal }).eq("id", order.userid);

    return NextResponse.json({
      status: "paid",
      orderNumber: order.ordernumber,
      pointsEarned,
      total: parseFloat(order.price)
    });
  } catch (err) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}