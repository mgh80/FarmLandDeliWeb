import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const origin = req.headers.get("origin") || "";
  const allowedOrigins = [
    "http://localhost:8081", // Expo dev
    "https://farm-land-deli-web.vercel.app", // producción
  ];

  // Si está permitido el origen, lo seteamos
  if (allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }

  // Headers CORS básicos
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: res.headers,
    });
  }

  return res;
}

// Aplica solo a las rutas de API
export const config = {
  matcher: ["/api/:path*"],
};
