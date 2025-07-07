"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FiSearch } from "react-icons/fi";

type GroupedOrder = {
  ordernumber: string;
  total: number;
  date: string;
  user_name: string;
};

type OrderDetail = {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export default function OrderTable() {
  const [orders, setOrders] = useState<GroupedOrder[]>([]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchGroupedOrders = async () => {
    const { data, error } = await supabase
      .rpc("get_grouped_orders")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error al cargar órdenes agrupadas:", error);
    } else {
      setOrders(data as GroupedOrder[]);
    }
  };

  const fetchDetails = async (ordernumber: string) => {
    setLoadingDetails(true);
    const { data, error } = await supabase.rpc("get_order_details", {
      order_number_input: ordernumber,
    });
    if (error) {
      console.error("Error al cargar detalles:", error);
      setDetails([]);
    } else {
      setDetails(data);
    }
    setLoadingDetails(false);
  };

  useEffect(() => {
    fetchGroupedOrders();
  }, []);

  const filteredOrders = orders.filter(
    (o) =>
      o.ordernumber.toLowerCase().includes(search.toLowerCase()) ||
      o.user_name.toLowerCase().includes(search.toLowerCase())
  );

  const calculateTotal = () =>
    details.reduce((sum, item) => sum + Number(item.subtotal), 0);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Historic Orders</h2>

      {/* Campo de búsqueda */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <FiSearch className="absolute left-3 top-3 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre u orden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full shadow-sm text-sm bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-xl border border-gray-300 shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-800 font-semibold">
            <tr>
              <th className="px-4 py-2 text-center">#</th>
              <th className="px-4 py-2 text-center">User</th>
              <th className="px-4 py-2 text-center">Order</th>
              <th className="px-4 py-2 text-center">Date</th>
              <th className="px-4 py-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o, i) => (
              <tr
                key={o.ordernumber}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-4 py-2 text-center text-gray-800">{i + 1}</td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {o.user_name}
                </td>
                <td
                  className="px-4 py-2 text-center text-blue-600 underline cursor-pointer"
                  onClick={() => {
                    setSelectedOrder(o.ordernumber);
                    fetchDetails(o.ordernumber);
                  }}
                >
                  {o.ordernumber}
                </td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {new Date(o.date).toLocaleString("es-CO")}
                </td>
                <td className="px-4 py-2 text-center text-gray-800">
                  ${o.total.toLocaleString("es-CO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de detalle */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Order details: {selectedOrder}
              </h3>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setDetails([]);
                }}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <p className="text-center text-gray-600">Loading...</p>
            ) : (
              <>
                <table className="w-full text-sm border-t border-gray-200 mt-2">
                  <thead>
                    <tr className="text-left text-gray-800 font-semibold">
                      <th className="py-1">Product</th>
                      <th className="py-1 text-center">Quantity</th>
                      <th className="py-1 text-center">Price</th>
                      <th className="py-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((item, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="py-1 text-gray-800">
                          {item.product_name}
                        </td>
                        <td className="py-1 text-center text-gray-800">
                          {item.quantity}
                        </td>
                        <td className="py-1 text-center text-gray-800">
                          ${item.unit_price.toLocaleString("es-CO")}
                        </td>
                        <td className="py-1 text-right text-gray-800">
                          ${item.subtotal.toLocaleString("es-CO")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-right font-semibold mt-4 text-gray-800">
                  Total: ${calculateTotal().toLocaleString("es-CO")}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
