"use client";

import React, { useEffect } from "react";

export default function AuthorizeCheckout() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (token) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://test.authorize.net/payment/payment"; // entorno sandbox oficial
      form.style.display = "none";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "token";
      input.value = token;

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } else {
      console.error("⚠️ No se encontró el token en la URL.");
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        backgroundColor: "#000",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <h2>Redirecting to Authorize.Net...</h2>
      <p>Please wait while we connect you to the secure payment page.</p>
    </div>
  );
}
