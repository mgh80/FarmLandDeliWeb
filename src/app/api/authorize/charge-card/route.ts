import { NextResponse } from "next/server";
import xml2js from "xml2js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { opaqueData, amount, referenceId, userId, cartItems = [] } = await req.json();

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

    // ✅ Si el pago falló no guardamos nada
    if (messages?.resultCode !== "Ok" || result?.responseCode !== "1") {
      return NextResponse.json({
        success: false,
        error: result?.errors?.error?.errorText || "Transaction declined"
      });
    }

    const transactionId = result?.transId;

    // ✅ AJUSTE 3: 1 USD = 1 punto
    const pointsEarned = Math.floor(parseFloat(amount));

    console.log(`✅ Pago exitoso: ${transactionId} — Puntos ganados: ${pointsEarned}`);

    // ✅ AJUSTE 2: guardar orden SOLO si el pago fue exitoso
    const { data: order, error: orderError } = await supabase
      .from("Orders")
      .insert({
        ordernumber: referenceId,
        userid: userId,
        price: parseFloat(parseFloat(amount).toFixed(2)),
        date: new Date().toISOString(),
        statusid: 1,
        paymentreference: transactionId,
        orderstatus: false,
        cancelstatus: false,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("⚠️ Error al crear orden:", orderError);
    } else {
      console.log(`✅ Orden creada: ${referenceId}`);
    }

    // Guardar productos asociados
    if (order && Array.isArray(cartItems) && cartItems.length > 0) {
      const validItems = cartItems
        .filter((item: any) => item.id && item.quantity > 0)
        .map((item: any) => ({
          order_id: order.id,
          product_id: item.id,
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

    // ✅ AJUSTE 3: sumar puntos al usuario
    const { data: userData } = await supabase
      .from("Users")
      .select("points")
      .eq("id", userId)
      .single();

    const currentPoints = userData?.points || 0;
    const newPoints = currentPoints + pointsEarned;

    await supabase
      .from("Users")
      .update({ points: newPoints })
      .eq("id", userId);

    console.log(`✅ Puntos actualizados: ${currentPoints} + ${pointsEarned} = ${newPoints}`);

    return NextResponse.json({
      success: true,
      orderNumber: referenceId,
      transactionId,
      pointsEarned,
    });

  } catch (error) {
    console.error("💥 Error en charge-card:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    });
  }
}