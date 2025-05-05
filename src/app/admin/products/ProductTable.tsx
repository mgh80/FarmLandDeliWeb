"use client";

import { useState } from "react";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
};

export default function ProductTable() {
  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: "Hamburger", description: "Classic beef burger", price: 10 },
    {
      id: 2,
      name: "Veggie Wrap",
      description: "Fresh vegetables wrap",
      price: 8,
    },
  ]);
  const [form, setForm] = useState<Product>({
    id: 0,
    name: "",
    description: "",
    price: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "price" ? parseFloat(e.target.value) : e.target.value,
    });
  };

  const handleSubmit = () => {
    if (editingId) {
      setProducts(
        products.map((p) =>
          p.id === editingId ? { ...form, id: editingId } : p
        )
      );
      setEditingId(null);
    } else {
      const newId = products.length
        ? Math.max(...products.map((p) => p.id)) + 1
        : 1;
      setProducts([...products, { ...form, id: newId }]);
    }
    setForm({ id: 0, name: "", description: "", price: 0 });
  };

  const handleEdit = (product: Product) => {
    setForm(product);
    setEditingId(product.id);
  };

  const handleDelete = (id: number) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  return (
    <div className="p-8 bg-white rounded-xl shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Products</h2>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Product Name"
          className="border rounded-lg p-4 text-gray-700"
        />
        <input
          type="text"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Product Description"
          className="border rounded-lg p-4 text-gray-700"
        />
        <input
          type="number"
          name="price"
          value={form.price}
          onChange={handleChange}
          placeholder="Price"
          className="border rounded-lg p-4 text-gray-700"
        />
        <button
          onClick={handleSubmit}
          className="col-span-1 md:col-span-3 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
        >
          {editingId ? "Update Product" : "Add Product"}
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="w-full table-auto">
          <thead className="bg-blue-100 text-blue-800">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-t hover:bg-gray-50 text-sm text-gray-700"
              >
                <td className="px-4 py-3">{product.name}</td>
                <td className="px-4 py-3">{product.description}</td>
                <td className="px-4 py-3">${product.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="bg-yellow-400 px-4 py-2 rounded text-white hover:bg-yellow-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="bg-red-500 px-4 py-2 rounded text-white hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
