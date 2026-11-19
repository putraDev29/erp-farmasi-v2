"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  FolderTree
} from "lucide-react";
import { api } from "@/lib/api";
import { MasterToolbarButtons } from "@/components/common/MasterToolbarButtons";

export default function SubCategoriesPage() {
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    category_id: "",
    code: "",
    name: "",
    description: "",
  });

  // Fetch Parent Categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data?.data || [];
    },
  });

  // Fetch Sub Categories
  const { data: subCategories = [], isLoading } = useQuery({
    queryKey: ["sub-categories", searchParam],
    queryFn: async () => {
      const res = await api.get(`/sub-categories?search=${encodeURIComponent(searchParam)}`);
      return res.data?.data || [];
    },
  });

  const selectedSub = subCategories.find((s: any) => s.id === selectedId);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (isEditing && payload.id) {
        return await api.put(`/sub-categories/${payload.id}`, payload);
      }
      return await api.post("/sub-categories", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-categories"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan sub jenis: " + (err.response?.data?.message || err.message));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/sub-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-categories"] });
      setSelectedId(null);
    },
    onError: (err: any) => {
      alert("Gagal menghapus sub jenis: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setFormData({ id: "", category_id: "", code: "", name: "", description: "" });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (item?: any) => {
    const target = item || selectedSub;
    if (!target) {
      alert("Silakan pilih sub jenis terlebih dahulu.");
      return;
    }
    setFormData({
      id: target.id,
      category_id: target.category_id || "",
      code: target.code || "",
      name: target.name || "",
      description: target.description || target.name || "",
    });
    setSelectedId(target.id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) {
      alert("Silakan pilih sub jenis yang ingin dihapus.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus sub jenis "${selectedSub?.name || selectedId}"?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  const handleSearch = () => {
    setSearchParam(keyword);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(subCategories.length / pageSize));
  const paginatedData = subCategories.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1">
      <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-xs h-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-2.5 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition"
          title="Halaman Sebelumnya"
        >
          &lt;
        </button>
        <span className="px-3 h-full flex items-center font-medium">
          Hal {page}/{totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-2.5 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
          title="Halaman Berikutnya"
        >
          &gt;
        </button>
      </div>

      <MasterToolbarButtons
        onAdd={handleOpenAdd}
        onEdit={() => handleOpenEdit()}
        editDisabled={!selectedId}
        onDelete={handleDelete}
        deleteDisabled={!selectedId}
        onPrint={() => window.print()}
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => window.history.back()}
          className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-800 tracking-tight">Daftar Sub Jenis</h1>
      </div>

      {/* Filter Bar */}
      <div className="shrink-0 bg-white border border-slate-200 rounded p-2 shadow-2xs space-y-1.5">
        <div className="flex items-center gap-3 text-xs">
          <label className="text-slate-700 font-medium">Kata Kunci :</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cari sub jenis atau keterangan..."
            className="flex-1 max-w-md h-6 px-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          />
          <button
            onClick={handleSearch}
            className="h-6 px-4 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded flex items-center gap-1.5 shadow-xs transition text-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cari</span>
          </button>
        </div>
      </div>

      {/* Top Toolbar */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* Table Section */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded shadow-2xs overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200">Aksi</th>
                <th className="py-2 px-4 border-r border-slate-200 w-1/4">Kode</th>
                <th className="py-2 px-4 border-r border-slate-200 w-1/3">Sub Jenis</th>
                <th className="py-2 px-4 border-r border-slate-200 w-1/4">Jenis Utama</th>
                <th className="py-2 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Memuat data sub jenis...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada data sub jenis barang.
                  </td>
                </tr>
              ) : (
                paginatedData.map((s: any) => {
                  const isSelected = selectedId === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`cursor-pointer transition border-b border-slate-100 ${
                        isSelected ? "bg-sky-50/80 font-medium text-sky-950" : "hover:bg-slate-50/80 text-slate-800"
                      }`}
                    >
                      <td className="py-2 px-2 text-center border-r border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(s);
                          }}
                          className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded transition"
                          title="Edit Sub Jenis"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-2 px-4 border-r border-slate-100 font-mono text-[11px] font-semibold text-slate-900">
                        {s.code}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-100 font-semibold text-slate-900">
                        {s.name}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-100 text-slate-700">
                        {s.category?.name || "-"}
                      </td>
                      <td className="py-2 px-4 text-slate-700">
                        {s.description || s.name || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* Bottom Toolbar */}
      <div className="shrink-0 pt-0.5">{renderToolbar()}</div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  {isEditing ? "Edit Data Sub Jenis" : "Tambah Sub Jenis Baru"}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 hover:bg-slate-200/60 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Pilih Jenis Utama <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full h-6 px-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">-- Pilih Jenis Utama --</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Kode Sub Jenis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: SUB-01"
                  className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nama Sub Jenis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Infus Terumo / Jarum Suntik"
                  className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Keterangan</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
