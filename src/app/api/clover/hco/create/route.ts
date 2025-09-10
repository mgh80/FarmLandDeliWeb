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
  const allow = ALLOWED_ORIGINS.some(
    (allowed) =>
      allowed === origin ||
      (allowed.includes("*") && origin.includes("vercel.app"))
  )
    ? origin
    : "*";

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
  checkout_url?: string;
  session?: {
    checkout_url?: string;
    href?: string;
  };
  _links?: {
    checkout?: {
      href: string;
    };
    self?: {
      href: string;
    };
  };
}

export async function POST(req: Request) {
  console.log("🚀 POST recibido en /api/clover/hco/create");
  console.log("🌐 URL completa:", req.url);
  console.log("📅 Timestamp:", new Date().toISOString());

  try {
    const origin = req.headers.get("origin") || "NO_ORIGIN";

    // Para debugging, temporalmente permitir cualquier origen
    const allow = "*"; // TEMPORAL - cambiar después de debugging

    /*
    // Código para producción (activar después de debugging):
    const allow = ALLOWED_ORIGINS.some(allowed => 
      allowed === "*" || 
      allowed === origin || 
      (allowed.includes("*") && origin.includes("vercel.app"))
    ) ? origin : "*";
    */

    console.log("📍 Origin detectado:", origin);
    console.log("✅ CORS permitido:", allow);

    // Parsear el body del request
    let body;
    try {
      const rawBody = await req.text();
      console.log("📄 Raw body recibido:", rawBody);
      body = JSON.parse(rawBody);
      console.log(
        "📦 Body parseado exitosamente:",
        JSON.stringify(body, null, 2)
      );
    } catch (parseError) {
      console.error("❌ Error parseando body:", parseError);
      return corsResponse(
        {
          error: "Error parsing request body",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        },
        400,
        allow
      );
    }

    // Obtener y validar variables de entorno
    const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
    const CLOVER_MID = process.env.CLOVER_MID;
    // Asegurar que PUBLIC_BASE_URL no tenga trailing slash o paths adicionales
    let PUBLIC_BASE_URL =
      process.env.PUBLIC_BASE_URL || "https://farm-land-deli-web.vercel.app";
    // Limpiar la URL base si tiene /login u otros paths
    PUBLIC_BASE_URL = PUBLIC_BASE_URL.replace(/\/login.*$/, "").replace(
      /\/$/,
      ""
    );

    console.log("🔑 Validación de variables de entorno:");
    console.log(
      "   CLOVER_MID:",
      CLOVER_MID ? `✅ Presente (${CLOVER_MID})` : "❌ FALTANTE"
    );
    console.log(
      "   CLOVER_API_TOKEN:",
      CLOVER_API_TOKEN
        ? `✅ Presente (${CLOVER_API_TOKEN.substring(0, 10)}...)`
        : "❌ FALTANTE"
    );
    console.log("   PUBLIC_BASE_URL:", PUBLIC_BASE_URL);

    if (!CLOVER_API_TOKEN || !CLOVER_MID) {
      console.error("❌ Variables de entorno críticas faltantes");
      return corsResponse(
        {
          error: "Configuración del servidor incompleta",
          details: {
            CLOVER_MID: !CLOVER_MID ? "Faltante" : "OK",
            CLOVER_API_TOKEN: !CLOVER_API_TOKEN ? "Faltante" : "OK",
          },
        },
        500,
        allow
      );
    }

    // Validar body del request
    if (!body.amount || isNaN(Number(body.amount))) {
      console.error("❌ Amount inválido:", body.amount);
      return corsResponse(
        {
          error: "Datos inválidos",
          details: "Se requiere un 'amount' numérico válido",
          received: body.amount,
        },
        400,
        allow
      );
    }

    const amountInCents = Math.round(Number(body.amount) * 100);
    console.log("💰 Amount convertido a centavos:", amountInCents);

    // Crear payload para Clover con estructura completa
    const payload = {
      customer: {
        // Agregar email/phone si están disponibles
        ...(body.email && { email: body.email }),
        ...(body.phone && { phone: body.phone }),
      },
      shoppingCart: {
        lineItems: [
          {
            name: body.referenceId || `Order-${Date.now()}`,
            price: amountInCents,
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

    console.log("📤 Enviando request a Clover:");
    console.log("   URL:", CLOVER_HCO_URL);
    console.log("   Payload:", JSON.stringify(payload, null, 2));
    console.log("   Headers:", {
      Authorization: `Bearer ${CLOVER_API_TOKEN.substring(0, 10)}...`,
      "X-Clover-Merchant-Id": CLOVER_MID,
      "Content-Type": "application/json",
    });

    // Hacer request a Clover API con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    let cloverResponse;
    try {
      cloverResponse = await fetch(CLOVER_HCO_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOVER_API_TOKEN}`,
          "X-Clover-Merchant-Id": CLOVER_MID,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchError) {
      console.error("❌ Error en fetch a Clover:", fetchError);
      return corsResponse(
        {
          error: "Error conectando con Clover",
          details:
            fetchError instanceof Error ? fetchError.message : "Unknown error",
          type:
            fetchError instanceof Error && fetchError.name === "AbortError"
              ? "timeout"
              : "network",
        },
        500,
        allow
      );
    } finally {
      clearTimeout(timeoutId);
    }

    console.log("📡 Respuesta de Clover recibida:");
    console.log("   Status:", cloverResponse.status);
    console.log("   Status Text:", cloverResponse.statusText);
    console.log(
      "   Headers:",
      Object.fromEntries(cloverResponse.headers.entries())
    );

    // Manejar respuesta de Clover
    let responseData: CloverCheckoutResponse | null = null;
    let rawResponse: string = "";

    // Clover puede devolver 201, 200, o 204 para éxito
    if (cloverResponse.status !== 204) {
      rawResponse = await cloverResponse.text();
      console.log("📄 Raw response de Clover:", rawResponse);

      if (rawResponse) {
        try {
          responseData = JSON.parse(rawResponse);
          console.log(
            "✅ Response parseado como JSON:",
            JSON.stringify(responseData, null, 2)
          );
        } catch (jsonError) {
          console.error("❌ Error parseando JSON de Clover:", jsonError);

          // Si no es JSON pero el status es OK, podría ser una URL directa
          if (cloverResponse.ok && rawResponse.startsWith("http")) {
            console.log("📎 Respuesta parece ser una URL directa");
            responseData = { href: rawResponse };
          } else {
            return corsResponse(
              {
                error: "Respuesta inválida del servidor de pagos",
                details: rawResponse.substring(0, 500),
                status: cloverResponse.status,
              },
              500,
              allow
            );
          }
        }
      }
    } else {
      console.log(
        "ℹ️ Respuesta 204 - Sin contenido (esto es inusual para checkout creation)"
      );

      // Si es 204, verificar si hay una URL en los headers
      const locationHeader = cloverResponse.headers.get("location");
      if (locationHeader) {
        console.log("📍 Location header encontrado:", locationHeader);
        responseData = { href: locationHeader };
      }
    }

    // Verificar si la respuesta indica error
    if (!cloverResponse.ok) {
      console.error("❌ Error de Clover API:", {
        status: cloverResponse.status,
        data: responseData,
        raw: rawResponse.substring(0, 500),
      });

      return corsResponse(
        {
          error: "Error del servidor de pagos",
          status: cloverResponse.status,
          statusText: cloverResponse.statusText,
          details: responseData || rawResponse.substring(0, 500),
          debug: {
            merchantId: CLOVER_MID,
            timestamp: new Date().toISOString(),
          },
        },
        cloverResponse.status,
        allow
      );
    }

    // Buscar la URL del checkout en múltiples ubicaciones posibles
    console.log("🔍 Buscando URL de checkout en la respuesta...");

    let checkoutUrl: string | undefined;

    // Lista de posibles paths donde puede estar la URL
    const possiblePaths = [
      responseData?.href,
      responseData?.checkoutPageUrl,
      responseData?.checkout_url,
      responseData?.session?.checkout_url,
      responseData?.session?.href,
      responseData?._links?.checkout?.href,
      responseData?._links?.self?.href,
    ];

    console.log("🔍 Paths evaluados:", possiblePaths);

    // Encontrar la primera URL válida
    checkoutUrl = possiblePaths.find(
      (url) => url && typeof url === "string" && url.startsWith("http")
    );

    console.log("🔗 Checkout URL encontrada:", checkoutUrl || "NO ENCONTRADA");

    // Si aún no tenemos URL, intentar construirla si tenemos un ID
    if (!checkoutUrl && (responseData?.id || responseData?.checkoutSessionId)) {
      const sessionId = responseData.id || responseData.checkoutSessionId;
      console.log("🔨 Intentando construir URL con session ID:", sessionId);

      // URL pattern de Clover Hosted Checkout
      checkoutUrl = `https://sandbox.dev.clover.com/invoicingcheckoutsession/${sessionId}`;
      console.log("🔨 URL construida:", checkoutUrl);
    }

    // Validar que tenemos una URL
    if (!checkoutUrl) {
      console.error("❌ No se pudo obtener URL de checkout");
      console.error(
        "   Response data completa:",
        JSON.stringify(responseData, null, 2)
      );

      return corsResponse(
        {
          error: "No se pudo obtener URL de pago",
          details: "El servidor de pagos no devolvió una URL válida",
          debug: {
            responseReceived: !!responseData,
            responseKeys: responseData ? Object.keys(responseData) : [],
            rawResponse: rawResponse.substring(0, 200),
            merchantId: CLOVER_MID,
            timestamp: new Date().toISOString(),
          },
        },
        500,
        allow
      );
    }

    // Preparar respuesta exitosa
    const successResult = {
      success: true,
      message: "Checkout creado exitosamente",
      checkoutPageUrl: checkoutUrl,
      referenceId: body.referenceId,
      amount: body.amount,
      sessionId: responseData?.id || responseData?.checkoutSessionId,
      timestamp: new Date().toISOString(),
      // Incluir datos raw solo en desarrollo
      ...(process.env.NODE_ENV === "development" && {
        raw: responseData,
        debug: {
          merchantId: CLOVER_MID,
          environment: checkoutUrl.includes("sandbox")
            ? "sandbox"
            : "production",
        },
      }),
    };

    console.log("✅ Enviando respuesta exitosa:", successResult);
    return corsResponse(successResult, 200, allow);
  } catch (error: unknown) {
    console.error("💥 Error no manejado en el handler:", error);
    console.error(
      "💥 Stack trace:",
      error instanceof Error ? error.stack : "No stack available"
    );

    const errorMessage =
      error instanceof Error ? error.message : "Error interno desconocido";

    return corsResponse(
      {
        error: "Error interno del servidor",
        message: errorMessage,
        timestamp: new Date().toISOString(),
        debug:
          process.env.NODE_ENV === "development"
            ? {
                stack: error instanceof Error ? error.stack : undefined,
              }
            : undefined,
      },
      500,
      "*"
    );
  }
}
//Temporaly

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
