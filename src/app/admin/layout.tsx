"use client";

import React, { ReactNode, useEffect, useState } from "react";
import {
  Squares2X2Icon,
  UserIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  TagIcon,
  MegaphoneIcon,
  KeyIcon,
  BellIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";

type SidebarItemProps = {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
};

const SidebarItem = ({ icon: Icon, label, href }: SidebarItemProps) => (
  <a
    href={href}
    className="flex items-center px-4 py-3 text-white hover:bg-blue-800 transition rounded-md"
  >
    <Icon className="h-6 w-6 mr-3" />
    <span className="text-sm font-medium">{label}</span>
  </a>
);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [stats, setStats] = useState([
    { name: "Total Products", value: 0, color: "text-blue-600" },
    { name: "Total Categories", value: 0, color: "text-green-600" },
    { name: "Total Orders", value: 0, color: "text-orange-600" },
    { name: "Total Users", value: 0, color: "text-purple-600" },
    { name: "Total Coupons", value: 0, color: "text-indigo-600" },
  ]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  useEffect(() => {
    const checkAuthAndFetchStats = async () => {
      try {
        // 1. Verificación de Seguridad
        const { data: { session } } = await supabase.auth.getSession();

        if (!session || session.user.email !== "quickcateringserviceinc@gmail.com") {
          router.replace("/"); // Redirige al login si no es admin
          return;
        }

        // Si llegó aquí, está autorizado
        setAuthorized(true);

        // 2. Carga de Estadísticas (Solo si está autorizado)
        const [
          { count: productCount },
          { count: categoryCount },
          { count: orderCount },
          { count: userCount },
          { count: couponCount },
        ] = await Promise.all([
          supabase.from("Products").select("*", { count: "exact", head: true }),
          supabase.from("Categories").select("*", { count: "exact", head: true }),
          supabase.from("Orders").select("*", { count: "exact", head: true }),
          supabase.from("Users").select("*", { count: "exact", head: true }),
          supabase.from("Coupons").select("*", { count: "exact", head: true }),
        ]);

        setStats([
          { name: "Total Products", value: productCount || 0, color: "text-blue-600" },
          { name: "Total Categories", value: categoryCount || 0, color: "text-green-600" },
          { name: "Total Orders", value: orderCount || 0, color: "text-orange-600" },
          { name: "Total Users", value: userCount || 0, color: "text-purple-600" },
          { name: "Total Coupons", value: couponCount || 0, color: "text-indigo-600" },
        ]);
      } catch (error) {
        console.error("Error en el proceso de carga:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchStats();
  }, [router]);

  // Mientras verifica la sesión, mostramos un spinner para que no se vea el dashboard
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-900"></div>
      </div>
    );
  }

  // Si no está autorizado (aunque loading haya terminado), no renderizamos nada (el router ya estará redirigiendo)
  if (!authorized) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-yellow-400 text-white flex flex-col justify-between shadow-lg">
        <div>
          <div className="flex flex-col items-center justify-center py-6">
            <Image
              src="/logo.png"
              alt="Logo"
              width={100}
              height={100}
              className="rounded-full bg-white p-1"
            />
          </div>
          <div className="border-b border-yellow-600 mx-4 mb-2" />
          <nav className="p-4 space-y-2">
            <SidebarItem icon={TagIcon} label="Products" href="/admin/products" />
            <SidebarItem icon={Squares2X2Icon} label="Categories" href="/admin/categories" />
            <SidebarItem icon={UserIcon} label="Customers" href="/admin/users" />
            <SidebarItem icon={ClipboardDocumentListIcon} label="Orders" href="/admin/orders" />
            <SidebarItem icon={TicketIcon} label="Coupons" href="/admin/coupons" />
            <SidebarItem icon={MegaphoneIcon} label="Promotions" href="/admin/promotions" />
            <SidebarItem icon={KeyIcon} label="Roles" href="/admin/roles" />
            <SidebarItem icon={BellIcon} label="Notifications" href="/admin/notifications" />
          </nav>
        </div>

        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition shadow-md"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-sans text-gray-800">
            Administration Panel
          </h1>
          <NotificationBell />
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-blue-900 hover:shadow-md transition-shadow"
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {stat.name}
              </h2>
              <p className={`text-3xl font-bold mt-2 ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          {children}
        </div>
      </main>
    </div>
  );
}