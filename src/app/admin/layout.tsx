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
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  const [stats, setStats] = useState([
    { name: "Total Products", value: 0, color: "text-blue-600" },
    { name: "Total Categories", value: 0, color: "text-green-600" },
    { name: "Total Orders", value: 0, color: "text-orange-600" },
    { name: "Total Users", value: 0, color: "text-purple-600" },
  ]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: productCount },
          { count: categoryCount },
          { count: orderCount },
          { count: userCount },
        ] = await Promise.all([
          supabase.from("Products").select("*", { count: "exact", head: true }),
          supabase
            .from("Categories")
            .select("*", { count: "exact", head: true }),
          supabase.from("Orders").select("*", { count: "exact", head: true }),
          supabase.from("Users").select("*", { count: "exact", head: true }),
        ]);

        setStats([
          {
            name: "Total Products",
            value: productCount || 0,
            color: "text-blue-600",
          },
          {
            name: "Total Categories",
            value: categoryCount || 0,
            color: "text-green-600",
          },
          {
            name: "Total Orders",
            value: orderCount || 0,
            color: "text-orange-600",
          },
          {
            name: "Total Users",
            value: userCount || 0,
            color: "text-purple-600",
          },
        ]);
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-yellow-400 text-white flex flex-col justify-between">
        <div>
          <div className="flex flex-col items-center justify-center py-6">
            <Image
              src="/logo.png"
              alt="Logo"
              width={100}
              height={100}
              className="rounded-full"
            />
          </div>
          <div className="border-b border-yellow-600 mx-4 mb-2" />
          <nav className="p-4 space-y-2">
            <SidebarItem
              icon={TagIcon}
              label="Products"
              href="/admin/products"
            />
            <SidebarItem
              icon={Squares2X2Icon}
              label="Categories"
              href="/admin/categories"
            />
            <SidebarItem
              icon={UserIcon}
              label="Customers"
              href="/admin/users"
            />
            <SidebarItem
              icon={ClipboardDocumentListIcon}
              label="Orders"
              href="/admin/orders"
            />
            <SidebarItem
              icon={MegaphoneIcon}
              label="Promotions"
              href="/admin/promotions"
            />
            <SidebarItem icon={KeyIcon} label="Roles" href="/admin/roles" />
            <SidebarItem
              icon={BellIcon}
              label="Notifications"
              href="/admin/notifications"
            />
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-center text-2xl font-bold px-4 py-4 font-sans text-gray-800">
          Administration Panel
        </h1>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-900"
            >
              <h2 className="text-lg font-semibold text-gray-800">
                {stat.name}
              </h2>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {children}
      </main>
    </div>
  );
}
