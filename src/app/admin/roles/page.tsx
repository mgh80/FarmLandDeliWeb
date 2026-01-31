"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { EyeIcon, EyeSlashIcon, TrashIcon } from "@heroicons/react/24/solid";

type UserWithPermissions = {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
};

const ALL_PERMISSIONS = ["orders", "products", "roles"];

export default function Page() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "",
    name: "",
  });

  const fetchUsers = async () => {
    const { data: usersData, error } = await supabase
      .from("Users")
      .select("id, email, name, role")
      .not("role", "is", null);

    if (error) {
      console.error("Error fetching users:", error.message);
      return;
    }

    const results: UserWithPermissions[] = [];

    for (const user of usersData) {
      const { data: permissions } = await supabase
        .from("UserPermissions")
        .select("module_name")
        .eq("user_id", user.id);

      const userWithPerms: UserWithPermissions = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: permissions?.map((p) => p.module_name) || [],
      };

      results.push(userWithPerms);
    }

    setUsers(results);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    const { email, password, role, name } = newUser;

    if (!email || !password || !role || !name) {
      Swal.fire("Error", "All fields are required", "error");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      Swal.fire("Error", authError.message, "error");
      return;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      Swal.fire("Error", "User not created", "error");
      return;
    }

    const { error: insertError } = await supabase
      .from("Users")
      .insert([{ id: userId, email, role, name, points: 0 }]);

    if (insertError) {
      Swal.fire("Error", insertError.message, "error");
    } else {
      Swal.fire("Success", "User created successfully", "success");
      setShowModal(false);
      setNewUser({ email: "", password: "", role: "", name: "" });
      fetchUsers();
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    // Confirmación con SweetAlert2
    const result = await Swal.fire({
      title: "Are you sure?",
      html: `
        <p>You are about to delete:</p>
        <p><strong>${userName}</strong></p>
        <p class="text-gray-600">${userEmail}</p>
        <p class="text-red-600 mt-4">This action cannot be undone.</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete user",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // 1. Primero eliminar permisos (igual que como ya funciona)
      const { error: permissionsError } = await supabase
        .from("UserPermissions")
        .delete()
        .eq("user_id", userId);

      if (permissionsError) {
        console.error("Error deleting permissions:", permissionsError);
      }

      // 2. Luego eliminar usuario directamente (igual que como creas usuarios)
      const { error: deleteError } = await supabase
        .from("Users")
        .delete()
        .eq("id", userId);

      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: deleteError.message || "Failed to delete user",
          confirmButtonColor: "#dc2626",
        });
        return;
      }

      // 3. Mostrar éxito
      Swal.fire({
        icon: "success",
        title: "User Deleted",
        text: `${userName} has been successfully deleted.`,
        confirmButtonColor: "#3085d6",
      });

      // 4. Refrescar lista
      fetchUsers();

    } catch (error: any) {
      console.error("Error deleting user:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "An error occurred while deleting the user.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  const togglePermission = async (
    userId: string,
    permission: string,
    hasPermission: boolean
  ) => {
    if (hasPermission) {
      const { error } = await supabase
        .from("UserPermissions")
        .delete()
        .eq("user_id", userId)
        .eq("module_name", permission);

      if (error) {
        Swal.fire("Error", error.message, "error");
        return;
      } else {
        Swal.fire({
          icon: "info",
          title: "Permission Removed",
          text: `The permission "${permission}" has been removed.`,
          confirmButtonColor: "#3085d6",
        });
      }
    } else {
      const { error } = await supabase
        .from("UserPermissions")
        .insert([{ user_id: userId, module_name: permission }]);

      if (error) {
        Swal.fire("Error", error.message, "error");
        return;
      } else {
        Swal.fire({
          icon: "success",
          title: "Permission Granted",
          text: `The permission "${permission}" has been assigned.`,
          confirmButtonColor: "#3085d6",
        });
      }
    }

    fetchUsers();
  };

  return (
    <div className="p-6 bg-[#f8f9fa] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#212529]">Role Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-lg shadow"
        >
          Create User
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg shadow border bg-white">
        <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-orange-100 text-orange-700">
            <tr>
              <th className="px-6 py-3 text-sm font-semibold uppercase tracking-wider border-b border-orange-300 text-left">
                Name
              </th>
              <th className="px-6 py-3 text-sm font-semibold uppercase tracking-wider border-b border-orange-300 text-left">
                Email
              </th>
              <th className="px-6 py-3 text-sm font-semibold uppercase tracking-wider border-b border-orange-300 text-left">
                Role
              </th>
              <th className="px-6 py-3 text-sm font-semibold uppercase tracking-wider border-b border-orange-300 text-left">
                Permissions
              </th>
              <th className="px-6 py-3 text-sm font-semibold uppercase tracking-wider border-b border-orange-300 text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="bg-white hover:bg-orange-50 transition"
              >
                <td className="px-6 py-4 border-b border-gray-200 text-gray-800 font-medium">
                  {user.name}
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-gray-800 font-medium">
                  {user.email}
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-gray-800 font-medium capitalize">
                  {user.role}
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-gray-800 font-medium">
                  <div className="flex flex-wrap gap-2">
                    {ALL_PERMISSIONS.map((perm) => {
                      const hasPermission = user.permissions.includes(perm);
                      return (
                        <label
                          key={perm}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={hasPermission}
                            onChange={() =>
                              togglePermission(user.id, perm, hasPermission)
                            }
                            className="form-checkbox text-orange-500"
                          />
                          <span className="text-sm">{perm}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 border-b border-gray-200 text-center">
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name, user.email)}
                    className="inline-flex items-center justify-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                    title="Delete user"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-md w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Create New User
            </h3>

            <label className="block mb-1 text-sm text-gray-700">Name</label>
            <input
              type="text"
              placeholder="Enter full name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full mb-4 border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />

            <label className="block mb-1 text-sm text-gray-700">Email</label>
            <input
              type="email"
              placeholder="Enter email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
              className="w-full mb-4 border border-gray-300 rounded-lg p-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />

            <label className="block mb-1 text-sm text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                className="w-full mb-4 border border-gray-300 rounded-lg p-2 pr-10 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div
                className="absolute inset-y-0 right-3 top-2 cursor-pointer text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </div>
            </div>

            <label className="block mb-1 text-sm text-gray-700">Role</label>
            <select
              className="w-full mb-4 border border-gray-300 rounded-lg p-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="" disabled>
                Select Role
              </option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-400 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}