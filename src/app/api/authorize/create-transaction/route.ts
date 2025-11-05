import { NextResponse } from "next/server";
import xml2js from "xml2js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =======================================
// 🔹 CONFIGURACIÓN CORS (sin "any")
// =======================================
const allowedOrigins = [
  "https://farm-land-deli-app.vercel.app",
  "https://farm-land-deli-web.vercel.app",
  "http://localhost:3000", // 🔧 útil para desarrollo local
];

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

// Helper CORS tipado
function corsResponse(data: JsonObject, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigins.join(", "),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Manejar preflight OPTIONS
export async function OPTIONS(): Promise<NextResponse> {
  return corsResponse({}, 200);
}

// =======================================
// 🔹 ENDPOINT PRINCIPAL POST
// =======================================
export async function POST(req: Request): Promise<NextResponse> {
  try {
    console.log("\x1b[36m====================\x1b[0m");
    console.log("\x1b[36m🚀 Creando transacción Authorize.Net\x1b[0m");

    const body: {
      amount: number;
      referenceId: string;
      cartItems?: { id: number; quantity: number }[];
    } = await req.json();

    const { amount, referenceId, cartItems = [] } = body;

    if (!amount || !referenceId) {
      return corsResponse({ error: "Faltan parámetros obligatorios." }, 400);
    }

    console.log("💰 Monto:", amount);
    console.log("🧾 Referencia:", referenceId);
    console.log("🛒 Carrito:", cartItems);

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
                url: `${baseUrl}/order-confirmation?referenceId=${referenceId}`,
                urlText: "Continue",
              }),
            },
          ],
        },
      },
    };

    const xmlRequest = new xml2js.Builder({ headless: true }).buildObject(
      payload
    );

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
        { error: "No se recibió token válido de Authorize.Net" },
        400
      );
    }

    console.log("✅ Token recibido:", token);

    // ==============================
    // 🔹 Obtener usuario actual
    // ==============================
    const { data: users } = await supabase
      .from("Users")
      .select("id")
      .order("dateCreated", { ascending: false })
      .limit(1);

    const user = users?.[0];
    if (!user) {
      return corsResponse({ error: "Usuario no encontrado." }, 400);
    }

    // ==============================
    // 🔹 Guardar producto y cantidad
    // ==============================
    let productid: number | null = null;
    let quantity: number | null = null;

    if (Array.isArray(cartItems) && cartItems.length > 0) {
      productid = Number(cartItems[0].id);
      quantity = Number(cartItems[0].quantity);
    }

    // ==============================
    // 🔹 Crear orden principal
    // ==============================
    const { data: order, error: orderError } = await supabase
      .from("Orders")
      .insert({
        ordernumber: referenceId,
        userid: user.id,
        price: parseFloat(amount.toFixed(2)),
        date: new Date().toISOString(),
        statusid: 0,
        paymentreference: referenceId,
        orderstatus: false,
        productid,
        quantity,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("⚠️ Error al crear orden:", orderError);
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

    console.log("✅ Transacción completada correctamente.");
    console.log("\x1b[36m====================\x1b[0m");

    return corsResponse({
      success: true,
      token,
      checkoutUrl: paymentEndpoint,
      referenceId,
    });
  } catch (error) {
    console.error("💥 Error general en create-transaction:", error);
    return corsResponse(
      {
        error: "Error general creando transacción",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

// import { NextResponse } from "next/server";
// import xml2js from "xml2js";
// import { createClient } from "@supabase/supabase-js";

// // ==============================
// // 🔹 Tipos definidos
// // ==============================
// interface CartItem {
//   id: number;
//   name?: string;
//   price?: number;
//   quantity: number;
// }

// interface BodyData {
//   amount: number;
//   referenceId: string;
//   cartItems: CartItem[];
//   userId: string;
// }

// // ==============================
// // 🔹 Inicializar Supabase
// // ==============================
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(req: Request) {
//   try {
//     // ==============================
//     // 🔹 Leer cuerpo del request
//     // ==============================
//     const body = (await req.json()) as BodyData;

//     const { amount, referenceId, cartItems, userId } = body;

//     if (!amount || !referenceId || !userId) {
//       return NextResponse.json(
//         {
//           error:
//             "Faltan parámetros obligatorios (amount, referenceId, userId).",
//         },
//         { status: 400 }
//       );
//     }

//     // ==============================
//     // 🔹 Configurar Authorize.Net
//     // ==============================
//     const endpoint =
//       process.env.AUTHORIZE_ENV === "sandbox"
//         ? "https://apitest.authorize.net/xml/v1/request.api"
//         : "https://api.authorize.net/xml/v1/request.api";

//     const baseUrl =
//       process.env.NEXT_PUBLIC_BASE_URL ||
//       "https://farm-land-deli-web.vercel.app";

//     const payload = {
//       getHostedPaymentPageRequest: {
//         $: { xmlns: "AnetApi/xml/v1/schema/AnetApiSchema.xsd" },
//         merchantAuthentication: {
//           name: process.env.AUTHORIZE_LOGIN_ID,
//           transactionKey: process.env.AUTHORIZE_TRANSACTION_KEY,
//         },
//         transactionRequest: {
//           transactionType: "authCaptureTransaction",
//           amount: parseFloat(amount.toFixed(2)),
//         },
//         hostedPaymentSettings: {
//           setting: [
//             {
//               settingName: "hostedPaymentReturnOptions",
//               settingValue: JSON.stringify({
//                 showReceipt: false,
//                 url: `${baseUrl}/order-confirmation?referenceId=${referenceId}`,
//                 urlText: "Continuar",
//               }),
//             },
//           ],
//         },
//       },
//     };

//     const xmlRequest = new xml2js.Builder({ headless: true }).buildObject(
//       payload
//     );

//     // ==============================
//     // 🔹 Enviar solicitud a Authorize.Net
//     // ==============================
//     const response = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/xml" },
//       body: xmlRequest,
//     });

//     const xmlText = await response.text();
//     const parsed = await xml2js.parseStringPromise(xmlText, {
//       explicitArray: false,
//     });
//     const token = parsed?.getHostedPaymentPageResponse?.token || null;

//     if (!token) {
//       console.error("❌ No se recibió token válido.");
//       return NextResponse.json(
//         { error: "No se recibió token válido de Authorize.Net" },
//         { status: 400 }
//       );
//     }

//     // ==============================
//     // 🔹 Derivar productid y quantity desde cartItems
//     // ==============================
//     let productid: number | null = null;
//     let quantity: number | null = null;

//     if (Array.isArray(cartItems) && cartItems.length > 0) {
//       productid = Number(cartItems[0].id);
//       quantity = Number(cartItems[0].quantity);
//       console.log("✅ Producto a guardar en Orders:", { productid, quantity });
//     } else {
//       console.warn("⚠️ No llegaron cartItems válidos al backend");
//     }

//     // ==============================
//     // 🔹 Crear orden principal
//     // ==============================
//     const { data: order, error: orderError } = await supabase
//       .from("Orders")
//       .insert({
//         ordernumber: referenceId,
//         userid: userId,
//         price: parseFloat(amount.toFixed(2)),
//         date: new Date().toISOString(),
//         statusid: 0,
//         paymentreference: referenceId,
//         orderstatus: false,
//         productid,
//         quantity,
//       })
//       .select("id")
//       .single();

//     if (orderError) {
//       console.error("⚠️ Error al crear la orden:", orderError);
//     } else {
//       console.log("🧾 Orden creada:", order.id);
//     }

//     // ==============================
//     // 🔹 Guardar productos en OrderIngredients
//     // ==============================
//     if (order && Array.isArray(cartItems) && cartItems.length > 0) {
//       const validItems = cartItems
//         .filter((item) => item.id && item.quantity > 0)
//         .map((item) => ({
//           orderid: order.id,
//           productid: item.id,
//           quantity: item.quantity,
//         }));

//       if (validItems.length > 0) {
//         console.log("📦 Insertando productos:", validItems);
//         const { error: itemsError } = await supabase
//           .from("OrderIngredients")
//           .insert(validItems);

//         if (itemsError)
//           console.error("⚠️ Error al guardar productos:", itemsError);
//         else console.log("✅ Productos guardados correctamente.");
//       }
//     }

//     // ==============================
//     // 🔹 Responder al frontend
//     // ==============================
//     const paymentEndpoint =
//       process.env.AUTHORIZE_ENV === "sandbox"
//         ? "https://test.authorize.net/payment/payment"
//         : "https://accept.authorize.net/payment/payment";

//     console.log("\x1b[36m====================\x1b[0m");

//     return NextResponse.json({
//       success: true,
//       token,
//       checkoutUrl: paymentEndpoint,
//       referenceId,
//     });
//   } catch (error) {
//     console.error("💥 Error general en create-transaction:", error);
//     return NextResponse.json(
//       { error: "General error creating transaction", details: String(error) },
//       { status: 500 }
//     );
//   }
// }
