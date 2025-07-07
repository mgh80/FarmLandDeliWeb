"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { FiTrash } from "react-icons/fi";

interface Promotion {
  id: number;
  title: string;
  image_url: string;
  active?: boolean;
  created_at?: string;
}

export default function PromotionsPage() {
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    const { data, error } = await supabase
      .from("Promotions")
      .select("*")
      .order("id", { ascending: false });

    if (!error && data) {
      setPromotions(data as Promotion[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !imageFile) {
      Swal.fire("Error", "You must complete all fields", "error");
      return;
    }

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("promotions")
      .upload(filePath, imageFile);

    if (uploadError) {
      Swal.fire("Error", "Unable to upload image", "error");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("promotions")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("Promotions").insert([
      {
        title,
        image_url: publicUrlData.publicUrl,
        active: true,
        created_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      Swal.fire("Error", insertError.message, "error");
    } else {
      Swal.fire("Saved", "Promotion successfully saved", "success");
      setTitle("");
      setImageFile(null);
      fetchPromotions();
    }
  };

  const handleDelete = async (id: number) => {
    const promo = promotions.find((p) => p.id === id);
    if (!promo) return;

    const result = await Swal.fire({
      title: "¿Are you sure?",
      text: "This promotion will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    const urlParts = promo.image_url.split("/");
    const fileName = decodeURIComponent(urlParts[urlParts.length - 1]);

    await supabase.storage.from("promotions").remove([fileName]);

    const { error } = await supabase.from("Promotions").delete().eq("id", id);

    if (error) {
      Swal.fire("Error", "Promotion could not be eliminated.", "error");
    } else {
      Swal.fire("Deleted", "Promotion successfully eliminated.", "success");
      fetchPromotions();
    }
  };

  return (
    <div className="p-8 text-gray-800">
      <h1 className="text-2xl font-bold mb-6">Offer Management</h1>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded p-6 w-full max-w-lg space-y-4"
      >
        <h2 className="text-lg font-semibold">Create offer</h2>

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-4 py-2"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="w-full border rounded px-4 py-2"
        />

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Save offer
        </button>
      </form>

      {/* Lista de promociones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-10">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="relative bg-white shadow-md rounded overflow-hidden"
          >
            <img
              src={promo.image_url}
              alt={promo.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-bold">{promo.title}</h3>
            </div>

            <button
              onClick={() => handleDelete(promo.id)}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
              title="Eliminar"
            >
              <FiTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
