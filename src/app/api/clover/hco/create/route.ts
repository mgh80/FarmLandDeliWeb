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

export async function POST(req: Request) {
  console.log("🚀 POST recibido en /api/clover/hco/create");
  console.log("🌐 URL completa:", req.url);

  console.log("🔍 DEBUG - Variables de entorno:");
  console.log("   - CLOVER_MID:", process.env.CLOVER_MID);
  console.log(
    "   - CLOVER_API_TOKEN:",
    process.env.CLOVER_API_TOKEN ? "PRESENTE" : "AUSENTE"
  );
  console.log("   - NODE_ENV:", process.env.NODE_ENV);

  try {
    const origin = req.headers.get("origin") || "NO_ORIGIN";
    const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "*";

    console.log("📍 Origin detectado:", origin);
    console.log("✅ CORS permitido:", allow);

    let body;
    try {
      const rawBody = await req.text();
      console.log("📄 Raw body:", rawBody);
      body = JSON.parse(rawBody);
      console.log("📦 Body parseado:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("❌ Error parseando body:", parseError);
      return corsResponse({ error: "Error parsing request body" }, 400, allow);
    }

    const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
    const CLOVER_MID = process.env.CLOVER_MID;

    console.log("🔑 Variables de entorno:");
    console.log(
      "   - CLOVER_MID:",
      CLOVER_MID ? `✅ ${CLOVER_MID}` : "❌ NO DEFINIDO"
    );
    console.log(
      "   - CLOVER_API_TOKEN:",
      CLOVER_API_TOKEN ? "✅ DEFINIDO" : "❌ NO DEFINIDO"
    );

    if (!CLOVER_API_TOKEN || !CLOVER_MID) {
      return corsResponse(
        { error: "❌ Faltan CLOVER_API_TOKEN o CLOVER_MID en el servidor" },
        500,
        allow
      );
    }

    if (!body.amount) {
      return corsResponse({ error: "❌ Falta amount en el body" }, 400, allow);
    }

    const payload = {
      amount: Math.round(Number(body.amount) * 100),
      currency: "usd",
      redirectUrl: `${process.env.PUBLIC_BASE_URL}/login/checkout/thank-you`,
      referenceId: body.referenceId || `ORD-${Date.now()}`,
      merchantId: CLOVER_MID,
    };

    const CLOVER_HCO_URL = "https://api.clover.com/v1/checkouts";

    console.log(
      "➡️ Payload enviado a Clover:",
      JSON.stringify(payload, null, 2)
    );
    console.log("➡️ Endpoint:", CLOVER_HCO_URL);

    const response = await fetch(CLOVER_HCO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOVER_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 Respuesta de Clover - Status:", response.status);
    console.log(
      "📡 Respuesta de Clover - Headers:",
      Object.fromEntries(response.headers.entries())
    );

    let data: unknown = null;
    let raw: string | null = null;

    if (response.status !== 204) {
      raw = await response.text();
      try {
        data = JSON.parse(raw);
        console.log("✅ [HCO] JSON parseado");
      } catch {
        console.log("⚠️ [HCO] Respuesta no-JSON");
        return corsResponse({ error: raw }, 500, allow);
      }
    } else {
      console.log("✅ [HCO] Éxito - Respuesta 204 sin contenido.");
    }

    if (!response.ok) {
      console.error("❌ Clover API error:", response.status, data);
      return corsResponse({ error: data }, response.status, allow);
    }

    const result = {
      message: "Checkout creado exitosamente",
      status: response.status,
      raw: process.env.NODE_ENV === "development" ? data : undefined,
    };

    console.log("🎉 [HCO] Éxito! Enviando resultado:", result);
    return corsResponse(result, 200, allow);
  } catch (error: unknown) {
    console.error("💥 Error completo:", error);
    console.error(
      "💥 Stack trace:",
      error instanceof Error ? error.stack : "No stack"
    );
    const message = error instanceof Error ? error.message : "Error interno";
    return corsResponse({ error: message }, 500, "*");
  }
}
