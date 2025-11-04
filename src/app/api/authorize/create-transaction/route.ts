import { NextResponse } from "next/server";
import xml2js from "xml2js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    console.log("\x1b[36m====================\x1b[0m");
    console.log(
      "\x1b[36m🚀 Iniciando creación de transacción Authorize.Net\x1b[0m"
    );

    const { amount, referenceId } = await req.json();

    console.log("\x1b[33m💰 Monto recibido:\x1b[0m", amount);
    console.log("\x1b[33m🧾 Referencia:\x1b[0m", referenceId);

    const endpoint =
      process.env.AUTHORIZE_ENV === "sandbox"
        ? "https://apitest.authorize.net/xml/v1/request.api"
        : "https://api.authorize.net/xml/v1/request.api";

    // ✅ Definir URL base explícita
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://farm-land-deli-web.vercel.app";

    // =============================
    // 🔹 Construir XML correctamente
    // =============================
    const payload = {
      getHostedPaymentPageRequest: {
        $: { xmlns: "AnetApi/xml/v1/schema/AnetApiSchema.xsd" },
        merchantAuthentication: {
          name: process.env.AUTHORIZE_LOGIN_ID,
          transactionKey: process.env.AUTHORIZE_TRANSACTION_KEY,
        },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: parseFloat(amount).toFixed(2),
        },
        hostedPaymentSettings: {
          setting: [
            {
              settingName: "hostedPaymentReturnOptions",
              settingValue: JSON.stringify({
                showReceipt: false,
                url: `${baseUrl}/order-confirmation?referenceId=${referenceId}`,
                urlText: "Continue",
              }),
            },
          ],
        },
      },
    };

    const builder = new xml2js.Builder({ headless: true });
    const xmlRequest = builder.buildObject(payload);

    console.log("\x1b[34m📤 XML enviado:\x1b[0m\n", xmlRequest);

    // =============================
    // 🔹 Enviar solicitud a Authorize.Net
    // =============================
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlRequest,
    });

    const xmlText = await response.text();
    console.log("\x1b[35m📥 Respuesta completa:\x1b[0m\n", xmlText);

    if (xmlText.startsWith("<!DOCTYPE") || xmlText.startsWith("<html")) {
      return NextResponse.json(
        {
          error: "Authorize.Net devolvió HTML. Verifica tus credenciales.",
          htmlSnippet: xmlText.slice(0, 300),
        },
        { status: 500 }
      );
    }

    // =============================
    // 🔹 Parsear XML correctamente
    // =============================
    const parsed = await xml2js.parseStringPromise(xmlText, {
      explicitArray: false,
    });

    const token =
      parsed.getHostedPaymentPageResponse?.token || parsed.token || null;

    if (!token) {
      console.error("❌ No se recibió token válido.");
      console.error("Respuesta parseada:", JSON.stringify(parsed, null, 2));
      return NextResponse.json(
        {
          error: "No se recibió token válido de Authorize.Net",
          parsed,
        },
        { status: 400 }
      );
    }

    console.log("\x1b[32m✅ Token recibido:\x1b[0m", token);

    // =============================
    // 🔹 Crear orden preliminar en Supabase
    // =============================
    try {
      const { data: users } = await supabase
        .from("Users")
        .select("id")
        .order("dateCreated", { ascending: false })
        .limit(1);

      const user = users?.[0];

      if (user) {
        const { error: insertError } = await supabase.from("Orders").insert({
          ordernumber: referenceId,
          userid: user.id,
          price: amount,
          date: new Date().toISOString(),
          statusid: 0, // pendiente
          paymentreference: referenceId,
          orderstatus: false,
          // ❌ eliminado: createdat (no existe en la tabla)
        });

        if (insertError) {
          console.error("⚠️ Error al crear orden preliminar:", insertError);
        } else {
          console.log("🧾 Orden preliminar creada correctamente:", referenceId);
        }
      } else {
        console.warn("⚠️ No se encontró usuario, no se creó orden preliminar.");
      }
    } catch (dbErr) {
      console.error("💥 Error creando orden preliminar:", dbErr);
    }

    // =============================
    // 🔹 Construir respuesta final
    // =============================
    const paymentEndpoint =
      process.env.AUTHORIZE_ENV === "sandbox"
        ? "https://test.authorize.net/payment/payment"
        : "https://accept.authorize.net/payment/payment";

    console.log("\x1b[36m====================\x1b[0m");

    return NextResponse.json({
      success: true,
      token,
      checkoutUrl: paymentEndpoint,
      referenceId,
    });
  } catch (error: unknown) {
    console.error("💥 Error general en create-transaction:", error);
    return NextResponse.json(
      { error: "Error general creando transacción", details: String(error) },
      { status: 500 }
    );
  }
}
