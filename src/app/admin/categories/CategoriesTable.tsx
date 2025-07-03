"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";
import Swal from "sweetalert2";

// Tipos
export type Category = {
  Id: number;
  Name: string;
};

// --------------------------------------------
// Modal declarado primero para evitar errores
// --------------------------------------------
function CategoryModal(props: {
  category: Category | null;
  onClose: () => void;
  onSave: (c: Category) => void;
}) {
  const { category, onClose, onSave } = props;

  const [form, setForm] = useState<Category>(
    category ?? {
      Id: 0,
      Name: "",
    }
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 space-y-4 text-gray-800">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">
            {category ? "Edit Category" : "New Category"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <input
            placeholder="Name"
            value={form.Name}
            onChange={(e) => setForm({ ...form, Name: e.target.value })}
            className="border rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------
// Componente principal: CategoriesTable
// --------------------------------------------
export default function CategoriesTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("Categories").select("*");
    if (error) console.error("Error:", error);
    else setCategories(data as Category[]);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const saveCategory = async (c: Category) => {
    const confirmResult = await Swal.fire({
      title: editing ? "Update Category?" : "Create New Category?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
    });

    if (!confirmResult.isConfirmed) return;

    if (editing) {
      const { error } = await supabase
        .from("Categories")
        .update(c)
        .eq("Id", c.Id);
      if (error) return Swal.fire("Error", error.message, "error");
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { Id: _, ...dataToInsert } = c;
      const { error } = await supabase.from("Categories").insert(dataToInsert);
      if (error) return Swal.fire("Error", error.message, "error");
    }

    setModalOpen(false);
    setEditing(null);
    fetchCategories();
  };

  const deleteCategory = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure you want to delete this category?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("Categories").delete().eq("Id", id);
    if (error) Swal.fire("Error", error.message, "error");
    else fetchCategories();
  };

  return (
    <div className="p-6">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md shadow"
        >
          <FiPlus />
          New Category
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 shadow-md overflow-x-auto">
        <table className="w-full text-sm text-gray-800 border-collapse">
          <thead className="bg-gray-100 text-gray-800">
            <tr className="border-b border-gray-300">
              <th className="px-4 py-3 border-r">No</th>
              <th className="px-4 py-3 border-r">Name</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.Id} className="border-b border-gray-200">
                <td className="px-4 py-2 text-center border-r">{i + 1}</td>
                <td className="px-4 py-2 text-center border-r">{c.Name}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => {
                      setEditing(c);
                      setModalOpen(true);
                    }}
                    className="text-blue-600 hover:underline mr-2"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => deleteCategory(c.Id)}
                    className="text-red-600 hover:underline"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <CategoryModal
          category={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={saveCategory}
        />
      )}
    </div>
  );
}
