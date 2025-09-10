const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19000",
  "http://localhost:19006",
  "exp://192.168.1.5:19000",
  "exp://localhost:19000",
  "http://192.168.1.5:8081",
  "http://192.168.1.5:19000",
  "http://192.168.1.5:19006",
  "http://localhost:3000",
  "http://192.168.1.5:3000",
  "https://farm-land-deli-web.vercel.app",
  "https://*.vercel.app",
];

function corsResponse(body: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "*";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "*";

  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

interface CloverCheckoutResponse {
  id?: string;
  checkoutSessionId?: string;
  href?: string;
  checkoutPageUrl?: string;
  _links?: {
    checkout?: {
      href: string;
    };
  };
}

export async function POST(req: Request) {
  console.log("POST recibido en /api/clover/hco/create");
  console.log("URL completa:", req.url);

  try {
    const origin = req.headers.get("origin") || "NO_ORIGIN";
    const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "*";

    console.log("Origin detectado:", origin);
    console.log("CORS permitido:", allow);

    // Parsear el body del request
    let body;
    try {
      const rawBody = await req.text();
      console.log("Raw body:", rawBody);
      body = JSON.parse(rawBody);
      console.log("Body parseado:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("Error parseando body:", parseError);
      return corsResponse({ error: "Error parsing request body" }, 400, allow);
    }

    // Obtener variables de entorno
    const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
    const CLOVER_MID = process.env.CLOVER_MID;
    const PUBLIC_BASE_URL =
      process.env.PUBLIC_BASE_URL || "https://farm-land-deli-web.vercel.app";

    console.log("Variables de entorno:");
    console.log(
      "CLOVER_MID:",
      CLOVER_MID ? `Definido: ${CLOVER_MID}` : "NO DEFINIDO"
    );
    console.log(
      "CLOVER_API_TOKEN:",
      CLOVER_API_TOKEN ? "DEFINIDO" : "NO DEFINIDO"
    );
    console.log("PUBLIC_BASE_URL:", PUBLIC_BASE_URL);

    // Validar variables de entorno
    if (!CLOVER_API_TOKEN || !CLOVER_MID) {
      console.error("Faltan variables de entorno críticas");
      return corsResponse(
        {
          error: "Configuración del servidor incompleta",
          details: "Faltan CLOVER_API_TOKEN o CLOVER_MID",
        },
        500,
        allow
      );
    }

    // Validar body del request
    if (!body.amount || isNaN(Number(body.amount))) {
      return corsResponse(
        {
          error: "Datos inválidos",
          details: "Se requiere un 'amount' válido",
        },
        400,
        allow
      );
    }

    // Crear payload para Clover
    const payload = {
      customer: {
        // Puedes agregar email o phone opcionalmente aquí
      },
      shoppingCart: {
        lineItems: [
          {
            name: body.referenceId || `Order-${Date.now()}`,
            price: Math.round(Number(body.amount) * 100), // Clover espera centavos
            unitQty: 1,
          },
        ],
      },
      redirectUrls: {
        success: `${PUBLIC_BASE_URL}/checkout/success`,
        failure: `${PUBLIC_BASE_URL}/checkout/failure`,
      },
    };

    const CLOVER_HCO_URL =
      "https://api.clover.com/invoicingcheckoutservice/v1/checkouts";

    console.log("Payload enviado a Clover:", JSON.stringify(payload, null, 2));
    console.log("Endpoint de Clover:", CLOVER_HCO_URL);

    // Hacer request a Clover API
    const response = await fetch(CLOVER_HCO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOVER_API_TOKEN}`,
        "X-Clover-Merchant-Id": CLOVER_MID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("Respuesta de Clover - Status:", response.status);
    console.log(
      "Respuesta de Clover - Headers:",
      Object.fromEntries(response.headers.entries())
    );

    // Procesar respuesta de Clover
    let data: CloverCheckoutResponse | null = null;
    let raw: string | null = null;

    if (response.status !== 204) {
      raw = await response.text();
      console.log("Raw response from Clover:", raw);

      try {
        data = JSON.parse(raw);
        console.log("JSON parseado correctamente");
      } catch (jsonError) {
        console.error("Error parseando JSON de Clover:", jsonError);
        return corsResponse(
          {
            error: "Respuesta inválida del servidor de pagos",
            details: raw,
          },
          500,
          allow
        );
      }
    } else {
      console.log("Respuesta 204 - Sin contenido");
    }

    // Verificar si la respuesta de Clover indica error
    if (!response.ok) {
      console.error("Error de Clover API:", response.status, data);
      return corsResponse(
        {
          error: "Error del servidor de pagos",
          status: response.status,
          details: data || raw,
        },
        response.status,
        allow
      );
    }

    // Extraer URL de checkout de múltiples ubicaciones posibles
    const checkoutUrl =
      data?.checkoutPageUrl || data?.href || data?._links?.checkout?.href;

    console.log("Checkout URL extraída:", checkoutUrl);

    // Validar que se obtuvo una URL válida
    if (!checkoutUrl) {
      console.error("No se pudo extraer URL de checkout de:", data);
      return corsResponse(
        {
          error: "No se pudo obtener URL de pago",
          details: "El servidor de pagos no devolvió una URL válida",
          rawData: process.env.NODE_ENV === "development" ? data : undefined,
        },
        500,
        allow
      );
    }

    // Preparar respuesta exitosa
    const result = {
      success: true,
      message: "Checkout creado exitosamente",
      checkoutPageUrl: checkoutUrl,
      referenceId: body.referenceId,
      amount: body.amount,
      // Incluir datos raw solo en desarrollo para debugging
      ...(process.env.NODE_ENV === "development" && { raw: data }),
    };

    console.log("Enviando resultado exitoso:", result);
    return corsResponse(result, 200, allow);
  } catch (error: unknown) {
    console.error("Error completo en el handler:", error);
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack available"
    );

    const errorMessage =
      error instanceof Error ? error.message : "Error interno del servidor";

    return corsResponse(
      {
        error: "Error interno del servidor",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500,
      "*"
    );
  }
}

// const ALLOWED_ORIGINS = [
//   "http://localhost:8081",
//   "http://localhost:19000",
//   "http://localhost:19006",
//   "exp://192.168.1.5:19000",
//   "exp://localhost:19000",
//   "http://192.168.1.5:8081",
//   "http://192.168.1.5:19000",
//   "http://192.168.1.5:19006",
//   "http://localhost:3000",
//   "http://192.168.1.5:3000",
//   "https://farm-land-deli-web.vercel.app",
// ];

// function corsResponse(body: unknown, status = 200, origin = "*") {
//   return new Response(JSON.stringify(body), {
//     status,
//     headers: {
//       "Content-Type": "application/json",
//       "Access-Control-Allow-Origin": origin,
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type, Authorization",
//     },
//   });
// }

// export async function OPTIONS(req: Request) {
//   const origin = req.headers.get("origin") || "*";
//   const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "*";

//   return new Response(null, {
//     status: 200,
//     headers: {
//       "Access-Control-Allow-Origin": allow,
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type, Authorization",
//     },
//   });
// }

// interface CloverCheckoutResponse {
//   id?: string;
//   checkoutSessionId?: string;
//   href?: string;
//   checkoutPageUrl?: string;
//   _links?: {
//     checkout?: {
//       href: string;
//     };
//   };
// }

// export async function POST(req: Request) {
//   console.log("🚀 POST recibido en /api/clover/hco/create");
//   console.log("🌐 URL completa:", req.url);

//   console.log("🔍 DEBUG - Variables de entorno:");
//   console.log("   - CLOVER_MID:", process.env.CLOVER_MID);
//   console.log(
//     "   - CLOVER_API_TOKEN:",
//     process.env.CLOVER_API_TOKEN ? "PRESENTE" : "AUSENTE"
//   );
//   console.log("   - NODE_ENV:", process.env.NODE_ENV);

//   try {
//     const origin = req.headers.get("origin") || "NO_ORIGIN";
//     const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "*";

//     console.log("📍 Origin detectado:", origin);
//     console.log("✅ CORS permitido:", allow);

//     let body;
//     try {
//       const rawBody = await req.text();
//       console.log("📄 Raw body:", rawBody);
//       body = JSON.parse(rawBody);
//       console.log("📦 Body parseado:", JSON.stringify(body, null, 2));
//     } catch (parseError) {
//       console.error("❌ Error parseando body:", parseError);
//       return corsResponse({ error: "Error parsing request body" }, 400, allow);
//     }

//     const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
//     const CLOVER_MID = process.env.CLOVER_MID;

//     console.log("🔑 Variables de entorno:");
//     console.log(
//       "   - CLOVER_MID:",
//       CLOVER_MID ? `✅ ${CLOVER_MID}` : "❌ NO DEFINIDO"
//     );
//     console.log(
//       "   - CLOVER_API_TOKEN:",
//       CLOVER_API_TOKEN ? "✅ DEFINIDO" : "❌ NO DEFINIDO"
//     );

//     if (!CLOVER_API_TOKEN || !CLOVER_MID) {
//       return corsResponse(
//         { error: "❌ Faltan CLOVER_API_TOKEN o CLOVER_MID en el servidor" },
//         500,
//         allow
//       );
//     }

//     if (!body.amount) {
//       return corsResponse({ error: "❌ Falta amount en el body" }, 400, allow);
//     }

//     const payload = {
//       customer: {}, // puedes agregar email o phone opcionalmente
//       shoppingCart: {
//         lineItems: [
//           {
//             name: body.referenceId || `ORD-${Date.now()}`,
//             price: Math.round(Number(body.amount) * 100),
//             unitQty: 1,
//           },
//         ],
//       },
//       redirectUrls: {
//         // 🔧 CORREGIDO: URLs sin duplicación
//         success: `${process.env.PUBLIC_BASE_URL}/checkout/thank-you`,
//         failure: `${process.env.PUBLIC_BASE_URL}/checkout/failure`,
//       },
//     };

//     const CLOVER_HCO_URL =
//       "https://api.clover.com/invoicingcheckoutservice/v1/checkouts";

//     console.log(
//       "➡️ Payload enviado a Clover:",
//       JSON.stringify(payload, null, 2)
//     );
//     console.log("➡️ Endpoint:", CLOVER_HCO_URL);

//     const response = await fetch(CLOVER_HCO_URL, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${CLOVER_API_TOKEN}`,
//         "X-Clover-Merchant-Id": CLOVER_MID,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     console.log("📡 Respuesta de Clover - Status:", response.status);
//     console.log(
//       "📡 Respuesta de Clover - Headers:",
//       Object.fromEntries(response.headers.entries())
//     );

//     let data: CloverCheckoutResponse | null = null;
//     let raw: string | null = null;

//     if (response.status !== 204) {
//       raw = await response.text();
//       try {
//         data = JSON.parse(raw);
//         console.log("✅ [HCO] JSON parseado");
//       } catch {
//         console.log("⚠️ [HCO] Respuesta no-JSON");
//         return corsResponse({ error: raw }, 500, allow);
//       }
//     } else {
//       console.log("✅ [HCO] Éxito - Respuesta 204 sin contenido.");
//     }

//     if (!response.ok) {
//       console.error("❌ Clover API error:", response.status, data);
//       return corsResponse({ error: data }, response.status, allow);
//     }

//     // 🔧 CORREGIDO: Extraer correctamente la URL de checkout
//     const checkoutUrl =
//       data?.href || data?.checkoutPageUrl || data?._links?.checkout?.href;

//     console.log("🔗 Checkout URL extraída:", checkoutUrl);

//     const result = {
//       message: "Checkout creado exitosamente",
//       status: response.status,
//       checkoutPageUrl: checkoutUrl, // 🔧 AÑADIDO: Incluir la URL en la respuesta
//       raw: process.env.NODE_ENV === "development" ? data : undefined,
//     };

//     console.log("🎉 [HCO] Éxito! Enviando resultado:", result);
//     return corsResponse(result, 200, allow);
//   } catch (error: unknown) {
//     console.error("💥 Error completo:", error);
//     console.error(
//       "💥 Stack trace:",
//       error instanceof Error ? error.stack : "No stack"
//     );
//     const message = error instanceof Error ? error.message : "Error interno";
//     return corsResponse({ error: message }, 500, "*");
//   }
// }
