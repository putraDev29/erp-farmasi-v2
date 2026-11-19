"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ItemForm } from "@/components/items/ItemForm";
import { api } from "@/lib/api";

export default function EditItemPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data?.data;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded p-10 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs">Memuat data item...</p>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="bg-white border border-red-200 rounded p-6 text-center text-red-600 text-xs">
        Data item tidak ditemukan atau terjadi kesalahan saat mengambil data.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <ItemForm initialData={item} isEdit={true} />
    </div>
  );
}
