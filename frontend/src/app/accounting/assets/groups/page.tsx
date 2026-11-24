"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Undo2,
} from "lucide-react";
import { api } from "@/lib/api";
import SearchableAccountSelect from "@/components/common/SearchableAccountSelect";

export default function AssetGroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modal State (Screenshot 5)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kodeGrup, setKodeGrup] = useState("");
  const [namaGrup, setNamaGrup] = useState("");
  const [akunAsetId, setAkunAsetId] = useState("");
  const [akunPenyusutanId, setAkunPenyusutanId] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  const assetAccounts = accounts.filter((a: any) => !a.is_header && (a.code.startsWith("1-5") || a.code.startsWith("1-")));
  const deprecAccounts = accounts.filter((a: any) => !a.is_header && (a.code.startsWith("6-3") || a.code.startsWith("6-") || a.code.startsWith("1-52")));

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["asset-groups"],
    queryFn: async () => {
      const res = await api.get("/accounting/assets/groups");
      return res.data?.data || [];
    },
  });

  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
  const paginated = groups.slice((page - 1) * pageSize, page * pageSize);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!kodeGrup.trim() || !namaGrup.trim()) {
        throw new Error("Kode Grup dan Nama wajib diisi");
      }
      return await api.post("/accounting/assets/groups", {
        code: kodeGrup.trim(),
        name: namaGrup.trim(),
        useful_life_year: 4,
        deprec_rate: 25,
        method: "GARIS_LURUS",
        asset_acc_id: akunAsetId || null,
        deprec_acc_id: akunPenyusutanId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups"] });
      setModalOpen(false);
      resetForm();
      alert("Grup aset berhasil disimpan.");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan grup aset: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/accounting/assets/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-groups"] });
      setSelectedId(null);
      alert("Grup aset berhasil dihapus.");
    },
    onError: (err: any) => {
      alert("Gagal menghapus grup aset: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setKodeGrup("");
    setNamaGrup("");
    setAkunAsetId(assetAccounts[0]?.id || "");
    setAkunPenyusutanId(deprecAccounts[0]?.id || "");
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (g?: any) => {
    const item = g || groups.find((x: any) => x.id === selectedId);
    if (!item) return;
    setEditingId(item.id);
    setKodeGrup(item.code);
    setNamaGrup(item.name);
    setAkunAsetId(item.asset_acc_id || "");
    setAkunPenyusutanId(item.deprec_acc_id || "");
    setModalOpen(true);
  };

  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1">
      <div className="inline-flex items-center border border-slate-300 rounded bg-white text-[11px] text-slate-700 h-6">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-semibold px-2.5 h-full flex items-center text-[11px]">
          Hal {groups.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || groups.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleOpenCreate}
        className="h-6 w-7 bg-[#00c875] hover:bg-[#00b066] text-white rounded flex items-center justify-center shadow-2xs transition active:scale-95"
        title="Tambah Grup Aset"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        onClick={() => handleOpenEdit()}
        className="h-6 w-7 bg-[#3b82f6] hover:bg-blue-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Ubah Grup"
      >
        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          if (confirm("Apakah Anda yakin ingin menghapus grup aset ini?")) {
            deleteMutation.mutate(selectedId!);
          }
        }}
        className="h-6 w-7 bg-[#ef4444] hover:bg-red-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Hapus Grup"
      >
        <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1 px-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">Daftar Grup Aset</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            33
          </span>
          <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            A
          </span>
          <span>ADMIN2</span>
        </div>
      </div>

      {/* Toolbar Top */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* Table (Screenshot 4: [Pensil] | Kode | Grup) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-2 border-r border-slate-200 w-10 text-center"></th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-72">Kode</th>
              <th className="py-0.5 px-3">Grup</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="py-16 text-center text-slate-400">
                  Memuat daftar grup aset...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-20 text-center text-slate-400 font-normal">
                  No data
                </td>
              </tr>
            ) : (
              paginated.map((g: any) => {
                const isSelected = selectedId === g.id;
                return (
                  <tr
                    key={g.id}
                    onClick={() => setSelectedId(isSelected ? null : g.id)}
                    className={`h-6 transition cursor-pointer hover:bg-slate-50 ${
                      isSelected ? "bg-[#9ec5f7] font-semibold text-slate-900" : ""
                    }`}
                  >
                    <td className="py-0.5 px-1.5 border-r border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(g.id);
                          handleOpenEdit(g);
                        }}
                        className="text-slate-400 hover:text-blue-600 p-0.5"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-0.5 px-3 font-semibold border-r border-slate-200">
                      {g.code}
                    </td>
                    <td className="py-0.5 px-3">
                      {g.name}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Toolbar Bottom */}
      <div className="shrink-0 pt-0.5">{renderToolbar()}</div>

      {/* MODAL TAMBAH GRUP ASET (Screenshot 5) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800">
              <span>{editingId ? "Ubah Grup Aset" : "Tambah Grup Aset"}</span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2 text-[11px]">
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Kode Grup :</label>
                <input
                  type="text"
                  value={kodeGrup}
                  onChange={(e) => setKodeGrup(e.target.value)}
                  placeholder="Contoh: Bangunan"
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Nama :</label>
                <input
                  type="text"
                  value={namaGrup}
                  onChange={(e) => setNamaGrup(e.target.value)}
                  placeholder="Contoh: Bangunan"
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Kode Akun Aset :</label>
                <SearchableAccountSelect
                  accounts={assetAccounts}
                  value={akunAsetId}
                  onChange={(val) => setAkunAsetId(val)}
                  placeholder="Select / Cari Akun Aset..."
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Kode Akun Penyusutan :</label>
                <SearchableAccountSelect
                  accounts={deprecAccounts}
                  value={akunPenyusutanId}
                  onChange={(val) => setAkunPenyusutanId(val)}
                  placeholder="Select / Cari Akun Penyusutan..."
                />
              </div>
            </div>

            {/* Buttons (Screenshot 5: ✔ Simpan, ↶ Kembali) */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-6 px-3 bg-white border border-emerald-600 hover:bg-emerald-50 text-emerald-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simpan</span>
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-6 px-3 bg-white border border-amber-500 hover:bg-amber-50 text-amber-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
