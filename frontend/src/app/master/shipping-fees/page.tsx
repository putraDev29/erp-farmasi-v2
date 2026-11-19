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
  ArrowUpDown,
  X,
  Truck
} from "lucide-react";
import { api } from "@/lib/api";
import { MasterToolbarButtons } from "@/components/common/MasterToolbarButtons";

export default function ShippingFeesPage() {
  const queryClient = useQueryClient();

  // Filters
  const [expedition, setExpedition] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [searchParams, setSearchParams] = useState({ expedition: "", fromCity: "", toCity: "" });

  const [sortBy, setSortBy] = useState("expedition");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    expedition: "",
    from_city: "",
    to_city: "",
    country: "Indonesia",
    cost_1: 0,
    cost_2: 0,
    cost_3: 0,
    notes: "",
  });

  // Fetch Shipping Fees
  const { data: fees = [], isLoading } = useQuery({
    queryKey: ["shipping-fees", searchParams, sortBy, sortDir],
    queryFn: async () => {
      const res = await api.get(
        `/shipping-fees?expedition=${encodeURIComponent(searchParams.expedition)}&from_city=${encodeURIComponent(
          searchParams.fromCity
        )}&to_city=${encodeURIComponent(searchParams.toCity)}&sort_by=${sortBy}&sort_dir=${sortDir}`
      );
      return res.data?.data || [];
    },
  });

  const selectedFee = fees.find((f: any) => f.id === selectedId);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (isEditing && payload.id) {
        return await api.put(`/shipping-fees/${payload.id}`, payload);
      }
      return await api.post("/shipping-fees", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-fees"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan data ongkir: " + (err.response?.data?.message || err.message));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/shipping-fees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-fees"] });
      setSelectedId(null);
    },
    onError: (err: any) => {
      alert("Gagal menghapus ongkir: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setFormData({
      id: "",
      expedition: "",
      from_city: "",
      to_city: "",
      country: "Indonesia",
      cost_1: 0,
      cost_2: 0,
      cost_3: 0,
      notes: "",
    });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (item?: any) => {
    const target = item || selectedFee;
    if (!target) {
      alert("Silakan pilih ongkir terlebih dahulu.");
      return;
    }
    setFormData({
      id: target.id,
      expedition: target.expedition || "",
      from_city: target.from_city || "",
      to_city: target.to_city || "",
      country: target.country || "Indonesia",
      cost_1: target.cost_1 || 0,
      cost_2: target.cost_2 || 0,
      cost_3: target.cost_3 || 0,
      notes: target.notes || "",
    });
    setSelectedId(target.id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) {
      alert("Silakan pilih data ongkir yang ingin dihapus.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus ongkir "${selectedFee?.expedition || selectedId}"?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  const handleSearch = () => {
    setSearchParams({ expedition, fromCity, toCity });
    setPage(1);
  };

  const toggleSortDir = () => {
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const totalPages = Math.max(1, Math.ceil(fees.length / pageSize));
  const paginatedData = fees.slice((page - 1) * pageSize, page * pageSize);

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
        <h1 className="text-base font-semibold text-slate-800 tracking-tight">Daftar Ongkir</h1>
      </div>

      {/* Filter Bar */}
      <div className="shrink-0 bg-white border border-slate-200 rounded p-2 shadow-2xs space-y-1.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          {/* Ekspedisi */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <label className="shrink-0 text-slate-700 font-medium">Expedisi :</label>
            <input
              type="text"
              value={expedition}
              onChange={(e) => setExpedition(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="JNE / J&T"
              className="flex-1 h-6 px-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Dari Kota */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <label className="shrink-0 text-slate-700 font-medium">Dari Kota :</label>
            <input
              type="text"
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Jakarta / Pontianak"
              className="flex-1 h-6 px-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Kota Tujuan */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <label className="shrink-0 text-slate-700 font-medium">Kota Tujuan :</label>
            <input
              type="text"
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Surabaya / Semarang"
              className="flex-1 h-6 px-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Urut & Cari */}
          <div className="md:col-span-3 flex items-center gap-2 justify-end">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-6 px-2 rounded border border-slate-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="expedition">Expedisi</option>
              <option value="from_city">Dari Kota</option>
              <option value="to_city">Kota Tujuan</option>
            </select>
            <button
              onClick={toggleSortDir}
              className="h-6 px-2 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
              title="Urutan Naik/Turun"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSearch}
              className="h-6 px-3.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded flex items-center gap-1 shadow-xs transition text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
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
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Expedisi</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Dari Kota</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kota Tujuan</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Negara</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right whitespace-nowrap">Biaya 1</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right whitespace-nowrap">Biaya 2</th>
                <th className="py-2 px-3 border-r border-slate-200 text-right whitespace-nowrap">Biaya 3</th>
                <th className="py-2 px-3 whitespace-nowrap min-w-[200px]">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Memuat data ongkir...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada data tarif ongkir.
                  </td>
                </tr>
              ) : (
                paginatedData.map((f: any) => {
                  const isSelected = selectedId === f.id;
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className={`cursor-pointer transition border-b border-slate-100 ${
                        isSelected ? "bg-sky-50/80 font-medium text-sky-950" : "hover:bg-slate-50/80 text-slate-800"
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(f);
                          }}
                          className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded transition"
                          title="Edit Ongkir"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 font-semibold text-slate-900 whitespace-nowrap">
                        {f.expedition}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                        {f.from_city}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                        {f.to_city}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                        {f.country || "Indonesia"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-right font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        {Number(f.cost_1 || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-right font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        {Number(f.cost_2 || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-right font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        {Number(f.cost_3 || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                        {f.notes || "-"}
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
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  {isEditing ? "Edit Tarif Ongkir" : "Tambah Tarif Ongkir Baru"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nama Expedisi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.expedition}
                    onChange={(e) => setFormData({ ...formData, expedition: e.target.value.toUpperCase() })}
                    placeholder="JNE / J&T / SICEPAT"
                    className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Negara</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Dari Kota <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.from_city}
                    onChange={(e) => setFormData({ ...formData, from_city: e.target.value })}
                    placeholder="Jakarta / Pontianak"
                    className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Kota Tujuan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.to_city}
                    onChange={(e) => setFormData({ ...formData, to_city: e.target.value })}
                    placeholder="Surabaya / Semarang"
                    className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Biaya 1 (Reguler)</label>
                  <input
                    type="number"
                    value={formData.cost_1}
                    onChange={(e) => setFormData({ ...formData, cost_1: Number(e.target.value) })}
                    className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Biaya 2 (Kilat/Yes)</label>
                  <input
                    type="number"
                    value={formData.cost_2}
                    onChange={(e) => setFormData({ ...formData, cost_2: Number(e.target.value) })}
                    className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Biaya 3 (Express)</label>
                  <input
                    type="number"
                    value={formData.cost_3}
                    onChange={(e) => setFormData({ ...formData, cost_3: Number(e.target.value) })}
                    className="w-full h-6 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Keterangan Layanan</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: 1 (Reg), 2 (Kilat), 3 (Express)"
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
