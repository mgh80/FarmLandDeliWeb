"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    Accept: {
      dispatchData: (data: object, callback: (response: AcceptResponse) => void) => void;
    };
  }
}

interface AcceptResponse {
  opaqueData?: { dataDescriptor: string; dataValue: string };
  messages: { resultCode: string; message: { text: string }[] };
}

function PayForm() {
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount") || "0.00";
  const referenceId = searchParams.get("referenceId") || "";
  const userId = searchParams.get("userId") || "";

  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://jstest.authorize.net/v1/Accept.js";
    script.charset = "utf-8";
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handlePay = async () => {
    if (!cardNumber || !expMonth || !expYear || !cvv || !cardName) {
      setMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    const authData = {
      clientKey: process.env.NEXT_PUBLIC_AUTHORIZE_CLIENT_KEY,
      apiLoginID: process.env.NEXT_PUBLIC_AUTHORIZE_LOGIN_ID,
    };

    const cardData = {
      cardNumber: cardNumber.replace(/\s/g, ""),
      month: expMonth,
      year: expYear.length === 2 ? `20${expYear}` : expYear,
      cardCode: cvv,
      fullName: cardName,
    };

    window.Accept.dispatchData(
      { authData, cardData },
      async (response: AcceptResponse) => {
        if (response.messages.resultCode === "Error") {
          setMessage(response.messages.message[0].text);
          setLoading(false);
          return;
        }

        const opaqueData = response.opaqueData;

        const res = await fetch("/api/authorize/charge-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opaqueData,
            amount,
            referenceId,
            userId,
            cartItems: [],
          }),
        });

        const result = await res.json();

        if (result.success) {
          setSuccess(true);
          setMessage("✅ Payment successful!");
          const win = window as any;
          if (win.ReactNativeWebView) {
            win.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "PAYMENT_SUCCESS",
                orderNumber: result.orderNumber,
                points: result.pointsEarned || 0,
              })
            );
          }
        } else {
          setMessage(`❌ ${result.error || "Payment failed. Please try again."}`);
        }

        setLoading(false);
      }
    );
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#f9fafb",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "sans-serif"
    }}>
      <div style={{
        backgroundColor: "white", borderRadius: 16, padding: 32,
        width: "100%", maxWidth: 400,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ textAlign: "center", color: "#1f2937", marginBottom: 8 }}>
          💳 Payment
        </h2>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 24 }}>
          Total: <strong style={{ color: "#FFA500" }}>${amount}</strong>
        </p>

        {!success ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Name on Card</label>
              <input
                style={inputStyle}
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Card Number</label>
              <input
                style={inputStyle}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setCardNumber(val);
                }}
                maxLength={16}
                inputMode="numeric"
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Month</label>
                <input
                  ref={monthRef}
                  style={inputStyle}
                  placeholder="MM"
                  value={expMonth}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setExpMonth(val);
                    if (val.length === 2) yearRef.current?.focus();
                  }}
                  maxLength={2}
                  inputMode="numeric"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Year</label>
                <input
                  ref={yearRef}
                  style={inputStyle}
                  placeholder="YY"
                  value={expYear}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setExpYear(val);
                    if (val.length === 2) cvvRef.current?.focus();
                  }}
                  maxLength={2}
                  inputMode="numeric"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>CVV</label>
                <input
                  ref={cvvRef}
                  style={inputStyle}
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCvv(val);
                  }}
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>
            </div>

            {message && (
              <p style={{
                padding: 12, borderRadius: 8, marginBottom: 16,
                backgroundColor: message.includes("✅") ? "#f0fdf4" : "#fef2f2",
                color: message.includes("✅") ? "#16a34a" : "#dc2626",
                fontSize: 14, textAlign: "center"
              }}>
                {message}
              </p>
            )}

            <button
              onClick={handlePay}
              disabled={loading}
              style={{
                width: "100%", padding: "14px",
                backgroundColor: loading ? "#d1d5db" : "#FFA500",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 16, fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Processing..." : `Pay $${amount}`}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 48 }}>🎉</p>
            <p style={{ color: "#16a34a", fontWeight: "bold", fontSize: 18 }}>
              Payment successful!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: "600",
  color: "#374151", marginBottom: 6
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
  borderRadius: 8, fontSize: 15, outline: "none",
  boxSizing: "border-box", color: "#111827",
};

export default function PayPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: "flex", height: "100vh",
        alignItems: "center", justifyContent: "center"
      }}>
        <p>Loading...</p>
      </div>
    }>
      <PayForm />
    </Suspense>
  );
}