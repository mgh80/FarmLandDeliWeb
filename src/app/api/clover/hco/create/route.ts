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

export async function POST(req: Request) {
  console.log("🚀 POST recibido en /api/clover/hco/create");
  console.log("📅 Timestamp:", new Date().toISOString());

  try {
    const origin = req.headers.get("origin") || "NO_ORIGIN";
    const allow = "*";

    console.log("📍 Origin:", origin);

    const body = await req.json();
    console.log("📦 Body recibido:", JSON.stringify(body, null, 2));

    // Variables de entorno
    const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
    const CLOVER_MID = process.env.CLOVER_MID;
    let PUBLIC_BASE_URL =
      process.env.PUBLIC_BASE_URL || "https://farm-land-deli-web.vercel.app";
    PUBLIC_BASE_URL = PUBLIC_BASE_URL.replace(/\/login.*$/, "").replace(
      /\/$/,
      ""
    );

    console.log("🔑 Variables de entorno:");
    console.log("   CLOVER_MID:", CLOVER_MID || "❌ FALTANTE");
    console.log(
      "   CLOVER_API_TOKEN:",
      CLOVER_API_TOKEN
        ? `✅ Presente (${CLOVER_API_TOKEN.substring(0, 8)}...)`
        : "❌ FALTANTE"
    );
    console.log("   PUBLIC_BASE_URL:", PUBLIC_BASE_URL);

    if (!CLOVER_API_TOKEN || !CLOVER_MID) {
      console.error("❌ Variables de entorno críticas faltantes");
      return corsResponse(
        {
          error: "Configuración del servidor incompleta",
          details: "Faltan credenciales de Clover",
        },
        500,
        allow
      );
    }

    // Validar amount
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
    const referenceId = body.referenceId || `ORD-${Date.now()}`;

    console.log("💰 Amount en centavos:", amountInCents);
    console.log("🔖 Reference ID:", referenceId);

    // Payload mejorado para Clover Hosted Checkout
    const payload = {
      customer: {
        email: body.email || "customer@farmlanddeli.com",
        phoneNumber: body.phone || "",
        firstName: body.firstName || "Customer",
        lastName: body.lastName || "",
      },
      shoppingCart: {
        lineItems: [
          {
            name: `Farm Land Deli - Order ${referenceId}`,
            unitQty: 1,
            price: amountInCents,
          },
        ],
      },
      // Metadata adicional
      externalReferenceId: referenceId,
      // URLs de redirección con todos los parámetros necesarios
      redirectUrls: {
        success: `${PUBLIC_BASE_URL}/api/clover/redirect?status=success&referenceId=${referenceId}&amount=${body.amount}`,
        failure: `${PUBLIC_BASE_URL}/api/clover/redirect?status=failure&referenceId=${referenceId}&amount=${body.amount}`,
      },
    };

    // URL de producción de Clover
    const CLOVER_HCO_URL =
      "https://api.clover.com/invoicingcheckoutservice/v1/checkouts";

    console.log("📤 Enviando request a Clover:");
    console.log("   URL:", CLOVER_HCO_URL);
    console.log("   Payload:", JSON.stringify(payload, null, 2));

    // Request a Clover con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
        },
        500,
        allow
      );
    } finally {
      clearTimeout(timeoutId);
    }

    console.log("📥 Status de Clover:", cloverResponse.status);
    console.log("📥 StatusText:", cloverResponse.statusText);

    const rawResponse = await cloverResponse.text();
    console.log("📄 Raw response:", rawResponse);

    // Parsear respuesta
    let responseData;
    try {
      responseData = JSON.parse(rawResponse);
      console.log(
        "✅ Response parseada:",
        JSON.stringify(responseData, null, 2)
      );
    } catch {
      console.error("❌ Error parseando respuesta de Clover");
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

    // Verificar errores de Clover
    if (!cloverResponse.ok) {
      console.error("❌ Error de Clover API:");
      console.error("   Status:", cloverResponse.status);
      console.error("   Response:", responseData);

      // Mensajes de error específicos según el código
      let errorMessage = "Error del servidor de pagos";
      let errorDetails =
        responseData.message || responseData.error || "Error desconocido";

      if (cloverResponse.status === 401) {
        errorMessage = "Credenciales de Clover inválidas";
        errorDetails = "Verifica tu API token y Merchant ID";
      } else if (cloverResponse.status === 403) {
        errorMessage = "Acceso denegado";
        errorDetails =
          "Tu cuenta de Clover no tiene permisos para crear checkouts";
      } else if (cloverResponse.status === 400) {
        errorMessage = "Datos de pago inválidos";
        errorDetails = responseData.message || "Verifica los datos enviados";
      }

      return corsResponse(
        {
          error: errorMessage,
          details: errorDetails,
          status: cloverResponse.status,
          cloverResponse: responseData,
        },
        cloverResponse.status,
        allow
      );
    }

    // Extraer URL del checkout
    const checkoutUrl = responseData?.href;

    if (!checkoutUrl) {
      console.error("❌ No se encontró URL de checkout en la respuesta");
      return corsResponse(
        {
          error: "No se obtuvo URL de pago",
          details: "La respuesta de Clover no incluye la URL de checkout",
          response: responseData,
        },
        500,
        allow
      );
    }

    // Respuesta exitosa
    const result = {
      success: true,
      message: "Checkout creado exitosamente",
      checkoutPageUrl: checkoutUrl,
      referenceId: referenceId,
      amount: body.amount,
      sessionId: responseData.checkoutSessionId,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Enviando respuesta exitosa:", result);
    return corsResponse(result, 200, allow);
  } catch (error: unknown) {
    console.error("💥 ERROR NO MANEJADO:");
    console.error(error);

    return corsResponse(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
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
//   "https://*.vercel.app",
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
//   const allow = ALLOWED_ORIGINS.some(
//     (allowed) =>
//       allowed === origin ||
//       (allowed.includes("*") && origin.includes("vercel.app"))
//   )
//     ? origin
//     : "*";

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
//   checkout_url?: string;
//   session?: {
//     checkout_url?: string;
//     href?: string;
//   };
//   _links?: {
//     checkout?: {
//       href: string;
//     };
//     self?: {
//       href: string;
//     };
//   };
// }

// export async function POST(req: Request) {
//   console.log("🚀 POST recibido en /api/clover/hco/create");
//   console.log("🌐 URL completa:", req.url);
//   console.log("📅 Timestamp:", new Date().toISOString());

//   try {
//     const origin = req.headers.get("origin") || "NO_ORIGIN";

//     // Para debugging, temporalmente permitir cualquier origen
//     const allow = "*"; // TEMPORAL - cambiar después de debugging

//     console.log("📍 Origin detectado:", origin);
//     console.log("✅ CORS permitido:", allow);

//     // Parsear el body del request
//     let body;
//     try {
//       const rawBody = await req.text();
//       console.log("📄 Raw body recibido:", rawBody);
//       body = JSON.parse(rawBody);
//       console.log(
//         "📦 Body parseado exitosamente:",
//         JSON.stringify(body, null, 2)
//       );
//     } catch (parseError) {
//       console.error("❌ Error parseando body:", parseError);
//       return corsResponse(
//         {
//           error: "Error parsing request body",
//           details:
//             parseError instanceof Error ? parseError.message : "Unknown error",
//         },
//         400,
//         allow
//       );
//     }

//     // Obtener y validar variables de entorno
//     const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
//     const CLOVER_MID = process.env.CLOVER_MID;
//     // Asegurar que PUBLIC_BASE_URL no tenga trailing slash o paths adicionales
//     let PUBLIC_BASE_URL =
//       process.env.PUBLIC_BASE_URL || "https://farm-land-deli-web.vercel.app";
//     // Limpiar la URL base si tiene /login u otros paths
//     PUBLIC_BASE_URL = PUBLIC_BASE_URL.replace(/\/login.*$/, "").replace(
//       /\/$/,
//       ""
//     );

//     console.log("🔑 Validación de variables de entorno:");
//     console.log(
//       "   CLOVER_MID:",
//       CLOVER_MID ? `✅ Presente (${CLOVER_MID})` : "❌ FALTANTE"
//     );
//     console.log(
//       "   CLOVER_API_TOKEN:",
//       CLOVER_API_TOKEN
//         ? `✅ Presente (${CLOVER_API_TOKEN.substring(0, 10)}...)`
//         : "❌ FALTANTE"
//     );
//     console.log("   PUBLIC_BASE_URL:", PUBLIC_BASE_URL);

//     if (!CLOVER_API_TOKEN || !CLOVER_MID) {
//       console.error("❌ Variables de entorno críticas faltantes");
//       return corsResponse(
//         {
//           error: "Configuración del servidor incompleta",
//           details: {
//             CLOVER_MID: !CLOVER_MID ? "Faltante" : "OK",
//             CLOVER_API_TOKEN: !CLOVER_API_TOKEN ? "Faltante" : "OK",
//           },
//         },
//         500,
//         allow
//       );
//     }

//     // Validar body del request
//     if (!body.amount || isNaN(Number(body.amount))) {
//       console.error("❌ Amount inválido:", body.amount);
//       return corsResponse(
//         {
//           error: "Datos inválidos",
//           details: "Se requiere un 'amount' numérico válido",
//           received: body.amount,
//         },
//         400,
//         allow
//       );
//     }

//     const amountInCents = Math.round(Number(body.amount) * 100);
//     console.log("💰 Amount convertido a centavos:", amountInCents);

//     // Crear payload para Clover con estructura completa
//     const payload = {
//       customer: {
//         // Agregar email/phone si están disponibles
//         ...(body.email && { email: body.email }),
//         ...(body.phone && { phone: body.phone }),
//       },
//       shoppingCart: {
//         lineItems: [
//           {
//             name: body.referenceId || `Order-${Date.now()}`,
//             price: amountInCents,
//             unitQty: 1,
//           },
//         ],
//       },
//       redirectUrls: {
//         success: `${PUBLIC_BASE_URL}/api/clover/redirect?status=success`,
//         failure: `${PUBLIC_BASE_URL}/api/clover/redirect?status=failure`,
//       },
//     };

//     const CLOVER_HCO_URL =
//       "https://api.clover.com/invoicingcheckoutservice/v1/checkouts";

//     console.log("📤 Enviando request a Clover:");
//     console.log("   URL:", CLOVER_HCO_URL);
//     console.log("   Payload:", JSON.stringify(payload, null, 2));
//     console.log("   Headers:", {
//       Authorization: `Bearer ${CLOVER_API_TOKEN.substring(0, 10)}...`,
//       "X-Clover-Merchant-Id": CLOVER_MID,
//       "Content-Type": "application/json",
//     });

//     // NUEVO: Log pre-request más detallado
//     console.log("🔍 CLOVER REQUEST DETAILS:");
//     console.log("================================");
//     console.log("Method: POST");
//     console.log("URL:", CLOVER_HCO_URL);
//     console.log("MID:", CLOVER_MID);
//     console.log("Token length:", CLOVER_API_TOKEN?.length);
//     console.log("Payload size:", JSON.stringify(payload).length, "bytes");
//     console.log("Environment:", process.env.NODE_ENV);
//     console.log("================================");

//     // Hacer request a Clover API con timeout
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

//     let cloverResponse;
//     try {
//       cloverResponse = await fetch(CLOVER_HCO_URL, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${CLOVER_API_TOKEN}`,
//           "X-Clover-Merchant-Id": CLOVER_MID,
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify(payload),
//         signal: controller.signal,
//       });
//     } catch (fetchError) {
//       console.error("❌ Error en fetch a Clover:", fetchError);
//       console.error("❌ Error name:", (fetchError as Error)?.name);
//       console.error("❌ Error message:", (fetchError as Error)?.message);
//       console.error("❌ Error stack:", (fetchError as Error)?.stack);

//       return corsResponse(
//         {
//           error: "Error conectando con Clover",
//           details:
//             fetchError instanceof Error ? fetchError.message : "Unknown error",
//           type:
//             fetchError instanceof Error && fetchError.name === "AbortError"
//               ? "timeout"
//               : "network",
//         },
//         500,
//         allow
//       );
//     } finally {
//       clearTimeout(timeoutId);
//     }

//     // NUEVO: Logs detallados de la respuesta de Clover
//     console.log("🔍 CLOVER RESPONSE COMPLETA:");
//     console.log("================================");
//     console.log("Status:", cloverResponse.status);
//     console.log("StatusText:", cloverResponse.statusText);
//     console.log("OK:", cloverResponse.ok);
//     console.log("URL:", cloverResponse.url);
//     console.log("Type:", cloverResponse.type);
//     console.log("Redirected:", cloverResponse.redirected);
//     console.log("Headers:");
//     for (const [key, value] of cloverResponse.headers.entries()) {
//       console.log(`  ${key}: ${value}`);
//     }
//     console.log("================================");

//     // Manejar respuesta de Clover
//     let responseData: CloverCheckoutResponse | null = null;
//     let rawResponse: string = "";

//     // Clover puede devolver 201, 200, o 204 para éxito
//     if (cloverResponse.status !== 204) {
//       rawResponse = await cloverResponse.text();
//       console.log("📄 CLOVER RAW RESPONSE:");
//       console.log("Length:", rawResponse.length, "characters");
//       console.log("Content:", rawResponse);
//       console.log("Is empty?", rawResponse.trim() === "");

//       if (rawResponse) {
//         try {
//           responseData = JSON.parse(rawResponse);
//           console.log("✅ CLOVER JSON PARSEADO:");
//           console.log(JSON.stringify(responseData, null, 2));
//         } catch (jsonError) {
//           console.error("❌ Error parseando JSON de Clover:", jsonError);
//           console.error(
//             "❌ Raw response que falló:",
//             rawResponse.substring(0, 200)
//           );

//           // Si no es JSON pero el status es OK, podría ser una URL directa
//           if (cloverResponse.ok && rawResponse.startsWith("http")) {
//             console.log("📎 Respuesta parece ser una URL directa");
//             responseData = { href: rawResponse };
//           } else {
//             return corsResponse(
//               {
//                 error: "Respuesta inválida del servidor de pagos",
//                 details: rawResponse.substring(0, 500),
//                 status: cloverResponse.status,
//                 headers: Object.fromEntries(cloverResponse.headers),
//               },
//               500,
//               allow
//             );
//           }
//         }
//       }
//     } else {
//       console.log(
//         "ℹ️ Respuesta 204 - Sin contenido (esto es inusual para checkout creation)"
//       );

//       // Si es 204, verificar si hay una URL en los headers
//       const locationHeader = cloverResponse.headers.get("location");
//       if (locationHeader) {
//         console.log("📍 Location header encontrado:", locationHeader);
//         responseData = { href: locationHeader };
//       }
//     }

//     // NUEVO: Verificación detallada de errores
//     if (!cloverResponse.ok) {
//       console.error("❌ CLOVER API ERROR DETALLADO:");
//       console.error("================================");
//       console.error("Status:", cloverResponse.status);
//       console.error("StatusText:", cloverResponse.statusText);
//       console.error("Response data:", responseData);
//       console.error("Raw response:", rawResponse.substring(0, 1000));
//       console.error("Request payload:", JSON.stringify(payload, null, 2));
//       console.error("Request headers:", {
//         Authorization: `Bearer ${CLOVER_API_TOKEN?.substring(0, 10)}...`,
//         "X-Clover-Merchant-Id": CLOVER_MID,
//         "Content-Type": "application/json",
//       });
//       console.error("================================");

//       return corsResponse(
//         {
//           error: "Error del servidor de pagos",
//           status: cloverResponse.status,
//           statusText: cloverResponse.statusText,
//           details: responseData || rawResponse.substring(0, 500),
//           debug: {
//             merchantId: CLOVER_MID,
//             timestamp: new Date().toISOString(),
//             requestPayload: payload,
//             responseHeaders: Object.fromEntries(cloverResponse.headers),
//           },
//         },
//         cloverResponse.status,
//         allow
//       );
//     }

//     // Buscar la URL del checkout en múltiples ubicaciones posibles
//     console.log("🔍 Buscando URL de checkout en la respuesta...");

//     let checkoutUrl: string | undefined;

//     // Lista de posibles paths donde puede estar la URL
//     const possiblePaths = [
//       responseData?.href,
//       responseData?.checkoutPageUrl,
//       responseData?.checkout_url,
//       responseData?.session?.checkout_url,
//       responseData?.session?.href,
//       responseData?._links?.checkout?.href,
//       responseData?._links?.self?.href,
//     ];

//     console.log("🔍 Paths evaluados:", possiblePaths);

//     // Encontrar la primera URL válida
//     checkoutUrl = possiblePaths.find(
//       (url) => url && typeof url === "string" && url.startsWith("http")
//     );

//     console.log("🔗 Checkout URL encontrada:", checkoutUrl || "NO ENCONTRADA");

//     // Si aún no tenemos URL, intentar construirla si tenemos un ID
//     if (!checkoutUrl && (responseData?.id || responseData?.checkoutSessionId)) {
//       const sessionId = responseData.id || responseData.checkoutSessionId;
//       console.log("🔨 Intentando construir URL con session ID:", sessionId);

//       // URL pattern de Clover Hosted Checkout
//       checkoutUrl = `https://sandbox.dev.clover.com/invoicingcheckoutsession/${sessionId}`;
//       console.log("🔨 URL construida:", checkoutUrl);
//     }

//     // Validar que tenemos una URL
//     if (!checkoutUrl) {
//       console.error("❌ NO SE PUDO OBTENER URL DE CHECKOUT");
//       console.error(
//         "   Response data completa:",
//         JSON.stringify(responseData, null, 2)
//       );
//       console.error("   Possible paths checked:", possiblePaths);
//       console.error("   Raw response:", rawResponse);

//       return corsResponse(
//         {
//           error: "No se pudo obtener URL de pago",
//           details: "El servidor de pagos no devolvió una URL válida",
//           debug: {
//             responseReceived: !!responseData,
//             responseKeys: responseData ? Object.keys(responseData) : [],
//             rawResponse: rawResponse.substring(0, 200),
//             merchantId: CLOVER_MID,
//             timestamp: new Date().toISOString(),
//             possiblePaths,
//             fullResponse: responseData,
//           },
//         },
//         500,
//         allow
//       );
//     }

//     // Preparar respuesta exitosa
//     const successResult = {
//       success: true,
//       message: "Checkout creado exitosamente",
//       checkoutPageUrl: checkoutUrl,
//       referenceId: body.referenceId,
//       amount: body.amount,
//       sessionId: responseData?.id || responseData?.checkoutSessionId,
//       timestamp: new Date().toISOString(),
//       // Incluir datos raw solo en desarrollo
//       ...(process.env.NODE_ENV === "development" && {
//         raw: responseData,
//         debug: {
//           merchantId: CLOVER_MID,
//           environment: checkoutUrl.includes("sandbox")
//             ? "sandbox"
//             : "production",
//           cloverStatus: cloverResponse.status,
//           responseSize: rawResponse.length,
//         },
//       }),
//     };

//     console.log("✅ ENVIANDO RESPUESTA EXITOSA:");
//     console.log(JSON.stringify(successResult, null, 2));

//     return corsResponse(successResult, 200, allow);
//   } catch (error: unknown) {
//     console.error("💥 ERROR NO MANEJADO EN EL HANDLER:");
//     console.error("💥 Error:", error);
//     console.error(
//       "💥 Stack trace:",
//       error instanceof Error ? error.stack : "No stack available"
//     );
//     console.error(
//       "💥 Error name:",
//       error instanceof Error ? error.name : "Unknown"
//     );
//     console.error(
//       "💥 Error message:",
//       error instanceof Error ? error.message : "Unknown"
//     );

//     const errorMessage =
//       error instanceof Error ? error.message : "Error interno desconocido";

//     return corsResponse(
//       {
//         error: "Error interno del servidor",
//         message: errorMessage,
//         timestamp: new Date().toISOString(),
//         debug:
//           process.env.NODE_ENV === "development"
//             ? {
//                 stack: error instanceof Error ? error.stack : undefined,
//                 name: error instanceof Error ? error.name : undefined,
//               }
//             : undefined,
//       },
//       500,
//       "*"
//     );
//   }
// }
