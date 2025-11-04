import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { referenceId, amount, userId } = await req.json();

    console.log("📝 Creando orden pendiente:", { referenceId, amount, userId });

    // Crear orden con estado pendiente
    const { data, error } = await supabase
      .from("Orders")
      .insert({
        ordernumber: referenceId,
        userid: userId,
        price: amount,
        date: new Date().toISOString(),
        statusid: 0, // 0 = pendiente
        paymentreference: referenceId,
        orderstatus: false,
        createdat: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creando orden pendiente:", error);
      return NextResponse.json(
        { error: "Error creating pending order", details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("✅ Orden pendiente creada:", data.ordernumber);

    return NextResponse.json(
      {
        success: true,
        orderNumber: data.ordernumber,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("💥 Error en create-pending-order:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
