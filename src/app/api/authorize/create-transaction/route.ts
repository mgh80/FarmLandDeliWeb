//create-transaction/route.ts

import { NextResponse } from "next/server";
import xml2js from "xml2js";
import { createClient } from "@supabase/supabase-js";

// =======================================
// 🔹 Inicializar Supabase
// =======================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =======================================
// 🔹 CONFIGURACIÓN CORS
// =======================================
const allowedOrigins = [
  "https://farm-land-deli-app.vercel.app",
  "https://farm-land-deli-web.vercel.app",
  "http://localhost:3000",
];

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

function corsResponse(
  req: Request,
  data: JsonObject,
  status = 200
): NextResponse {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  return NextResponse.json(data, { status, headers });
}

export async function OPTIONS(req: Request): Promise<NextResponse> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  return new NextResponse(null, { status: 200, headers });
}

// =======================================
// 🔹 ENDPOINT PRINCIPAL POST
// =======================================
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: {
      amount: number;
      referenceId: string;
      userId: string;
      cartItems?: { id: number; quantity: number }[];
    } = await req.json();

    const { amount, referenceId, userId, cartItems = [] } = body;

    console.log(`📦 create-transaction:`, {
      referenceId,
      userId,
      amount,
    });

    if (!amount || !referenceId || !userId) {
      return corsResponse(
        req,
        { error: "Faltan parámetros obligatorios (amount, referenceId, userId)." },
        400
      );
    }

    // ==============================
    // 🔹 Configurar Authorize.Net
    // ==============================
    const endpoint =
      process.env.AUTHORIZE_ENV === "sandbox"
        ? "https://apitest.authorize.net/xml/v1/request.api"
        : "https://api.authorize.net/xml/v1/request.api";

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://farm-land-deli-web.vercel.app";

    // 🔹 IMPORTANTE: Pasar referenceId en la URL de retorno
    const returnUrl = `${baseUrl}/order-confirmation?referenceId=${referenceId}&orderNumber=${referenceId}`;
    console.log(`🔗 Return URL: ${returnUrl}`);

    const payload = {
      getHostedPaymentPageRequest: {
        $: { xmlns: "AnetApi/xml/v1/schema/AnetApiSchema.xsd" },
        merchantAuthentication: {
          name: process.env.AUTHORIZE_LOGIN_ID,
          transactionKey: process.env.AUTHORIZE_TRANSACTION_KEY,
        },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: parseFloat(amount.toFixed(2)),
        },
        hostedPaymentSettings: {
          setting: [
            {
              settingName: "hostedPaymentReturnOptions",
              settingValue: JSON.stringify({
                showReceipt: false,
                url: returnUrl,
                urlText: "Continue",
              }),
            },
            {
              settingName: "hostedPaymentPaymentOptions",
              settingValue: JSON.stringify({
                cardCodeRequired: true,
                showCreditCard: true,
                showBankAccount: false,
              }),
            },
          ],
        },
      },
    };

    const xmlRequest = new xml2js.Builder({ headless: true }).buildObject(payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlRequest,
    });

    const xmlText = await response.text();
    const parsed = await xml2js.parseStringPromise(xmlText, {
      explicitArray: false,
    });
    const token: string | null =
      parsed?.getHostedPaymentPageResponse?.token || null;

    if (!token) {
      return corsResponse(
        req,
        { error: "No se recibió token válido de Authorize.Net" },
        400
      );
    }

    console.log(`✅ Token generado: ${token.substring(0, 20)}...`);

    // ==============================
    // 🔹 Preparar productos
    // ==============================
    let productid: number | null = null;
    let quantity: number | null = null;

    if (Array.isArray(cartItems) && cartItems.length > 0) {
      productid = Number(cartItems[0].id);
      quantity = Number(cartItems[0].quantity);
    }

    // ==============================
    // 🔹 Crear orden principal en Supabase
    // ==============================
    const { data: order, error: orderError } = await supabase
      .from("Orders")
      .insert({
        ordernumber: referenceId,
        userid: userId, // ✅ El userId correcto
        price: parseFloat(amount.toFixed(2)),
        date: new Date().toISOString(),
        statusid: 0, // ✅ Pendiente (no pagado aún)
        paymentreference: referenceId,
        orderstatus: false,
        productid,
        quantity,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("⚠️ Error al crear orden:", orderError);
    } else {
      console.log(`✅ Orden creada: ${referenceId} para usuario ${userId}`);
    }

    // ==============================
    // 🔹 Guardar productos asociados
    // ==============================
    if (order && cartItems.length > 0) {
      const validItems = cartItems
        .filter((item) => item.id && item.quantity > 0)
        .map((item) => ({
          orderid: order.id,
          productid: item.id,
          quantity: item.quantity,
        }));

      if (validItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("OrderIngredients")
          .insert(validItems);
        if (itemsError)
          console.error("⚠️ Error al guardar productos:", itemsError);
      }
    }

    // ==============================
    // 🔹 Devolver respuesta
    // ==============================
    const paymentEndpoint =
      process.env.AUTHORIZE_ENV === "sandbox"
        ? "https://test.authorize.net/payment/payment"
        : "https://accept.authorize.net/payment/payment";

    return corsResponse(req, {
      success: true,
      token,
      checkoutUrl: paymentEndpoint,
      referenceId,
    });
  } catch (error) {
    console.error("💥 Error general en create-transaction:", error);
    return corsResponse(
      req,
      {
        error: "Error general creando transacción",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}