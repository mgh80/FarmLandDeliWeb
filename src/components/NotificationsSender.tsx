"use client";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

export default function NotificationSender() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("Users")
        .select("id, name, email, phone");
      if (error) {
        Swal.fire("Error", "Failed to load users", "error");
      } else {
        setUsers(data || []);
      }
    };
    fetchUsers();
  }, []);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (!selectAll) {
      const allWithEmail = users.filter((u) => u.email).map((u) => u.id);
      setSelectedUsers(allWithEmail);
    } else {
      setSelectedUsers([]);
    }
    setSelectAll(!selectAll);
  };

  const sendNotification = async () => {
    if (selectedUsers.length === 0) {
      return Swal.fire("Warning", "Select at least one user", "warning");
    }
    if (!title || !body) {
      return Swal.fire(
        "Warning",
        "Please fill in the title and message",
        "warning"
      );
    }

    const res = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: selectedUsers, title, body }),
    });

    const data = await res.json();

    if (data.success) {
      Swal.fire("Success", "Notification sent via email/SMS", "success");
      setTitle("");
      setBody("");
      setSelectedUsers([]);
      setSelectAll(false);
    } else {
      Swal.fire("Error", data.error || "Something went wrong", "error");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 text-black">
      <h2 className="text-2xl font-bold mb-4">Send Notification (Email/SMS)</h2>

      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Message title"
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Message content"
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <h4 className="text-lg font-semibold mb-2">
        Select Users ({selectedUsers.length} selected)
      </h4>

      <div className="overflow-y-auto max-h-64 rounded-lg border">
        <table className="min-w-full text-sm text-black">
          <thead className="bg-orange-100 text-left text-sm font-medium text-gray-800 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />{" "}
                All
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr
                key={user.id}
                className={index % 2 === 0 ? "bg-white" : "bg-orange-50"}
              >
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    disabled={!user.email}
                  />
                </td>
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  {user.phone ? (
                    <span className="text-green-600 font-semibold">📱</span>
                  ) : (
                    <span className="text-red-500 font-semibold">✖</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 mt-4 rounded"
        onClick={sendNotification}
      >
        Send Notification
      </button>
    </div>
  );
}
