"use client";

import React, { ReactNode } from "react";
import {
  HomeIcon,
  TagIcon,
  CreditCardIcon,
  ClipboardIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const stats = [
  { name: "Total Products", value: 12, color: "text-blue-600" },
  { name: "Total Categories", value: 5, color: "text-green-600" },
  { name: "Total Orders", value: 8, color: "text-orange-600" },
];

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-center h-20 border-b border-blue-800">
            <Image
              src="/logo.png"
              alt="Logo"
              width={48}
              height={48}
              className="rounded-full"
            />
          </div>
          <nav className="p-4 space-y-2">
            <SidebarItem
              icon={HomeIcon}
              label="Products"
              href="/admin/products"
            />
            <SidebarItem
              icon={TagIcon}
              label="Categories"
              href="/admin/categories"
            />
            <SidebarItem
              icon={CreditCardIcon}
              label="Payment Methods"
              href="/admin/payments"
            />
            <SidebarItem
              icon={ClipboardIcon}
              label="Orders"
              href="/admin/orders"
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
        {/* Dashboard Cards */}
        <h1 className="text-center text-2xl font-bold px-4 py-4 font-sans text-gray-800">
          Administration Panel
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
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
