// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { EyeSlashIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [darkMode] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales inválidas");
      return;
    }
    debugger;
    console.log(data);
    if (data?.user?.email === "delifarmland@gmail.com") {
      router.push("/admin");
    } else {
      setError("Acceso denegado: no eres administrador");
    }
  };

  useEffect(() => {
    document.body.className = darkMode
      ? "bg-gray-900 text-white"
      : "bg-gray-50 text-gray-900";
  }, [darkMode]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 transition-colors">
      <img
        src="/logo.png"
        alt="Logo"
        className="w-24 mb-4 rounded-full shadow-lg"
      />
      <h1 className="text-2xl font-semibold mb-6">
        Admin Portal Farmland Deli
      </h1>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 space-y-5">
        <input
          type="email"
          placeholder="Email"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-100 dark:bg-gray-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-100 dark:bg-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300"
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeSlashIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-[#FF6347] hover:bg-[#e9553d] text-white font-semibold py-3 rounded-xl shadow-md transition"
        >
          Login
        </button>

        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
      </div>
    </div>
  );
}
