"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";
import Swal from "sweetalert2";

// Tipos
type Product = {
  Id: number;
  Name: string;
  Description: string;
  Price: string;
  Image?: string;
  CategoryId?: number;
};

export default function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("Products").select("*");
    if (error) console.error("Error al cargar productos:", error);
    else setProducts(data as Product[]);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    `${p.Name} ${p.Description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const saveProduct = async (p: Product, file: File | null) => {
    const confirm = await Swal.fire({
      title: "¿Save product?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    let imageUrl = p.Image ?? "";

    if (file) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Error to upload the image:", uploadError);
        return;
      }

      const { data } = supabase.storage.from("products").getPublicUrl(fileName);
      imageUrl = data?.publicUrl || "";
    }

    if (editing) {
      const { error } = await supabase
        .from("Products")
        .update({ ...p, Image: imageUrl })
        .eq("Id", p.Id);
      if (error) return console.error("Error to edit:", error);
    } else {
      const { Name, Description, Price, CategoryId } = p;
      const dataToInsert = {
        Name,
        Description,
        Price,
        CategoryId,
        Image: imageUrl,
      };
      const { error } = await supabase.from("Products").insert(dataToInsert);
      if (error) return console.error("Error to create:", error);
    }

    setModalOpen(false);
    setEditing(null);
    fetchProducts();
  };

  const deleteProduct = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Are you sure you want to delete this product?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    const { error } = await supabase.from("Products").delete().eq("Id", id);
    if (error) console.error("Error to delete:", error);
    else fetchProducts();
  };

  return (
    <div className="p-6">
      <div className="flex justify-center mb-6 gap-4">
        <div className="flex items-center border-2 border-orange-500 rounded-md px-3 py-2 w-96 bg-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search product name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ml-3 w-full focus:outline-none text-sm text-gray-800 placeholder-gray-400"
          />
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
        >
          <FiPlus /> New Product
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100 text-gray-800 font-semibold">
            <tr>
              <th className="px-4 py-2 text-center">No</th>
              <th className="px-4 py-2 text-center">Image</th>
              <th className="px-4 py-2 text-center">Name</th>
              <th className="px-4 py-2 text-center">Description</th>
              <th className="px-4 py-2 text-center">Price</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p, i) => (
              <tr
                key={p.Id}
                className={i % 2 === 0 ? "bg-white" : "bg-orange-50"}
              >
                <td className="px-4 py-2 text-center text-gray-900">{i + 1}</td>
                <td className="px-4 py-2 text-center">
                  {p.Image && (
                    <img
                      src={p.Image}
                      alt={p.Name}
                      className="w-16 h-16 object-cover rounded mx-auto"
                    />
                  )}
                </td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {p.Name}
                </td>
                <td className="px-4 py-2 text-center text-gray-800">
                  {p.Description}
                </td>
                <td className="px-4 py-2 text-center text-gray-800 font-semibold">
                  $
                  {parseFloat(p.Price).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setModalOpen(true);
                    }}
                    className="text-blue-600 mr-2 hover:text-blue-800"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => deleteProduct(p.Id)}
                    className="text-red-600 hover:text-red-800"
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

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (p: Product, file: File | null) => void;
}) {
  const [form, setForm] = useState<Product>(
    product ?? {
      Id: 0,
      Name: "",
      Description: "",
      Price: "",
    }
  );
  const [file, setFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<{ Id: number; Name: string }[]>(
    []
  );

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("Categories")
        .select("Id, Name");
      if (!error) setCategories(data);
    };
    fetchCategories();
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8 text-gray-900">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {product ? "Edit Product" : "New Product"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(["Name", "Description", "Price"] as const).map((field) => (
            <input
              key={field}
              placeholder={field}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          ))}

          <select
            value={form.CategoryId || ""}
            onChange={(e) =>
              setForm({ ...form, CategoryId: Number(e.target.value) })
            }
            className="col-span-2 border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.Id} value={c.Id}>
                {c.Name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
          />
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form, file)}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
