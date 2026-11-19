"use client";

import React, { useState, useMemo } from "react";
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

interface NoteItemRow {
  account_id: string;
  position: "DEBIT" | "KREDIT";
}

export default function TransactionNotesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formItems, setFormItems] = useState<NoteItemRow[]>([]);

  // 1. Fetch Transaction Notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["audit-notes", searchTerm],
    queryFn: async () => {
      const res = await api.get(
        `/accounting/audit-notes${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`
      );
      return res.data?.data || [];
    },
  });

  // 2. Fetch Accounts for Modal Dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data?.filter((a: any) => !a.is_header) || [];
    },
  });

  // Client Filter & Pagination
  const filteredNotes = useMemo(() => {
    if (!keyword) return notes;
    const q = keyword.toLowerCase();
    return notes.filter(
      (n: any) =>
        (n.code || "").toLowerCase().includes(q) ||
        (n.name || "").toLowerCase().includes(q)
    );
  }, [notes, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / pageSize));
  const paginatedNotes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredNotes.slice(start, start + pageSize);
  }, [filteredNotes, page, pageSize]);

  // Handle Search click
  const handleSearch = () => {
    setSearchTerm(keyword.trim());
    setPage(1);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormCode("");
    setFormName("");
    setFormItems([]);
    setSelectedItemIndex(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (note?: any) => {
    const target = note || notes.find((n: any) => n.id === selectedId);
    if (!target) {
      alert("Pilih transaksi terlebih dahulu!");
      return;
    }
    setEditingId(target.id);
    setFormCode(target.code || "");
    setFormName(target.name || "");
    setFormItems(
      target.items?.map((it: any) => ({
        account_id: it.account_id,
        position: it.position || "DEBIT",
      })) || []
    );
    setSelectedItemIndex(null);
    setModalOpen(true);
  };

  // Add Row inside Modal
  const handleAddRow = () => {
    setFormItems((prev) => [
      ...prev,
      { account_id: accounts[0]?.id || "", position: "DEBIT" },
    ]);
    setSelectedItemIndex(formItems.length);
  };

  // Remove Row inside Modal
  const handleRemoveRow = () => {
    if (selectedItemIndex === null || selectedItemIndex < 0) {
      if (formItems.length > 0) {
        setFormItems((prev) => prev.slice(0, prev.length - 1));
      }
      return;
    }
    setFormItems((prev) => prev.filter((_, idx) => idx !== selectedItemIndex));
    setSelectedItemIndex(null);
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: formCode,
        name: formName.trim(),
        items: formItems.filter((it) => it.account_id),
      };
      if (editingId) {
        return await api.put(`/accounting/audit-notes/${editingId}`, payload);
      } else {
        return await api.post("/accounting/audit-notes", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-notes"] });
      setModalOpen(false);
      alert(
        editingId
          ? "Catatan transaksi berhasil diperbarui."
          : "Catatan transaksi baru berhasil ditambahkan."
      );
    },
    onError: (err: any) => {
      alert("Gagal menyimpan: " + (err.response?.data?.message || err.message));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/accounting/audit-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-notes"] });
      setSelectedId(null);
      alert("Catatan transaksi berhasil dihapus.");
    },
    onError: (err: any) => {
      alert("Gagal menghapus: " + (err.response?.data?.message || err.message));
    },
  });

  const handleDelete = () => {
    if (!selectedId) {
      alert("Pilih transaksi yang ingin dihapus!");
      return;
    }
    const target = notes.find((n: any) => n.id === selectedId);
    if (confirm(`Yakin ingin menghapus catatan transaksi "${target?.name || selectedId}"?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  // Toolbar Element (rendered at top and bottom)
  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1">
      {/* Pagination */}
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
          Hal {filteredNotes.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || filteredNotes.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Buttons: +, Pencil, Trash */}
      <button
        type="button"
        onClick={handleOpenCreate}
        className="w-6 h-6 bg-[#00c875] hover:bg-[#00b066] text-white rounded flex items-center justify-center shadow-2xs transition active:scale-95"
        title="Tambah Catatan Transaksi"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      <button
        type="button"
        onClick={() => handleOpenEdit()}
        disabled={!selectedId}
        className="w-6 h-6 bg-[#00a8ff] hover:bg-[#0095e6] text-white rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-50"
        title="Ubah Catatan Transaksi"
      >
        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={!selectedId || deleteMutation.isPending}
        className="w-6 h-6 bg-[#ff4757] hover:bg-[#e84118] text-white rounded flex items-center justify-center shadow-2xs transition active:scale-95 disabled:opacity-50"
        title="Hapus Catatan Transaksi"
      >
        <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none bg-[#fafbfc]">
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
          <h1 className="text-sm font-semibold text-slate-800">Catatan Transaksi</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-medium">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">33</span>
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">A</span>
          <span className="font-semibold text-slate-700">ADMIN2</span>
        </div>
      </div>

      {/* 2. Filter Bar: Kata Kunci + Cari */}
      <div className="shrink-0 border border-slate-300 bg-slate-50/50 p-1.5 rounded space-y-1 text-[11px]">
        <div>
          <label className="text-[10px] text-slate-600 block mb-0.5">Kata Kunci :</label>
          <div className="flex items-center gap-1.5 max-w-xl">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder=""
              className="flex-1 border border-slate-300 rounded px-2 h-6 text-[11px] bg-white outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="h-6 px-3 bg-[#00a8ff] hover:bg-[#0095e6] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <Search className="w-3 h-3 stroke-[2.5]" />
              <span>Cari</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Top Toolbar */}
      <div className="shrink-0">
        {renderToolbar()}
      </div>

      {/* 4. Table */}
      <div className="flex-1 min-h-0 border border-slate-300 rounded bg-white overflow-auto shadow-2xs">
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 shadow-2xs">
            <tr className="text-slate-700 font-semibold text-left">
              <th className="py-1 px-2 border-r border-slate-300 w-10 text-center"></th>
              <th className="py-1 px-2 border-r border-slate-300 w-32">Kode</th>
              <th className="py-1 px-2 border-r border-slate-300">Nama Transaksi</th>
            </tr>
          </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-slate-400">
                    Memuat catatan transaksi...
                  </td>
                </tr>
              ) : paginatedNotes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-slate-400">
                    Tidak ada data catatan transaksi.
                  </td>
                </tr>
              ) : (
                paginatedNotes.map((n: any) => {
                  const isSelected = selectedId === n.id;
                  return (
                    <tr
                      key={n.id}
                      onClick={() => setSelectedId(n.id)}
                      onDoubleClick={() => handleOpenEdit(n)}
                      className={`border-b border-slate-200 cursor-pointer transition ${
                        isSelected
                          ? "bg-sky-100 text-blue-900 font-medium"
                          : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <td className="py-1 px-2 border-r border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(n.id);
                            handleOpenEdit(n);
                          }}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-mono text-[11px] text-slate-700">
                        {n.code}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-medium text-slate-800">
                        {n.name}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* 5. Bottom Toolbar */}
      <div className="shrink-0 pt-0.5">
        {renderToolbar()}
      </div>

      {/* 6. MODAL: Tambah / Ubah Catatan Transaksi */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-2">
          <div className="bg-white rounded-md shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-300">
              <h2 className="text-xs font-bold text-slate-800">
                {editingId ? "Ubah Catatan Transaksi" : "Tambah Catatan Transaksi"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 space-y-3">
              {/* Field 1: Nama Transaksi / Keterangan */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Nama Transaksi / Keterangan :
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama transaksi..."
                  className="w-full border border-slate-300 rounded px-2 h-6 text-[11px] bg-white outline-none focus:border-emerald-500 font-medium text-slate-800"
                />
              </div>

              {/* Table: Kode Akun & Posisi */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold text-left">
                      <th className="py-1 px-2 border-r border-slate-300">Kode Akun</th>
                      <th className="py-1 px-2 border-r border-slate-300 w-28 text-center">Posisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formItems.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-8 text-center text-slate-400">
                          No data
                        </td>
                      </tr>
                    ) : (
                      formItems.map((item, idx) => {
                        const isRowSelected = selectedItemIndex === idx;
                        return (
                          <tr
                            key={idx}
                            onClick={() => setSelectedItemIndex(idx)}
                            className={`border-b border-slate-200 ${
                              isRowSelected ? "bg-sky-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="py-0.5 px-1 border-r border-slate-200">
                              <select
                                value={item.account_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormItems((prev) =>
                                    prev.map((row, i) =>
                                      i === idx ? { ...row, account_id: val } : row
                                    )
                                  );
                                }}
                                className="w-full border border-slate-200 rounded px-1.5 h-6 text-[11px] bg-white outline-none focus:border-emerald-500 font-medium text-slate-800"
                              >
                                <option value="">Select...</option>
                                {accounts.map((acc: any) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.code} - {acc.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-0.5 px-1 border-r border-slate-200 text-center">
                              <select
                                value={item.position}
                                onChange={(e) => {
                                  const val = e.target.value as "DEBIT" | "KREDIT";
                                  setFormItems((prev) =>
                                    prev.map((row, i) =>
                                      i === idx ? { ...row, position: val } : row
                                    )
                                  );
                                }}
                                className="w-full border border-slate-200 rounded px-1 h-6 text-[11px] bg-white outline-none focus:border-emerald-500 font-bold text-slate-700 text-center"
                              >
                                <option value="DEBIT">DEBIT</option>
                                <option value="KREDIT">KREDIT</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Sub-Buttons: + Add Data & Trash */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="h-6 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Data</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemoveRow}
                  disabled={formItems.length === 0}
                  className="w-6 h-6 bg-slate-100 hover:bg-red-50 border border-slate-300 text-slate-600 hover:text-red-600 rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
                  title="Hapus Baris"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Modal Footer Buttons: ✔ Simpan & ↶ Kembali */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={!formName.trim() || saveMutation.isPending}
                className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-6 px-3 bg-white hover:bg-slate-100 border border-amber-300 text-amber-900 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
