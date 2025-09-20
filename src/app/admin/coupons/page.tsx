"use client";

import React, { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  TicketIcon,
  UserIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";

type Coupon = {
  id: number;
  coupon_code: string;
  order_number: string;
  user_id: string;
  reward_title: string;
  reward_description: string;
  points_used: number;
  status: "active" | "used" | "expired";
  expiration_date: string;
  updated_at?: string;
};

type User = {
  user_id: string;
  name?: string;
  email?: string;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [redeeming, setRedeeming] = useState<number | null>(null);

  const fetchCoupons = async () => {
    try {
      console.log("Starting to fetch coupons...");

      // Check current session first
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log("Session check:", {
        userId: session?.user?.id,
        email: session?.user?.email,
        role: session?.user?.role,
        sessionError,
      });

      // Try different approaches to debug the problem
      console.log("Attempting basic count first...");

      // First check if we can do a count
      const { count, error: countError } = await supabase
        .from("Coupons")
        .select("*", { count: "exact", head: true });

      console.log("Count result:", { count, countError });

      // Try query without RLS restrictions (for debug)
      console.log("Trying query without RLS restrictions...");
      const { data: debugData, error: debugError } = await supabase.rpc(
        "get_all_coupons_debug"
      );
      console.log("Debug RPC result:", { debugData, debugError });

      // Now try the full normal query
      const { data, error } = await supabase
        .from("Coupons")
        .select("*")
        .order("id", { ascending: false });

      console.log("Full query result:", { data, error });

      if (error) {
        console.error("Supabase error:", error);

        // If there's an error, try a simpler query
        console.log("Trying simplified query...");
        const simpleResult = await supabase
          .from("Coupons")
          .select("id, coupon_code, reward_title, status");

        console.log("Simple query result:", simpleResult);

        if (simpleResult.data) {
          setCoupons(
            simpleResult.data.map((item) => ({
              ...item,
              order_number: "",
              user_id: "",
              reward_description: "",
              points_used: 0,
              expiration_date: "",
            }))
          );
          return;
        }

        throw error;
      }

      console.log("Fetched coupons data:", data);
      console.log("Number of coupons:", data?.length || 0);

      if (data && data.length > 0) {
        console.log("Sample coupon structure:", data[0]);
      } else {
        console.log("No coupons found - likely RLS policy issue");

        // Try loading test data to verify UI works
        console.log("Loading test data to verify UI works...");
        setCoupons([
          {
            id: 1,
            coupon_code: "RWD-438085-076",
            order_number: "ORD-20250920-6125",
            user_id: "test-user-id",
            reward_title: "Espresso Shot / Syrup",
            reward_description: "Extra shot or a dash of syrup",
            points_used: 25,
            status: "active" as const,
            expiration_date: "2025-10-20",
          },
          {
            id: 2,
            coupon_code: "RWD-762495-997",
            order_number: "ORD-20250920-6323",
            user_id: "test-user-id-2",
            reward_title: "Espresso Shot / Syrup",
            reward_description: "Extra shot or a dash of syrup",
            points_used: 25,
            status: "active" as const,
            expiration_date: "2025-10-20",
          },
        ]);
        return;
      }

      setCoupons(data || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log("Starting to fetch users...");

      const { data, error } = await supabase
        .from("Users")
        .select("id, name, email");

      console.log("Users response:", { data, error });

      if (error) {
        console.error("Users error:", error);
        setUsers([]);
      } else {
        // Map Users data to match expected structure
        const mappedUsers = (data || []).map((user) => ({
          user_id: user.id, // Use 'id' as 'user_id'
          name: user.name || "",
          email: user.email || "",
        }));
        console.log("Mapped users:", mappedUsers);
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  const redeemCoupon = async (couponId: number) => {
    setRedeeming(couponId);
    try {
      console.log("🎫 Attempting to redeem coupon ID:", couponId);

      // Check current user session
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("👤 Current user:", user?.id);

      // Try updating only the status field
      console.log("💾 Updating coupon status to 'used'...");
      const { data, error } = await supabase
        .from("Coupons")
        .update({
          status: "used",
        })
        .eq("id", couponId)
        .select();

      console.log("📊 Update result:", { data, error });

      if (error) {
        console.error("❌ Supabase update error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      // Update local state
      console.log("✅ Update successful, updating local state...");
      setCoupons((prev) =>
        prev.map((coupon) =>
          coupon.id === couponId
            ? {
                ...coupon,
                status: "used" as const,
                updated_at: new Date().toISOString(),
              }
            : coupon
        )
      );

      alert("Coupon redeemed successfully!");
      console.log("🎉 Coupon redemption completed successfully");
    } catch (error) {
      console.error("Error redeeming coupon:", error);

      // More specific error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Unknown error occurred";

      alert(`Error redeeming coupon: ${errorMessage}`);
      console.error("Error details:", error);
    } finally {
      setRedeeming(null);
      console.log("🏁 Redemption process finished");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Active
          </span>
        );
      case "used":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircleIcon className="w-4 h-4 mr-1" />
            Used
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-4 h-4 mr-1" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.user_id === userId);
    return user?.name || user?.email || userId;
  };

  useEffect(() => {
    console.log("Component mounted, starting data fetch...");
    fetchCoupons();
    fetchUsers();
  }, []);

  useEffect(() => {
    console.log("Coupons state updated:", coupons);
    console.log("Coupons length:", coupons.length);
    if (coupons.length > 0) {
      console.log("First coupon:", coupons[0]);
    }
  }, [coupons]);

  // Coupon filtering
  const filteredCoupons = coupons.filter((coupon) => {
    const searchValue = searchTerm.toLowerCase();
    const matchesSearch =
      (coupon.coupon_code &&
        coupon.coupon_code.toLowerCase().includes(searchValue)) ||
      (coupon.reward_title &&
        coupon.reward_title.toLowerCase().includes(searchValue)) ||
      (coupon.order_number &&
        coupon.order_number.toLowerCase().includes(searchValue));

    const matchesUser = selectedUser === "" || coupon.user_id === selectedUser;
    const matchesStatus = statusFilter === "" || coupon.status === statusFilter;

    return matchesSearch && matchesUser && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center">
          <TicketIcon className="w-8 h-8 mr-3 text-yellow-500" />
          Coupon Management
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code, title or order..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter by User */}
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="" className="text-gray-900">
              All users
            </option>
            {users.map((user) => (
              <option
                key={user.user_id}
                value={user.user_id}
                className="text-gray-900"
              >
                {user.name || user.email || user.user_id}
              </option>
            ))}
          </select>

          {/* Filter by Status */}
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="" className="text-gray-900">
              All statuses
            </option>
            <option value="active" className="text-gray-900">
              Active
            </option>
            <option value="used" className="text-gray-900">
              Used
            </option>
            <option value="expired" className="text-gray-900">
              Expired
            </option>
          </select>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                Active Coupons
              </p>
              <p className="text-2xl font-bold text-green-600">
                {coupons.filter((c) => c.status === "active").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-500">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">Used Coupons</p>
              <p className="text-2xl font-bold text-gray-800">
                {coupons.filter((c) => c.status === "used").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                Expired Coupons
              </p>
              <p className="text-2xl font-bold text-red-600">
                {coupons.filter((c) => c.status === "expired").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coupons List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Coupons ({filteredCoupons.length})
          </h3>
        </div>

        {filteredCoupons.length === 0 ? (
          <div className="text-center py-12">
            <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No coupons found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No coupons found with the applied filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reward
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {coupon.coupon_code || "N/A"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {coupon.order_number || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-500 mr-2" />
                        <div className="text-sm text-gray-900">
                          {getUserName(coupon.user_id)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {coupon.reward_title || "N/A"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {coupon.reward_description || "No description"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-indigo-600">
                        {coupon.points_used} pts
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(coupon.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarDaysIcon className="h-4 w-4 mr-1" />
                        {coupon.expiration_date
                          ? new Date(
                              coupon.expiration_date
                            ).toLocaleDateString()
                          : "No date"}
                      </div>
                      {coupon.updated_at && coupon.status === "used" && (
                        <div className="text-xs text-gray-500 mt-1">
                          Used:{" "}
                          {new Date(coupon.updated_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {coupon.status === "active" ? (
                        <button
                          onClick={() => redeemCoupon(coupon.id)}
                          disabled={redeeming === coupon.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {redeeming === coupon.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Redeeming...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Redeem
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-sm font-medium">
                          {coupon.status === "used"
                            ? "Redeemed"
                            : "Not available"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
