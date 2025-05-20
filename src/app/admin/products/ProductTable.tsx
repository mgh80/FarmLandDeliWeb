"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";

type Product = {
  Id: number;
  Name: string;
  Description: string;
  Price: string;
};

export default function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // 🔄 Cargar productos desde Supabase
  const fetchProducts = async () => {
    const { data, error } = await supabase.from("Products").select("*");
    if (error) console.error("Error al cargar productos:", error);
    else setProducts(data as Product[]);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 💾 Guardar (crear o editar)
  const saveProduct = async (p: Product) => {
    if (editing) {
      const { error } = await supabase
        .from("Products")
        .update(p)
        .eq("Id", p.Id);
      if (error) return console.error("Error al editar:", error);
    } else {
      const { Name, Description, Price } = p;
      const dataToInsert = { Name, Description, Price };

      const { error } = await supabase.from("Products").insert(dataToInsert);

      if (error) return console.error("Error al crear:", error);
    }

    setModalOpen(false);
    setEditing(null);
    fetchProducts();
  };

  // 🗑️ Eliminar
  const deleteProduct = async (id: number) => {
    const { error } = await supabase.from("Products").delete().eq("Id", id);
    if (error) console.error("Error al eliminar:", error);
    else fetchProducts();
  };

  return (
    <div className="p-6">
      {/* barra superior */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        {/* Filtro por año */}
        <select className="border border-gray-300 bg-white text-gray-800 font-medium px-4 py-2 rounded-md shadow-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>All Year</option>
          <option>2024</option>
          <option>2023</option>
        </select>

        {/* Campo de búsqueda */}
        <input
          type="text"
          placeholder="Search"
          className="border border-gray-300 bg-white text-gray-800 font-medium px-4 py-2 rounded-md shadow-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Botón */}
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md shadow"
        >
          <FiPlus />
          New Product
        </button>
      </div>

      {/* tabla */}
      <div className="bg-white rounded-xl border border-gray-300 shadow-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-800">
            <tr>
              <th className="px-4 py-3 text-center">No</th>
              <th className="px-4 py-3 text-center">Product</th>
              <th className="px-4 py-3 text-center">Description</th>
              <th className="px-4 py-3 text-center">Price</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={p.Id} className={i % 2 ? "bg-gray-50" : ""}>
                <td className="px-4 py-2 text-center text-gray-800">{i + 1}</td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {p.Name}
                </td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {p.Description}
                </td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {p.Price}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-800">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setModalOpen(true);
                    }}
                    className="text-blue-600 hover:underline mr-2"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => deleteProduct(p.Id)}
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

      {/* modal */}
      {modalOpen && (
        <ProductModal
          product={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={saveProduct}
        />
      )}
    </div>
  );
}

/* ------------ Modal ------------- */
function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [form, setForm] = useState<Product>(
    product ?? {
      Id: 0,
      Name: "",
      Description: "",
      Price: "",
    }
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 space-y-4 text-gray-800">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">
            {product ? "Edit Product" : "New Product"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="grid grid-cols-2 gap-4">
          {(["Name", "Description", "Price"] as const).map((field) => (
            <input
              key={field}
              placeholder={field}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="border rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-500"
            />
          ))}
        </div>

        {/* Botones */}
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
