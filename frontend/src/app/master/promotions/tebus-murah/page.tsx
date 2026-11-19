"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Gift
} from "lucide-react";
import { api } from "@/lib/api";
import MasterToolbarButtons from "@/components/common/MasterToolbarButtons";

export default function TebusMurahPromotionsPage() {
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    code: "",
    period_type: "HARIAN",
    is_active: true,
    priority: 1,
    min_total_spent: 50000,
  });

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["tebus-murah-promotions"],
    queryFn: async () => {
      const res = await api.get("/tebus-murah-promotions");
      return res.data?.data || [];
    },
  });

  const selectedItem = promotions.find((p: any) => p.id === selectedId);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (isEditing && payload.id) {
        return await api.put(`/tebus-murah-promotions/${payload.id}`, payload);
      }
      return await api.post("/tebus-murah-promotions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tebus-murah-promotions"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan periode tebus murah: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/tebus-murah-promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tebus-murah-promotions"] });
      setSelectedId(null);
    },
    onError: (err: any) => {
      alert("Gagal menghapus periode tebus murah: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setFormData({
      id: "",
      code: "",
      period_type: "HARIAN",
      is_active: true,
      priority: 1,
      min_total_spent: 50000,
    });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedItem) {
      alert("Silakan pilih baris tebus murah terlebih dahulu.");
      return;
    }
    setFormData({
      id: selectedItem.id,
      code: selectedItem.code || "",
      period_type: selectedItem.period_type || "HARIAN",
      is_active: selectedItem.is_active ?? true,
      priority: selectedItem.priority || 1,
      min_total_spent: selectedItem.min_total_spent || 0,
    });
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) {
      alert("Silakan pilih baris tebus murah yang ingin dihapus.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus tebus murah "${selectedItem?.code || selectedId}"?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  const formatNumber = (num: number) => {
    if (num === undefined || num === null) return "0.00";
    return Number(num).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
        <h1 className="text-base font-semibold text-slate-800 tracking-tight">
          Periode Tebus Murah (Total Belanja)
        </h1>
      </div>

      {/* Warning Alert Banner */}
      <div className="shrink-0 bg-amber-50 border border-amber-200/80 rounded p-2 px-3 flex items-center gap-2 text-xs text-amber-800 font-medium">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>PENTING :</strong> Jika ada perubahan harap lakukan logout pada setiap aplikasi agar periode terupdate!.
        </span>
      </div>

      {/* Table Section */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded shadow-2xs overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2.5 px-4 border-r border-slate-200 w-1/4">Kode Promosi</th>
                <th className="py-2.5 px-4 border-r border-slate-200 w-1/5">Tipe Periode</th>
                <th className="py-2.5 px-4 border-r border-slate-200 w-1/6">Aktif</th>
                <th className="py-2.5 px-4 border-r border-slate-200 text-right w-1/6">Prioritas</th>
                <th className="py-2.5 px-4 text-right">Minimal Total Belanja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Memuat data periode tebus murah...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    No data
                  </td>
                </tr>
              ) : (
                promotions.map((p: any) => {
                  const isSelected = selectedId === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer transition border-b border-slate-100 ${
                        isSelected ? "bg-sky-50/80 font-medium text-sky-950" : "hover:bg-slate-50/80 text-slate-800"
                      }`}
                    >
                      <td className="py-2 px-4 border-r border-slate-100 font-mono font-semibold text-slate-900">
                        {p.code}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-100 text-slate-700">
                        {p.period_type}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-100">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {p.is_active ? "Ya / Aktif" : "Tidak"}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-r border-slate-100 text-right font-mono font-semibold text-slate-700">
                        {p.priority}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-semibold text-emerald-600">
                        Rp {formatNumber(p.min_total_spent)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* Bottom Toolbar */}
      <div className="shrink-0 pt-0.5">
        <MasterToolbarButtons
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          editDisabled={!selectedId}
          onDelete={handleDelete}
          deleteDisabled={!selectedId}
          onPrint={() => window.print()}
        />
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  {isEditing ? "Edit Tebus Murah" : "Tambah Tebus Murah Baru"}
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
                  Kode Promosi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Contoh: TEBUS-MIN-50RB"
                  className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tipe Periode</label>
                <select
                  value={formData.period_type}
                  onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
                  className="w-full h-8 px-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="HARIAN">HARIAN</option>
                  <option value="MINGGUAN">MINGGUAN</option>
                  <option value="BULANAN">BULANAN</option>
                  <option value="TAHUNAN">TAHUNAN</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioritas</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Minimal Total Belanja (Rp)</label>
                  <input
                    type="number"
                    value={formData.min_total_spent}
                    onChange={(e) => setFormData({ ...formData, min_total_spent: Number(e.target.value) })}
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tebus_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                />
                <label htmlFor="tebus_is_active" className="text-slate-700 font-medium cursor-pointer">
                  Status Aktif
                </label>
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
