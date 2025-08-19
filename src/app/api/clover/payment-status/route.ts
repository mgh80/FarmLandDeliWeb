export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    const CLOVER_API_TOKEN = process.env.CLOVER_API_TOKEN;
    const CLOVER_MID = process.env.CLOVER_MID;

    if (!CLOVER_API_TOKEN || !CLOVER_MID) {
      return new Response(JSON.stringify({ error: "❌ Faltan variables ENV" }), { status: 500 });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "❌ Falta orderId" }), { status: 400 });
    }

    const response = await fetch(
      `https://sandbox.dev.clover.com/v3/merchants/${CLOVER_MID}/orders/${orderId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CLOVER_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Clover API error (status):", response.status, data);
      return new Response(JSON.stringify({ error: data }), { status: response.status });
    }

    // Clover devuelve estado en `state` ("open", "paid", "cancelled")
    return new Response(JSON.stringify({ status: data.state }), { status: 200 });
  } catch (e) {
    console.error("❌ Error en payment-status:", e);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
}
