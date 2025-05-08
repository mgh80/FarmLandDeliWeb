"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  /* ------------ lógica de login sin cambios ------------ */
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales inválidas");
      return;
    }

    if (data?.user?.email === "delifarmland@gmail.com") {
      router.push("/admin");
    } else {
      setError("Acceso denegado: no eres administrador");
    }
  };

  /* quitar modo‑oscuro global */
  useEffect(() => {
    document.body.classList.remove("bg-gray-900", "text-white");
  }, []);

  /* --------------------- UI --------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex w-full max-w-5xl h-[520px] rounded-2xl shadow-xl overflow-hidden">
        {/* ---------- LADO IZQUIERDO: FORM ---------- */}
        <div className="w-full lg:w-1/2 bg-white flex flex-col items-center justify-center px-10 space-y-6">
          <Image src="/logo.png" alt="Logo" width={64} height={64} />

          <h3 className="text-sm text-gray-500 tracking-wide">Welcome To</h3>
          <h1 className="text-3xl font-bold text-blue-700">Admin Portal</h1>

          {/* E‑mail */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-sm px-4 py-3 border rounded-full bg-gray-100
             text-gray-800 placeholder-gray-600
             focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Password + toggle */}
          <div className="relative w-full max-w-sm">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full max-w-sm px-4 py-3 border rounded-full bg-gray-100
             text-gray-800 placeholder-gray-600
             focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Botón */}
          <button
            onClick={handleLogin}
            className="w-full max-w-sm py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-full transition"
          >
            Login
          </button>

          {error && (
            <p className="text-red-500 text-sm text-center w-full max-w-sm">
              {error}
            </p>
          )}
          
        </div>

        {/* ---------- LADO DERECHO: GRADIENTE + TEXTO ---------- */}
        <div className="hidden lg:flex w-1/2 relative">
          {/* degradado azul */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700" />
          {/* superposición ligera para contraste */}
          <div className="absolute inset-0 bg-black opacity-30" />
          {/* contenido */}
          <div className="relative z-10 m-auto text-center px-10">
            <h1 className="text-4xl font-bold text-white mb-4">FarmlandDeli Web</h1>
            <p className="text-sm text-gray-200 max-w-md">
              Portal de administración de data de Farmland Deli App.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
