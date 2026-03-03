import { NextResponse } from "next/server";

// 🔴 ESTE ARCHIVO ESTÁ DESHABILITADO COMPLETAMENTE
// No se debe usar. Usa check-payment-status.ts en su lugar.

export async function GET(req: Request) {
  return NextResponse.json(
    {
      error: "Este endpoint está deshabilitado. Usa /api/authorize/check-payment-status en su lugar.",
      status: "disabled",
    },
    { status: 410 } // 410 Gone - Recurso eliminado permanentemente
  );
}

export async function POST(req: Request) {
  return NextResponse.json(
    {
      error: "Este endpoint está deshabilitado. Usa /api/authorize/check-payment-status en su lugar.",
      status: "disabled",
    },
    { status: 410 }
  );
}