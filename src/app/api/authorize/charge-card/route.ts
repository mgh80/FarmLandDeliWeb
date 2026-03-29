import { NextResponse } from "next/server";
import xml2js from "xml2js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { opaqueData, amount, referenceId, userId } = await req.json();

    const endpoint = process.env.AUTHORIZE_ENV === "sandbox"
      ? "https://apitest.authorize.net/xml/v1/request.api"
      : "https://api.authorize.net/xml/v1/request.api";

    const payload = {
      createTransactionRequest: {
        $: { xmlns: "AnetApi/xml/v1/schema/AnetApiSchema.xsd" },
        merchantAuthentication: {
          name: process.env.AUTHORIZE_LOGIN_ID,
          transactionKey: process.env.AUTHORIZE_TRANSACTION_KEY,
        },
        refId: referenceId,
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: parseFloat(amount).toFixed(2),
          payment: {
            opaqueData: {
              dataDescriptor: opaqueData.dataDescriptor,
              dataValue: opaqueData.dataValue,
            },
          },
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
    const parsed = await xml2js.parseStringPromise(xmlText, { explicitArray: false });
    const result = parsed?.createTransactionResponse?.transactionResponse;
    const messages = parsed?.createTransactionResponse?.messages;

    if (messages?.resultCode !== "Ok") {
      return NextResponse.json({
        success: false,
        error: result?.errors?.error?.errorText || "Transaction failed"
      });
    }

    const transactionId = result?.transId;
    const pointsEarned = Math.floor(parseFloat(amount));

    // Actualizar orden en Supabase
    await supabase
      .from("Orders")
      .update({
        orderstatus: false,
        statusid: 1,
        paymentreference: transactionId,
      })
      .eq("ordernumber", referenceId);

    return NextResponse.json({
      success: true,
      orderNumber: referenceId,
      transactionId,
      pointsEarned,
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
