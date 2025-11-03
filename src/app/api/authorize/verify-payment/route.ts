import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const referenceId = searchParams.get("orderId");

  if (!referenceId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  try {
    const payload = {
      getTransactionListRequest: {
        merchantAuthentication: {
          name: process.env.AUTHORIZE_LOGIN_ID,
          transactionKey: process.env.AUTHORIZE_TRANSACTION_KEY,
        },
        refId: referenceId,
      },
    };

    const response = await fetch(
      process.env.AUTHORIZE_ENV === "sandbox"
        ? "https://apitest.authorize.net/xml/v1/request.api"
        : "https://api.authorize.net/xml/v1/request.api",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    const transactions =
      data?.transactions?.transaction || data?.transaction || [];

    if (transactions.length === 0)
      return NextResponse.json({ status: "pending" });

    const lastTransaction = transactions[0];
    const status = lastTransaction?.transactionStatus || "unknown";

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Error verificando pago:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
