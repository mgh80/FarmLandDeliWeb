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
    // 🧾 If already paid
    // ==========================
    if (existingOrder.statusid === 1) {
      const pointsEarned = Math.floor(parseFloat(existingOrder.price)); // ✅ Ensure numeric
      console.log("✅ Order already paid — Points:", pointsEarned);

      return NextResponse.json({
        status: "paid",
        orderNumber: existingOrder.ordernumber,
        pointsEarned,
        total: parseFloat(existingOrder.price),
        found: true,
      });
    }

    // ==========================
    // ⏱️ After a few seconds, mark as paid
    // ==========================
    const orderAge = Date.now() - new Date(existingOrder.date).getTime();

    if (orderAge > 3000) {
      const totalAmount = parseFloat(existingOrder.price);
      const pointsEarned = Math.floor(totalAmount); // ✅ 1 point = 1 dollar
      console.log(
        `💰 Total: $${totalAmount} → 🟢 ${pointsEarned} points to assign`
      );

      // 1️⃣ Update order as paid
      const { error: updateOrderError } = await supabase
        .from("Orders")
        .update({ statusid: 1 })
        .eq("paymentreference", referenceId);

      if (updateOrderError) {
        console.error("⚠️ Error updating order:", updateOrderError);
      }

      // 2️⃣ Update user points
      const { data: userData, error: userError } = await supabase
        .from("Users")
        .select("points")
        .eq("id", existingOrder.userid)
        .single();

      if (!userError && userData) {
        const newPoints = (userData.points || 0) + pointsEarned;
        console.log(
          `🏅 User current points: ${userData.points || 0} → New total: ${newPoints}`
        );

        await supabase
          .from("Users")
          .update({ points: newPoints })
          .eq("id", existingOrder.userid);
      } else {
        console.error("⚠️ Error fetching user points:", userError);
      }

      return NextResponse.json({
        status: "paid",
        orderNumber: existingOrder.ordernumber,
        pointsEarned,
        total: totalAmount,
        found: true,
      });
    }

    // ==========================
    // 🕓 If still processing
    // ==========================
    return NextResponse.json({
      status: "pending",
      message: "Payment is being processed",
      found: true,
    });
  } catch (err) {
    console.error("💥 check-payment-status error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
