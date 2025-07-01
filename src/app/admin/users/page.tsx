"use client";
import React from "react";
import UsersTable from "@/components/UsersTable";

export default function UsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        Usuarios Registrados
      </h1>
      <UsersTable />
    </div>
  );
}
