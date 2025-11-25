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

  const [timeLeft, setTimeLeft] = useState(900);

  useEffect(() => {
    if (orderData) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [orderData]);

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const sec = (secs % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  // -------------------------------
  // 2️⃣ VERIFICAR PAGO + POLLING
  // -------------------------------
  useEffect(() => {
    const verifyAndCreateOrder = async () => {
      try {
        const referenceId = searchParams.get("referenceId");

        if (!referenceId) {
          setError("Transaction information not found");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/authorize/check-payment-status?referenceId=${referenceId}`
        );

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        // ⭐ PAGO EXITOSO
        if (data.status === "paid" && data.found !== false) {
          setOrderData(data);
          setLoading(false);
          return;
        }

        // 🔄 POLLING
        const pollInterval = setInterval(async () => {
          const pollResponse = await fetch(
            `/api/authorize/check-payment-status?referenceId=${referenceId}`
          );
          const pollData = await pollResponse.json();

          if (pollData.status === "paid") {
            clearInterval(pollInterval);
            setOrderData(pollData);
            setLoading(false);
          }
        }, 2000);

        // ⏳ DETENER DESPUÉS DE 15 MIN
        setTimeout(() => {
          clearInterval(pollInterval);
          if (!orderData) {
            setError("Verification time expired. Please check your email.");
            setLoading(false);
          }
        }, 900000); // 900,000 ms = 15 min
      } catch (err) {
        console.error(err);
        setError("Error verifying payment");
        setLoading(false);
      }
    };

    verifyAndCreateOrder();
  }, []);

  // -------------------------------
  //  RENDER: LOADING
  // -------------------------------
  if (loading && !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Verifying payment...
          </h2>
          <p className="text-gray-600 mb-4">Please wait a moment</p>

          {/* 🟧 Temporizador visible mientras carga */}
          <p className="text-xl font-bold text-orange-500 mt-4">
            ⏳ {formatTime(timeLeft)}
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------
  // ERROR
  // -------------------------------
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>

          <button
            onClick={() => window.close()}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------
  // SUCCESS
  // -------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* ICON */}
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
            Payment Successful!
          </h1>

          <p className="text-gray-600">
            Your order has been successfully confirmed.
          </p>
        </div>

        {/* ORDER NUMBER */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">Order Number</p>
          <p className="text-xl font-bold text-gray-800">
            {orderData?.orderNumber}
          </p>
        </div>

        {/* TOTAL PAID */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">Total Paid</p>
          <p className="text-xl font-bold text-gray-800">
            ${orderData?.total?.toFixed(2)}
          </p>
        </div>

        {/* POINTS */}
        <div className="bg-orange-50 rounded-lg p-4 mb-6 border-2 border-orange-200">
          <p className="text-sm text-orange-700 mb-1">Points Earned</p>
          <p className="text-xl font-bold text-orange-600">
            +{orderData?.pointsEarned} points
          </p>
        </div>

        {/* CLOSE BUTTON */}
        <button
          onClick={() => window.close()}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
        >
          Close
        </button>
      </div>
    </div>
  );
}
