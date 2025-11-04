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
        const referenceId = searchParams.get("referenceId");

        if (!referenceId) {
          setError("Transaction information not found");
          setLoading(false);
          return;
        }

        console.log("🔍 Checking payment...", { referenceId });

        const response = await fetch(
          `/api/authorize/check-payment-status?referenceId=${referenceId}`,
          { method: "GET" }
        );

        const data = await response.json();
        console.log("📦 Data received:", data);

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        if (data.status === "paid" && data.found !== false) {
          setOrderData(data);
          setLoading(false);
          startCountdown(data);
        } else if (data.status === "pending" || data.found === false) {
          setError("Processing your payment, please wait...");

          const pollInterval = setInterval(async () => {
            try {
              const pollResponse = await fetch(
                `/api/authorize/check-payment-status?referenceId=${referenceId}`,
                { method: "GET" }
              );
              const pollData = await pollResponse.json();

              if (pollData.status === "paid" && pollData.found) {
                clearInterval(pollInterval);
                setOrderData(pollData);
                setError(null);
                setLoading(false);
                startCountdown(pollData);
              }
            } catch (pollError) {
              console.error("Polling error:", pollError);
            }
          }, 2000);

          setTimeout(() => {
            clearInterval(pollInterval);
            if (!orderData) {
              setError(
                "Verification time expired. Please check your email for confirmation."
              );
              setLoading(false);
            }
          }, 30000);
        } else {
          setError("Payment has not been confirmed yet");
          setLoading(false);
        }
      } catch (err) {
        console.error("💥 Error verifying payment:", err);
        setError("Error verifying payment");
        setLoading(false);
      }
    };

    const startCountdown = (data: OrderData) => {
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
            Verifying payment...
          </h2>
          <p className="text-gray-600">Please wait a moment</p>
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
            Back to Home
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
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your order has been successfully confirmed
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Order Number</p>
            <p className="text-xl font-bold text-gray-800">
              {orderData?.orderNumber}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Paid</p>
            <p className="text-xl font-bold text-gray-800">
              $
              {orderData?.total
                ? parseFloat(orderData.total.toString()).toFixed(2)
                : "0.00"}
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
            <p className="text-sm text-orange-700 mb-1">Points Earned</p>
            <p className="text-xl font-bold text-orange-600">
              +{orderData?.pointsEarned} points
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700 text-center">
            You will receive a confirmation email with your order details.
          </p>
        </div>

        <button
          onClick={handleOpenApp}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg transition-colors mb-3 flex items-center justify-center"
        >
          Open Farm Land Deli App
        </button>

        <p className="text-center text-sm text-gray-500">
          Redirecting automatically in {countdown} second
          {countdown !== 1 ? "s" : ""}...
        </p>
      </div>
    </div>
  );
}
