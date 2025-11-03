import { NextResponse } from "next/server";
import xml2js from "xml2js";

export async function POST(req: Request) {
  try {
    const { amount, referenceId } = await req.json();

    const endpoint =
      process.env.AUTHORIZE_ENV === "sandbox"
        ? "https://apitest.authorize.net/xml/v1/request.api"
        : "https://api.authorize.net/xml/v1/request.api";

    // ✅ Se agrega el namespace obligatorio
    const payload = {
      getHostedPaymentPageRequest: {
        $: {
          xmlns: "AnetApi/xml/v1/schema/AnetApiSchema.xsd",
        },
        merchantAuthentication: {
          name: process.env.AUTHORIZE_LOGIN_ID,
          transactionKey: process.env.AUTHORIZE_TRANSACTION_KEY,
        },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: amount.toFixed(2),
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
                url: "https://farm-land-deli-web.vercel.app/api/authorize/verify-payment",
                urlText: "Return to Farm Land Deli",
              }),
            },
          ],
        },
      },
    };

    // ✅ Builder con encabezado XML correcto
    const builder = new xml2js.Builder({
      headless: true,
      renderOpts: { pretty: false },
      xmldec: { version: "1.0", encoding: "utf-8" },
    });

    const xmlRequest = builder.buildObject(payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlRequest,
    });

    const xmlText = await response.text();
    const parsed = await xml2js.parseStringPromise(xmlText, {
      explicitArray: false,
    });

    const token =
      parsed?.getHostedPaymentPageResponse?.token || parsed?.token || null;

    if (!token) {
      console.error("Authorize.Net response XML:", xmlText);
      return NextResponse.json(
        { error: "Token no recibido o inválido", xml: xmlText },
        { status: 400 }
      );
    }

    const checkoutUrl =
      process.env.AUTHORIZE_ENV === "sandbox"
        ? `https://farm-land-deli-web.vercel.app/authorize/checkout?token=${token}`
        : `https://farm-land-deli-web.vercel.app/authorize/checkout?token=${token}`;

    return NextResponse.json({ checkoutUrl, referenceId });
  } catch (error) {
    console.error("💥 Error en create-transaction:", error);
    return NextResponse.json(
      {
        error: "Error creando transacción en Authorize.Net",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
