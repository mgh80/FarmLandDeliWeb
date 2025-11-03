import { NextResponse } from "next/server";
import xml2js from "xml2js";

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
          order: {
            invoiceNumber: referenceId,
            description: "Farm Land Deli Order",
          },
        },
        hostedPaymentSettings: {
          setting: [
            {
              settingName: "hostedPaymentReturnOptions",
              settingValue: JSON.stringify({
                showReceipt: false,
                url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/authorize/verify-payment`,
                urlText: "Return to Farm Land Deli",
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

    console.log("\x1b[35m📥 Respuesta cruda:\x1b[0m\n", xmlText.slice(0, 500));

    // =============================
    // 🔹 Detectar error HTML
    // =============================
    if (xmlText.startsWith("<!DOCTYPE") || xmlText.startsWith("<html")) {
      console.error("\x1b[31m❌ ERROR: Authorize.Net devolvió HTML.\x1b[0m");
      return NextResponse.json(
        {
          error:
            "Authorize.Net devolvió HTML (verifica tus credenciales o endpoint)",
          htmlSnippet: xmlText.slice(0, 300),
        },
        { status: 500 }
      );
    }

    // =============================
    // 🔹 Parsear XML correctamente
    // =============================
    let parsed: Record<string, unknown> = {};

    try {
      parsed = await xml2js.parseStringPromise(xmlText, {
        explicitArray: false,
      });
    } catch (parseErr) {
      console.error("\x1b[31m❌ Error parseando XML:\x1b[0m", parseErr);
      return NextResponse.json(
        { error: "Error parseando XML", xmlSnippet: xmlText.slice(0, 500) },
        { status: 500 }
      );
    }

    type AuthorizeResponse = {
      getHostedPaymentPageResponse?: {
        token?: string;
      };
      token?: string;
    };

    const parsedResponse = parsed as AuthorizeResponse;
    const token =
      parsedResponse.getHostedPaymentPageResponse?.token ||
      parsedResponse.token ||
      null;

    if (!token) {
      console.error(
        "\x1b[31m❌ No se recibió token válido en la respuesta.\x1b[0m"
      );
      return NextResponse.json(
        {
          error:
            "No se recibió token válido de Authorize.Net (revisa las credenciales o el formato del XML)",
          parsed,
        },
        { status: 400 }
      );
    }

    console.log("\x1b[32m✅ Token recibido:\x1b[0m", token);
    console.log("\x1b[36m====================\x1b[0m");

    return NextResponse.json({
      success: true,
      token,
      checkoutUrl: `https://accept.authorize.net/payment/payment/${token}`,
      referenceId,
    });
  } catch (error: unknown) {
    console.error(
      "\x1b[31m💥 Error general en create-transaction:\x1b[0m",
      error
    );
    return NextResponse.json(
      { error: "Error general creando transacción", details: String(error) },
      { status: 500 }
    );
  }
}
