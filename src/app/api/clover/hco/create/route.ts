const ALLOWED_ORIGINS = [
  "http://localhost:8081", // Expo dev
  "http://192.168.1.7:8081", // LAN Expo en dispositivo físico
  "http://localhost:3000", // Next.js local
  "https://farm-land-deli-web.vercel.app", // Prod en Vercel
];

// helper para respuestas con CORS
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

// Tipo esperado de Clover cuando la respuesta es válida
interface CloverCheckoutResponse {
  id: string;
  orderRef?: { id: string };
  checkoutPageUrl?: string;
  _links?: { checkout?: { href: string } };
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
  try {
    const origin = req.headers.get("origin") || "*";
    const allow = ALLOWED_ORIGINS.includes(origin) ? origin : "*";

    const body = await req.json();

    const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
    const CLOVER_MID = process.env.CLOVER_MID;

    // 🔎 Debug ENV
    console.log("➡️ CLOVER_MID:", CLOVER_MID);
    console.log("➡️ CLOVER_API_TOKEN definido:", !!CLOVER_API_TOKEN);

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

    // ✅ Payload correcto según Clover Hosted Checkout
    const payload = {
      amount: Math.round(Number(body.amount) * 100), // en centavos
      currency: (body.currency || "USD").toLowerCase(), // Clover espera "usd"
      redirectUrl: "https://sandbox.dev.clover.com/checkout/success",
      referenceId: body.referenceId || `TEST-${Date.now()}`,
      merchantId: CLOVER_MID, // 👈 obligatorio en /v1/checkouts
    };

    // 🔎 Debug Payload
    console.log("➡️ Payload enviado a Clover:", payload);

    const response = await fetch(
      "https://sandbox.dev.clover.com/v1/checkouts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOVER_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    // 👇 Intentamos parsear como JSON, pero si no es válido lo guardamos como texto
    const raw = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      console.error("❌ Clover API error:", response.status, data);
      return corsResponse({ error: data }, response.status, allow);
    }

    // ⬇️ Forzamos el tipo solo en el caso de éxito
    const checkoutData = data as CloverCheckoutResponse;

    return corsResponse(
      {
        checkoutId: checkoutData.id,
        orderId: checkoutData.orderRef?.id,
        checkoutPageUrl:
          checkoutData.checkoutPageUrl || checkoutData._links?.checkout?.href,
      },
      200,
      allow
    );
  } catch (error: unknown) {
    console.error("❌ Error Clover:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    return corsResponse({ error: message }, 500, "*");
  }
}
