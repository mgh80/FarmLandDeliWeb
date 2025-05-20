"use client";

import { useState } from "react";
import { FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";

type Product = {
  id: number;
  Name: string;
  Description: string;
  Price: string;
};

export default function ProductTable() {
  /* ---------- estado ---------- */
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      Name: "Lorem Ipsum 1",
      Description: "Lorem Ipsum 2",
      Price: "Lorem Ipsum 3",
    },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  /* ---------- CRUD helpers ---------- */
  const saveProduct = (p: Product) => {
    if (editing) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    } else {
      setProducts((prev) => [...prev, { ...p, id: Date.now() }]);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const deleteProduct = (id: number) =>
    setProducts((prev) => prev.filter((p) => p.id !== id));

  /* ---------- UI ---------- */
  return (
    <div className="p-6">
      {/* barra superior */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <select className="border rounded px-3 py-2 text-sm">
          <option>All Year</option>
          <option>2024</option>
          <option>2023</option>
        </select>

        <input
          placeholder="Search"
          className="border rounded px-3 py-2 text-sm max-w-xs flex-grow"
        />

        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          <FiPlus />
          New Product
        </button>
      </div>

      {/* tabla */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-800">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p, i) => (
              <tr key={p.id} className={i % 2 ? "bg-gray-50" : ""}>
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
                    onClick={() => deleteProduct(p.id)}
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

      {/* -------- Modal New / Edit ---------- */}
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

/* ------------- Modal component ------------- */
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
      id: 0,
      Name: "",
      Description: "",
      Price: "",
    }
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 space-y-4 text-gray-800">
        {/* header */}
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

        {/* form grid */}
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

        {/* botones */}
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
