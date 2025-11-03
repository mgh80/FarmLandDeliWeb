"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface OrderData {
  status: string;
  orderNumber: string;
  pointsEarned: number;
  total: number;
}

export default function OrderConfirmationPage() {
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

        // Si ya viene con orderNumber desde el redirect (modo local)
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

        // Intentar primero con el endpoint de verificación normal
        let data;
        if (transId) {
          const response = await fetch(
            `/api/authorize/verify-payment?transId=${transId}`
          );
          data = await response.json();
        } else {
          // Si solo tenemos referenceId, usar el endpoint de verificación simple
          const response = await fetch(
            `/api/authorize/check-payment-status?referenceId=${referenceId}`
          );
          data = await response.json();
        }

        console.log("📦 Datos recibidos:", data);

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        if (data.status === "paid" && data.found !== false) {
          setOrderData(data);
          setLoading(false);

          // Iniciar countdown para redirección a la app
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                // Redirigir a la app móvil
                window.location.href = `farmlanddeli://order-confirmation?orderNumber=${data.orderNumber}&total=${data.total}&pointsEarned=${data.pointsEarned}&status=paid`;
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(interval);
        } else if (data.status === "pending" || data.found === false) {
          // El pago está pendiente, mostrar mensaje
          setError(
            "Tu pago está siendo procesado. Por favor espera unos momentos y recarga esta página."
          );
          setLoading(false);
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
        {/* Icono de éxito */}
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

        {/* Detalles de la orden */}
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg
                className="w-5 h-5 text-gray-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm text-gray-600">Número de Orden</span>
            </div>
            <p className="text-xl font-bold text-gray-800">
              {orderData?.orderNumber}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg
                className="w-5 h-5 text-gray-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-600">Total Pagado</span>
            </div>
            <p className="text-xl font-bold text-gray-800">
              $
              {orderData?.total
                ? parseFloat(orderData.total.toString()).toFixed(2)
                : "0.00"}
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
            <div className="flex items-center mb-3">
              <svg
                className="w-5 h-5 text-orange-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                />
              </svg>
              <span className="text-sm text-orange-700">Puntos Ganados</span>
            </div>
            <p className="text-xl font-bold text-orange-600">
              +{orderData?.pointsEarned} puntos
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-700">
              Recibirás un correo de confirmación con los detalles de tu orden.
            </p>
          </div>
        </div>

        {/* Botón para abrir la app */}
        <button
          onClick={handleOpenApp}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg transition-colors mb-3 flex items-center justify-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          Abrir Farm Land Deli App
        </button>

        {/* Countdown */}
        <p className="text-center text-sm text-gray-500">
          Redirigiendo automáticamente en {countdown} segundo
          {countdown !== 1 ? "s" : ""}...
        </p>
      </div>
    </div>
  );
}
