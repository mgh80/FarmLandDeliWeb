"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

const AVAILABLE_MODULES = [
  "Products",
  "Categories",
  "Orders",
  "Promotions",
  "Roles",
];

export default function RolesPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsersWithPermissions();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      console.log("🚀 USERS LOADED:", users);
    }
  }, [users]);

  async function fetchPermissions(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("UserPermissions")
      .select("module_name")
      .eq("user_id", userId);

    if (error || !data) {
      console.error("❌ Error fetching permissions", error);
      return [];
    }

    return data
      .map((perm) => perm.module_name)
      .filter((mod): mod is string => typeof mod === "string" && mod.length > 0)
      .map((mod) => mod.trim().toLowerCase()); // ✅ fuerza minúsculas
  }

  async function fetchUsersWithPermissions() {
    const { data: usersData, error } = await supabase
      .from("Users")
      .select("id, email, role");

    if (error || !usersData) {
      console.error("❌ Error loading users", error);
      return;
    }

    const enrichedUsers = await Promise.all(
      usersData.map(async (user) => {
        const permissions = await fetchPermissions(user.id);
        return {
          ...user,
          role: user.role ?? "",
          permissions,
        };
      })
    );

    setUsers(enrichedUsers as User[]);
  }

  async function updateRole(id: string, newRole: string) {
    const { isConfirmed } = await Swal.fire({
      title: "Are you sure?",
      text: "The user's role will be updated.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, update",
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return;

    const { error } = await supabase
      .from("Users")
      .update({ role: newRole })
      .eq("id", id);

    if (error) {
      Swal.fire("Error", "Could not update the role.", "error");
    } else {
      Swal.fire("Updated", "The role was successfully changed.", "success");
      fetchUsersWithPermissions();
    }
  }

  async function updatePermissions(userId: string, modules: string[]) {
    const { isConfirmed } = await Swal.fire({
      title: "Are you sure?",
      text: "User permissions will be updated.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, save",
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return;

    const { error: deleteError } = await supabase
      .from("UserPermissions")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      Swal.fire("Error", "Previous permissions could not be removed.", "error");
      return;
    }

    const inserts = modules.map((mod) => ({
      user_id: userId,
      module_name: mod.toLowerCase(), // ✅ insert consistent lowercase
    }));

    const { error: insertError } = await supabase
      .from("UserPermissions")
      .insert(inserts);

    if (insertError) {
      console.error("❌ Error inserting permissions", insertError);
      Swal.fire("Error", "New permissions could not be saved.", "error");
    } else {
      Swal.fire("Saved", "Permits were updated correctly.", "success");
      fetchUsersWithPermissions();
    }
  }

  const togglePermission = (userId: string, module: string) => {
    const normalizedModule = module.toLowerCase(); // ✅ minúsculas
    const updatedUsers = users.map((user) => {
      if (user.id !== userId) return user;

      const hasPermission = user.permissions.includes(normalizedModule);
      const updatedPermissions = hasPermission
        ? user.permissions.filter((perm) => perm !== normalizedModule)
        : [...user.permissions, normalizedModule];

      return { ...user, permissions: updatedPermissions };
    });

    setUsers(updatedUsers);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        Roles Management
      </h1>

      <table className="min-w-full border bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="text-left px-4 py-2">Email</th>
            <th className="text-left px-4 py-2">Rol</th>
            <th className="text-left px-4 py-2">Permissions</th>
            <th className="text-left px-4 py-2">Update</th>
          </tr>
        </thead>
        <tbody className="text-gray-900">
          {users.map((u) => (
            <tr key={u.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2">
                <select
                  value={u.role}
                  onChange={(e) => updateRole(u.id, e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Select the role</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-col gap-1">
                  {AVAILABLE_MODULES.map((mod) => {
                    const normalizedMod = mod.toLowerCase();
                    const isChecked = u.permissions.includes(normalizedMod);
                    return (
                      <label key={mod} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(u.id, mod)}
                        />
                        <span>{mod}</span>
                      </label>
                    );
                  })}
                </div>
              </td>
              <td className="px-4 py-2">
                <button
                  className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                  onClick={() => updatePermissions(u.id, u.permissions)}
                >
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
