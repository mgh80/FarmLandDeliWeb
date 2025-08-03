"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FiSearch } from "react-icons/fi";
import Swal from "sweetalert2";

// Tipos
type GroupedOrder = {
  ordernumber: string;
  total: number;
  date: string;
  user_name: string;
  statusid: number;
};

type OrderDetail = {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Ingredient = {
  ingredient_name: string | null;
  product_name: string | null;
};

export default function OrderTable() {
  const [orders, setOrders] = useState<GroupedOrder[]>([]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
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

    // Estado actualizado
    const { data: orderStatus, error: statusError } = await supabase
      .from("Orders")
      .select("statusid")
      .eq("ordernumber", ordernumber)
      .single();

    if (!statusError && orderStatus) {
      setSelectedStatusId(orderStatus.statusid);
    }

    setLoadingDetails(false);
  };

  const fetchIngredients = async (ordernumber: string) => {
    const { data, error } = await supabase.rpc("get_order_ingredients", {
      order_number_input: ordernumber,
    });
    if (error) {
      console.error("Error al cargar ingredientes y productos combo:", error);
      setIngredients([]);
    } else {
      setIngredients(data || []);
    }
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

  const calculateTax = () => calculateTotal() * 0.06;

  const getStatusText = (statusid: number) => {
    return statusid === 2 ? "Delivered" : "Pending";
  };

  const handleMarkAsDelivered = async () => {
    const result = await Swal.fire({
      title: "Confirm delivery?",
      text: "This action will mark the order as delivered",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, deliver",
    });

    if (result.isConfirmed && selectedOrder) {
      const cleanOrderNumber = selectedOrder.trim();

      const { error } = await supabase
        .from("Orders")
        .update({ statusid: 2 })
        .eq("ordernumber", cleanOrderNumber);

      if (error) {
        console.error("Error updating status:", error);
        Swal.fire("Error", "Unable to update status.", "error");
        return;
      }

      await fetchGroupedOrders();
      setSelectedStatusId(2);

      Swal.fire("Delivered!", "The order has been updated.", "success");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Historic Orders</h2>

      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <FiSearch className="absolute left-3 top-3 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search for order or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full shadow-sm text-sm bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100 text-gray-800 font-semibold">
            <tr>
              <th className="px-4 py-2 text-center">#</th>
              <th className="px-4 py-2 text-center">User</th>
              <th className="px-4 py-2 text-center">Order</th>
              <th className="px-4 py-2 text-center">Date</th>
              <th className="px-4 py-2 text-center">Total</th>
              <th className="px-4 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o, i) => (
              <tr
                key={o.ordernumber}
                className={i % 2 === 0 ? "bg-white" : "bg-orange-50"}
              >
                <td className="px-4 py-2 text-center text-gray-800">{i + 1}</td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {o.user_name}
                </td>
                <td
                  className="px-4 py-2 text-center text-orange-600 underline cursor-pointer"
                  onClick={() => {
                    setSelectedOrder(o.ordernumber);
                    fetchDetails(o.ordernumber);
                    fetchIngredients(o.ordernumber);
                  }}
                >
                  {o.ordernumber}
                </td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {new Date(o.date).toLocaleString("es-CO")}
                </td>
                <td className="px-4 py-2 text-center text-gray-800 font-semibold">
                  $
                  {o.total.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      o.statusid === 2
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {getStatusText(o.statusid)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center">
          <div
            className="absolute inset-0"
            onClick={() => {
              setSelectedOrder(null);
              setDetails([]);
              setIngredients([]);
              setSelectedStatusId(null);
            }}
          />
          <div
            className="relative bg-white p-6 rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2">
              <h3 className="text-xl font-semibold text-gray-800">
                Order details:{" "}
                <span className="text-orange-600">{selectedOrder}</span>
              </h3>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setDetails([]);
                  setIngredients([]);
                  setSelectedStatusId(null);
                }}
                className="text-gray-500 hover:text-red-500 text-lg"
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
                    <tr className="text-left text-gray-700 font-semibold">
                      <th className="py-2">Product</th>
                      <th className="py-2 text-center">Quantity</th>
                      <th className="py-2 text-center">Price</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((item, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-orange-50"}
                      >
                        <td className="py-2 text-gray-800">
                          {item.product_name}
                        </td>
                        <td className="py-2 text-center text-gray-800">
                          {item.quantity}
                        </td>
                        <td className="py-2 text-center text-gray-800">
                          $
                          {item.unit_price.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2 text-right text-gray-800">
                          $
                          {item.subtotal.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {ingredients.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-gray-700 font-semibold mb-2">
                      Ingredients and Combo Extras:
                    </h4>
                    <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                      {ingredients.map((ing, idx) => {
                        if (ing.ingredient_name && !ing.product_name) {
                          return <li key={idx}>{ing.ingredient_name}</li>;
                        }
                        if (ing.product_name && !ing.ingredient_name) {
                          return (
                            <li key={idx}>
                              <span className="font-bold text-orange-700">
                                Combo:
                              </span>{" "}
                              {ing.product_name}
                            </li>
                          );
                        }
                        if (ing.product_name && ing.ingredient_name) {
                          return (
                            <li key={idx}>
                              {ing.ingredient_name} (
                              <span className="font-bold text-orange-700">
                                {ing.product_name}
                              </span>
                              )
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                )}

                <div className="mt-6 border-t border-gray-200 pt-4 text-sm text-gray-700">
                  <div className="flex justify-between mb-1">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      $
                      {calculateTotal().toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Tax (6%):</span>
                    <span className="font-semibold">
                      $
                      {calculateTax().toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 mt-2">
                    <span>Total:</span>
                    <span className="text-orange-600">
                      $
                      {(calculateTotal() + calculateTax()).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-right mt-6">
                  <button
                    onClick={
                      selectedStatusId === 1 ? handleMarkAsDelivered : undefined
                    }
                    className={`px-4 py-2 rounded-md ${
                      selectedStatusId === 1
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-300 text-gray-700 cursor-default"
                    }`}
                    disabled={selectedStatusId !== 1}
                  >
                    {selectedStatusId === 1 ? "Deliver" : "Delivered"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
