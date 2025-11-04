"use client";

import { Suspense } from "react";
import OrderConfirmationPage from "./orderConfirmationPage";

// 🔹 Este componente actúa como envoltorio (wrapper) para permitir el uso de useSearchParams()
// dentro de un Suspense boundary. Evita el error de build en Next.js 16.
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-orange-50">
          <div className="text-center text-gray-700">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mx-auto mb-4"></div>
            <p>Loading order confirmation...</p>
          </div>
        </div>
      }
    >
      <OrderConfirmationPage />
    </Suspense>
  );
}
