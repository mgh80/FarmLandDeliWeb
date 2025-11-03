"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface OrderData {
  status: string;
  orderNumber: string;
  pointsEarned: number;
  total: number;
}

function OrderConfirmationInner() {
  const searchParams = useSearchParams();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyAndCreateOrder = async () => {
      try {
        const transId = searchParams.get("transId");
        const referenceId = searchParams.get("referenceId");
        const orderNumber = searchParams.get("orderNumber");
        const total = searchParams.get("total");
        const pointsEarned = searchParams.get("pointsEarned");
        const status = searchParams.get("status");

        if (!transId && !referenceId && !orderNumber) {
          setError("No se encontró información de la transacción");
          setLoading(false);
          return;
        }

        // ✅ Modo local: datos ya llegan listos
        if (orderNumber && total && pointsEarned && status === "paid") {
          setOrderData({
            status: "paid",
            orderNumber,
            pointsEarned: parseInt(pointsEarned, 10),
            total: parseFloat(total),
          });
          setLoading(false);
          return;
        }

        console.log("🔍 Verificando pago...", { transId, referenceId });

        // ✅ Verificación remota
        const endpoint = transId
          ? `/api/authorize/verify-payment?transId=${transId}`
          : `/api/authorize/verify-payment?referenceId=${referenceId}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        console.log("📦 Datos recibidos:", data);

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        if (data.status === "paid") {
          setOrderData(data);
          setLoading(false);

          // Redirección a la app móvil
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                window.location.href = `farmlanddeli://order-confirmation?orderNumber=${data.orderNumber}&total=${data.total}&pointsEarned=${data.pointsEarned}&status=paid`;
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(interval);
        } else {
          setError("El pago aún no ha sido confirmado");
          setLoading(false);
        }
      } catch (err) {
        console.error("💥 Error verificando pago:", err);
        setError("Error al verificar el pago");
        setLoading(false);
      }
    };

    verifyAndCreateOrder();
  }, [searchParams]);

  const handleOpenApp = () => {
    if (orderData) {
      window.location.href = `farmlanddeli://order-confirmation?orderNumber=${orderData.orderNumber}&total=${orderData.total}&pointsEarned=${orderData.pointsEarned}&status=paid`;
    }
  };

  // =================== UI ===================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Verificando pago...
          </h2>
          <p className="text-gray-600">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            ¡Pago Exitoso!
          </h1>
          <p className="text-gray-600">
            Tu orden ha sido confirmada correctamente
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-sm text-gray-600 block mb-1">
              Número de Orden
            </span>
            <p className="text-xl font-bold text-gray-800">
              {orderData?.orderNumber}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-sm text-gray-600 block mb-1">
              Total Pagado
            </span>
            <p className="text-xl font-bold text-gray-800">
              ${orderData?.total.toFixed(2)}
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
            <span className="text-sm text-orange-700 block mb-1">
              Puntos Ganados
            </span>
            <p className="text-xl font-bold text-orange-600">
              +{orderData?.pointsEarned} puntos
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenApp}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg transition-colors mb-3"
        >
          Abrir Farm Land Deli App
        </button>

        <p className="text-center text-sm text-gray-500">
          Redirigiendo automáticamente en {countdown} segundo
          {countdown !== 1 ? "s" : ""}...
        </p>
      </div>
    </div>
  );
}

// ✅ Este componente se renderiza dentro de Suspense
export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<p className="text-center mt-10">Cargando...</p>}>
      <OrderConfirmationInner />
    </Suspense>
  );
}
