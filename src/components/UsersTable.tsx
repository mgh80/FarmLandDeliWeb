"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RedeemModal from "./RedeemModal";
import Swal from "sweetalert2";

// Tipos
type Order = {
  ordernumber: string;
  userid: string;
};

type UserWithOrders = {
  id: string;
  name: string;
  email: string;
  points: number;
  push_token?: string;
  orders: Order[];
};

export default function UsersTable() {
  const [users, setUsers] = useState<UserWithOrders[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithOrders[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithOrders | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    const { data: usersData, error: usersError } = await supabase
      .from("Users")
      .select("*");

    const { data: ordersData, error: ordersError } = await supabase
      .from("Orders")
      .select("ordernumber, userid");

    if (usersError || ordersError) {
      console.error(
        "Error al obtener usuarios u órdenes",
        usersError,
        ordersError
      );
      return;
    }

    const usersWithOrders: UserWithOrders[] = (usersData || []).map((user) => {
      const orders = (ordersData || []).filter(
        (order) => order.userid === user.id
      );
      return { ...user, orders };
    });

    setUsers(usersWithOrders);
    setFilteredUsers(usersWithOrders);
  };

  const handleRedeem = (user: UserWithOrders) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleRedeemConfirm = async (pointsToRedeem: number) => {
    if (!selectedUser) return;
    const newPoints = selectedUser.points - pointsToRedeem;

    const { error } = await supabase
      .from("Users")
      .update({ points: newPoints })
      .eq("id", selectedUser.id);

    if (error) {
      Swal.fire("Error", error.message, "error");
    } else {
      Swal.fire(
        "Puntos redimidos",
        `Redimiste ${pointsToRedeem} puntos`,
        "success"
      );
      fetchUsers();
    }

    setShowModal(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    const filtered = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(value) ||
        u.email?.toLowerCase().includes(value) ||
        u.orders.some((o) => o.ordernumber.toLowerCase().includes(value)) ||
        u.points?.toString().includes(value)
    );
    setFilteredUsers(filtered);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="overflow-x-auto">
      {/* 🔍 Campo de búsqueda */}
      <div className="mb-6 flex justify-center">
        <div className="relative w-full md:w-1/2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search for Name, Email, Order Number or Points"
            className="w-full pl-10 pr-4 py-2 rounded border border-gray-300 shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* 🧾 Tabla de usuarios */}
      <table className="min-w-full bg-white shadow-md rounded-xl text-gray-900">
        <thead className="bg-orange-100 text-black font-semibold">
          <tr>
            <th className="p-3 text-left border-b border-gray-300">Name</th>
            <th className="p-3 text-left border-b border-gray-300">Email</th>
            <th className="p-3 text-left border-b border-gray-300">
              Orders Number
            </th>
            <th className="p-3 text-left border-b border-gray-300">Points</th>
            <th className="p-3 text-left border-b border-gray-300">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <tr
              key={user.id}
              className="border-b border-gray-200 hover:bg-gray-50"
            >
              <td className="p-3 text-gray-900">{user.name}</td>
              <td className="p-3 text-gray-900">{user.email}</td>
              <td className="p-3 text-gray-900">
                <ul className="list-disc list-inside space-y-1">
                  {user.orders.map((o, index) => (
                    <li key={index}>{o.ordernumber}</li>
                  ))}
                </ul>
              </td>
              <td className="p-3 text-gray-900">{user.points}</td>
              <td className="p-3">
                <button
                  onClick={() => handleRedeem(user)}
                  className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                >
                  Redeem
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🎯 Modal */}
      {showModal && selectedUser && (
        <RedeemModal
          isOpen={showModal}
          user={selectedUser}
          onClose={() => setShowModal(false)}
          onConfirm={handleRedeemConfirm}
        />
      )}
    </div>
  );
}
