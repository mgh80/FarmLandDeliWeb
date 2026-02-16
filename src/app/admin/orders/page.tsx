// src/app/admin/orders/page.tsx
import { Suspense } from "react";
import OrderTable from "./OrderTable";

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading orders...</div>}>
      <div className="p-6">
        <OrderTable />
      </div>
    </Suspense>
  );
}