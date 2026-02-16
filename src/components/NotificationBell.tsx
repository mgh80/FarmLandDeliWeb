"use client";

import React, { useEffect, useState, useRef } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  ordernumber: string;
  created_at: string;
};

export default function NotificationBell() {
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Crear y preparar el audio al montar el componente
  useEffect(() => {
    // Crear elemento de audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.8;
    audioRef.current.preload = 'auto';
    
    // Pre-cargar el audio
    audioRef.current.load();
    
    // Intentar reproducir en silencio para "desbloquear" el audio
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {
          // Silenciosamente fallar
        });
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Suscribirse a nuevas órdenes en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel("new-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Orders",
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setNewOrders((prev) => [newOrder, ...prev.slice(0, 9)]);
          
          // Mostrar notificación del navegador
          if (Notification.permission === "granted") {
            new Notification("New order received", {
              body: `Order #${newOrder.ordernumber}`,
              icon: "/logo.png",
            });
          }

          // REPRODUCIR SONIDO MODERNO
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Función para reproducir sonido de notificación
  const playNotificationSound = () => {
    if (audioRef.current) {
      // Resetear al inicio por si estaba reproduciéndose
      audioRef.current.currentTime = 0;
      
      // Intentar reproducir
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Audio play prevented:', error);
          // Intentar con un nuevo audio como fallback
          try {
            const fallbackAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            fallbackAudio.volume = 0.8;
            fallbackAudio.play().catch(() => {
              console.log('Fallback audio also failed');
            });
          } catch (e) {
            console.log('All audio attempts failed');
          }
        });
      }
    }
  };

  // Solicitar permiso para notificaciones del navegador
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const handleNotificationClick = (order: Order) => {
    // Eliminar esta notificación específica de la lista
    setNewOrders((prev) => prev.filter(o => o.id !== order.id));
    setShowDropdown(false);
    // Forzar navegación y recarga
    window.location.href = `/admin/orders?orderNumber=${order.ordernumber}`;
  };

  const clearNotifications = () => {
    setNewOrders([]);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hrs ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Bell Icon - ROJA Y GRANDE */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-red-600 hover:bg-red-50 rounded-full transition"
      >
        <BellIcon className="h-8 w-8" />
        {newOrders.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {newOrders.length > 9 ? "9+" : newOrders.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-20 border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-800">New Orders</h3>
              {newOrders.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {newOrders.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  There are no new orders
                </div>
              ) : (
                newOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleNotificationClick(order)}
                    className="p-4 border-b hover:bg-gray-50 cursor-pointer transition bg-blue-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 font-medium">
                          New order received
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Order #{order.ordernumber}
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 ml-2" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatTime(order.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {newOrders.length > 0 && (
              <div className="p-3 text-center border-t">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push("/admin/orders");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all orders
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}