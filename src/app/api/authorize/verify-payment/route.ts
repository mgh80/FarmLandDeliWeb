import { NextResponse } from "next/server";
import xml2js from "xml2js";
import { createClient } from "@supabase/supabase-js";

// ==========================================================
// 🔹 Inicializa Supabase (usa la Service Role Key segura)
// ==========================================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ==========================================================
// 🔹 Tipado para respuesta XML de Authorize.Net
// ==========================================================
interface AuthorizeNetTransaction {
  getTransactionDetailsResponse?: {
    transaction?: {
      transactionStatus?: string;
      authAmount?: string;
    };
  };
}

// ==========================================================
// 🔹 Endpoint principal
// ==========================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transId = searchParams.get("transId");
    const referenceId = searchParams.get("referenceId");

    if (!transId && !referenceId) {
      return NextResponse.json(
        { error: "Missing transId or referenceId" },
        { status: 400 }
      );
    }

    const transactionId = transId || referenceId;
    console.log("🔍 Verificando pago con ID:", transactionId);

    // ==========================================================
    // 🧪 MODO LOCAL DE PRUEBA (sin Authorize.Net)
    // ==========================================================
    if (referenceId === "LOCALTEST") {
      console.log("🧪 Simulación local de pago exitoso");

      const pointsEarned = 5;
      const orderNumber = "ORD-" + Date.now();
      const amount = 13.76;

      // Crear orden simulada en Supabase
      const { data: users } = await supabase
        .from("Users")
        .select("id, points")
        .order("dateCreated", { ascending: false })
        .limit(1);

      const user = users?.[0];
      if (user) {
        const { error: orderError } = await supabase.from("Orders").insert({
          ordernumber: orderNumber,
          userid: user.id,
          price: amount,
          date: new Date().toISOString(),
          statusid: 1,
          quantity: 1,
          paymentreference: referenceId,
        });

        if (orderError)
          console.error("❌ Error creando orden local:", orderError);

        await supabase
          .from("Users")
          .update({ points: (user.points || 0) + pointsEarned })
          .eq("id", user.id);
      }

      // ==========================================================
      // ✅ Redirigir al frontend (localhost)
      // ==========================================================
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL &&
        process.env.NEXT_PUBLIC_SITE_URL.trim() !== ""
          ? process.env.NEXT_PUBLIC_SITE_URL
          : "http://localhost:3000";

      const redirectUrl = new URL(`${baseUrl}/order-confirmation`);
      redirectUrl.searchParams.set("orderNumber", orderNumber);
      redirectUrl.searchParams.set("total", amount.toFixed(2));
      redirectUrl.searchParams.set("pointsEarned", pointsEarned.toString());
      redirectUrl.searchParams.set("status", "paid");

      console.log("🔁 Redirigiendo a:", redirectUrl.toString());
      return NextResponse.redirect(redirectUrl.toString(), 303);
    }

    // ==========================================================
    // ⚙️ BLOQUE REAL DE CONSULTA (Sandbox o Producción)
    // ==========================================================
    const endpoint =
      process.env.AUTHORIZE_ENV === "sandbox"
        ? "https://apitest.authorize.net/xml/v1/request.api"
        : // 🔒 Para producción descomentar esta línea
          // : "https://api.authorize.net/xml/v1/request.api";
          "https://apitest.authorize.net/xml/v1/request.api"; // mantener sandbox hasta pruebas finales

    // Construir XML de consulta
    const payload = {
      getTransactionDetailsRequest: {
        $: { xmlns: "AnetApi/xml/v1/schema/AnetApiSchema.xsd" },
        merchantAuthentication: {
          name: process.env.AUTHORIZE_LOGIN_ID,
          transactionKey: process.env.AUTHORIZE_TRANSACTION_KEY,
        },
        transId: transactionId,
      },
    };

    const builder = new xml2js.Builder({ headless: true });
    const xmlRequest = builder.buildObject(payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlRequest,
    });

    const xmlText = await response.text();

    // Parsear XML
    const parsed = (await xml2js.parseStringPromise(xmlText, {
      explicitArray: false,
    })) as AuthorizeNetTransaction;

    const tx = parsed.getTransactionDetailsResponse?.transaction;
    if (!tx) {
      console.error("❌ Transacción no encontrada:", xmlText.slice(0, 400));
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const status = tx.transactionStatus?.toLowerCase() || "unknown";
    const amount = parseFloat(tx.authAmount || "0");
    console.log("📋 Estado:", status, "| 💰 Monto:", amount);

    // ==========================================================
    // ✅ Si el pago fue exitoso
    // ==========================================================
    if (
      ["captured", "settledsuccessfully", "settled successfully", "paid"].some(
        (s) => status.includes(s)
      )
    ) {
      const { data: users } = await supabase
        .from("Users")
        .select("id, points")
        .order("dateCreated", { ascending: false })
        .limit(1);

      const user = users?.[0];
      if (!user) {
        console.error("⚠️ No se encontró usuario para registrar la orden");
        return NextResponse.json({ error: "No user found" }, { status: 400 });
      }

      const userId = user.id;
      const currentPoints = user.points || 0;
      const pointsEarned = Math.floor(amount / 10);
      const orderNumber = "ORD-" + Date.now();

      // Crear orden
      const { error: orderError } = await supabase.from("Orders").insert({
        ordernumber: orderNumber,
        userid: userId,
        price: amount,
        date: new Date().toISOString(),
        statusid: 1, // pagado
        quantity: 1,
        paymentreference: referenceId || transactionId,
      });

      if (orderError) console.error("❌ Error creando orden:", orderError);

      // Actualizar puntos
      const { error: pointsError } = await supabase
        .from("Users")
        .update({ points: currentPoints + pointsEarned })
        .eq("id", userId);

      if (pointsError)
        console.error("⚠️ Error actualizando puntos:", pointsError);

      console.log("✅ Orden creada y puntos actualizados correctamente");

      // ==========================================================
      // 🚀 Redirigir al frontend
      // ==========================================================
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL &&
        process.env.NEXT_PUBLIC_SITE_URL.trim() !== ""
          ? process.env.NEXT_PUBLIC_SITE_URL
          : "http://localhost:3000";

      const redirectUrl = new URL(`${baseUrl}/order-confirmation`);
      redirectUrl.searchParams.set("orderNumber", orderNumber);
      redirectUrl.searchParams.set("total", amount.toFixed(2));
      redirectUrl.searchParams.set("pointsEarned", pointsEarned.toString());
      redirectUrl.searchParams.set("status", "paid");

      console.log("🔁 Redirigiendo a:", redirectUrl.toString());
      return NextResponse.redirect(redirectUrl.toString(), 303);
    }

    // ==========================================================
    // 🔸 Si el pago aún no está confirmado
    // ==========================================================
    return NextResponse.json({
      status,
      message: "Payment not completed yet",
      transId: transactionId,
    });
  } catch (err) {
    console.error("💥 Error en verify-payment:", err);
    return NextResponse.json(
      { error: "Error verifying payment", details: String(err) },
      { status: 500 }
    );
  }
}
