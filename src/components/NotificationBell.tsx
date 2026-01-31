"use client";

import React, { useEffect, useState } from "react";
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
  const router = useRouter();

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
          setNewOrders((prev) => [newOrder, ...prev.slice(0, 9)]); // Mantener últimas 10
          
          // Mostrar notificación del navegador
          if (Notification.permission === "granted") {
            new Notification("New order received", {
              body: `Orden #${newOrder.ordernumber}`,
              icon: "/logo.png",
            });
          }

          // REPRODUCIR SONIDO DE NOTIFICACIÓN
          const audio = new Audio('https://www.myinstants.com/media/sounds/discord-notification.mp3');
          audio.volume = 1.0; // Volumen al 50%
          audio.play().catch(err => console.log('Error al reproducir sonido:', err));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Solicitar permiso para notificaciones del navegador
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const handleNotificationClick = (order: Order) => {
    setShowDropdown(false);
    router.push("/admin/orders");
  };

  const clearNotifications = () => {
    setNewOrders([]);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Justo ahora";
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} hrs`;
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
          {/* Overlay para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-20 border border-gray-200">
            {/* Header */}
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

            {/* Notification List */}
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

            {/* Footer */}
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