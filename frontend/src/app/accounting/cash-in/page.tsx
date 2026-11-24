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
  Printer,
  Save,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

interface CashItemRow {
  account_id: string;
  notes: string;
  amount: number;
}

export default function CashInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Mode: "list" or "form"
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters (List)
  const [keyword, setKeyword] = useState("");
  const [selectedAccountFilter, setSelectedAccountFilter] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Form State (Kas Masuk Baru - Screenshots 6 & 11)
  const [trxNo, setTrxNo] = useState("Auto");
  const [trxDate, setTrxDate] = useState("18/11/2026 19:44:05");
  const [keterangan, setKeterangan] = useState("");
  const [masukKeAkunId, setMasukKeAkunId] = useState("");
  const [items, setItems] = useState<CashItemRow[]>([
    { account_id: "", notes: "", amount: 0 },
  ]);

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  const cashBankAccounts = useMemo(() => {
    return accounts.filter((a: any) => !a.is_header && (a.subtype === "CASH_BANK" || (a.code && a.code.startsWith("1-11"))));
  }, [accounts]);

  const oppositeAccounts = useMemo(() => {
    return accounts.filter((a: any) => !a.is_header && a.code && !a.code.startsWith("1-11"));
  }, [accounts]);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cash-in-transactions", startDate, endDate, keyword],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", "IN");
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (keyword) params.append("search", keyword);
      const res = await api.get(`/accounting/cash-transactions?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return transactions.filter((t: any) => {
      if (selectedAccountFilter !== "all" && t.account_id !== selectedAccountFilter) return false;
      return true;
    });
  }, [transactions, selectedAccountFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Selected cash account balance
  const selectedCashAccount = useMemo(() => {
    return accounts.find((a: any) => a.id === masukKeAkunId);
  }, [accounts, masukKeAkunId]);

  const currentSaldoKas = selectedCashAccount?.balance || 0;

  // Form total calculation
  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!masukKeAkunId) {
        throw new Error("Pilih akun kas tujuan (Masuk Ke)");
      }
      const validItems = items.filter((it) => it.account_id && it.amount > 0);
      if (validItems.length === 0) {
        throw new Error("Tambahkan minimal 1 rincian akun dengan jumlah > 0");
      }

      return await api.post("/accounting/cash-transactions", {
        type: "IN",
        trx_no: trxNo === "Auto" ? "" : trxNo,
        date: new Date(),
        account_id: masukKeAkunId,
        description: keterangan,
        items: validItems.map((it) => ({
          account_id: it.account_id,
          notes: it.notes || keterangan,
          amount: Number(it.amount),
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-in-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      alert("Kas Masuk berhasil disimpan.");
      setViewMode("list");
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/accounting/cash-transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-in-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedId(null);
      alert("Transaksi kas masuk berhasil dihapus.");
    },
    onError: (err: any) => {
      alert("Gagal menghapus: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setTrxNo("Auto");
    const now = new Date();
    setTrxDate(
      `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
    );
    setKeterangan("");
    if (cashBankAccounts.length > 0) {
      setMasukKeAkunId(cashBankAccounts[0].id);
    } else {
      setMasukKeAkunId("");
    }
    setItems([{ account_id: "", notes: "", amount: 0 }]);
  };

  const handleOpenCreate = () => {
    resetForm();
    if (cashBankAccounts.length > 0) {
      setMasukKeAkunId(cashBankAccounts[0].id);
    }
    setViewMode("form");
  };

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, { account_id: "", notes: "", amount: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handleItemChange = (idx: number, field: keyof CashItemRow, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
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
          Hal {filtered.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || filtered.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["cash-in-transactions"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Refresh Data"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={handleOpenCreate}
        className="h-6 w-7 bg-[#00c875] hover:bg-[#00b066] text-white rounded flex items-center justify-center shadow-2xs transition active:scale-95"
        title="Tambah Kas Masuk"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          const t = transactions.find((x: any) => x.id === selectedId);
          if (t) {
            setTrxNo(t.trx_no);
            setKeterangan(t.description || "");
            setMasukKeAkunId(t.account_id);
            if (t.items && t.items.length > 0) {
              setItems(
                t.items.map((it: any) => ({
                  account_id: it.account_id,
                  notes: it.notes || "",
                  amount: it.amount || 0,
                }))
              );
            } else {
              setItems([
                {
                  account_id: t.opposite_acc_id || "",
                  notes: t.description || "",
                  amount: t.amount || 0,
                },
              ]);
            }
            setViewMode("form");
          }
        }}
        className="h-6 w-7 bg-[#3b82f6] hover:bg-blue-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Ubah"
      >
        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          if (confirm("Apakah Anda yakin ingin menghapus transaksi kas masuk ini?")) {
            deleteMutation.mutate(selectedId!);
          }
        }}
        className="h-6 w-7 bg-[#ef4444] hover:bg-red-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Hapus"
      >
        <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none bg-[#fafbfc]">
      {/* 1. TOP TITLE HEADER */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1 px-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => (viewMode === "form" ? setViewMode("list") : router.back())}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            {viewMode === "form" ? "Kas Masuk Baru" : "Kas Masuk List"}
          </h1>
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

      {viewMode === "list" ? (
        /* ======================== LIST VIEW (Screenshot 2) ======================== */
        <div className="flex-1 min-h-0 flex flex-col space-y-1 overflow-hidden">
          {/* Filter Bar */}
          <div className="shrink-0 bg-white p-2 rounded border border-slate-200 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Kata Kunci :</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari transaksi..."
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Masuk Ke :</label>
                <SearchableAccountSelect
                  accounts={cashBankAccounts}
                  value={selectedAccountFilter}
                  onChange={(val) => setSelectedAccountFilter(val || "all")}
                  placeholder="Semua Akun Kas / Bank"
                  allowClear={true}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Dari :</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Sampai :</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="shrink-0">
            {renderToolbar()}
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 h-6 shadow-2xs">
                <tr>
                  <th className="py-0.5 px-2 border-r border-slate-200 w-10 text-center"></th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-48">No Transaksi</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tanggal</th>
                  <th className="py-0.5 px-3 border-r border-slate-200">Keterangan</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-32">Kode Akun</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-48">Nama Akun</th>
                  <th className="py-0.5 px-3 text-right w-36">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      Memuat daftar kas masuk...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-normal">
                      No data
                    </td>
                  </tr>
                ) : (
                  paginated.map((t: any) => {
                    const isSelected = selectedId === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedId(isSelected ? null : t.id)}
                        className={`h-6 transition cursor-pointer hover:bg-slate-50 ${
                          isSelected ? "bg-[#9ec5f7] font-semibold text-slate-900" : ""
                        }`}
                      >
                        <td className="py-0.5 px-1.5 border-r border-slate-200 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(t.id);
                              setTrxNo(t.trx_no);
                              setKeterangan(t.description || "");
                              setMasukKeAkunId(t.account_id);
                              setViewMode("form");
                            }}
                            className="text-slate-400 hover:text-blue-600 p-0.5"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="py-0.5 px-3 font-mono font-semibold text-blue-700 border-r border-slate-200">
                          {t.trx_no}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {t.description || "-"}
                        </td>
                        <td className="py-0.5 px-3 font-mono border-r border-slate-200">
                          {t.account?.code || "-"}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {t.account?.name || "-"}
                        </td>
                        <td className="py-0.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(t.amount)}
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
            {renderToolbar()}
          </div>
        </div>
      ) : (
        /* ======================== BARU VIEW (Screenshots 6 & 11) ======================== */
        <div className="flex-1 min-h-0 bg-white p-2.5 rounded border border-slate-300 flex flex-col shadow-2xs overflow-hidden">
          {/* Header Inputs */}
          <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] mb-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">No Transaksi :</label>
              <input
                type="text"
                value={trxNo}
                readOnly
                className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Tanggal :</label>
              <input
                type="text"
                value={trxDate}
                onChange={(e) => setTrxDate(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Keterangan :</label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Keterangan umum kas masuk..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Masuk Ke Akun :</label>
              <SearchableAccountSelect
                accounts={cashBankAccounts}
                value={masukKeAkunId}
                onChange={(val) => setMasukKeAkunId(val)}
                placeholder="Select / Cari Akun Kas/Bank..."
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Saldo Kas :</label>
              <input
                type="text"
                value={formatCurrency(currentSaldoKas)}
                readOnly
                className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-100 font-mono font-bold text-[11px] text-slate-700"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Jumlah Kas :</label>
              <input
                type="text"
                value={formatCurrency(totalAmount)}
                readOnly
                className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-100 font-mono font-bold text-[11px] text-emerald-700"
              />
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 min-h-0 border border-slate-300 rounded overflow-auto mb-1">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 h-6 shadow-2xs">
                <tr>
                  <th className="py-0.5 px-2 border-r border-slate-200 w-10 text-center">No</th>
                  <th className="py-0.5 px-2 border-r border-slate-200 w-72">Kode Akun</th>
                  <th className="py-0.5 px-2 border-r border-slate-200">Keterangan Rincian</th>
                  <th className="py-0.5 px-2 text-right w-44">Jumlah</th>
                  <th className="py-0.5 px-1.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((row, idx) => (
                  <tr key={idx} className="h-7 hover:bg-slate-50">
                    <td className="py-0.5 px-2 text-center border-r border-slate-200 text-slate-500 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200">
                      <SearchableAccountSelect
                        accounts={oppositeAccounts}
                        value={row.account_id}
                        onChange={(val) => handleItemChange(idx, "account_id", val)}
                        placeholder="Select / Cari Kode Akun..."
                      />
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                        placeholder="Keterangan..."
                        className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
                      />
                    </td>
                    <td className="py-0.5 px-1.5 text-right">
                      <input
                        type="number"
                        value={row.amount || ""}
                        onChange={(e) => handleItemChange(idx, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono text-[11px]"
                      />
                    </td>
                    <td className="py-0.5 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-slate-400 hover:text-red-600 p-0.5"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grid Add Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddItemRow}
              className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Add Data</span>
            </button>
          </div>

          {/* Bottom Actions & Pink Total Box (Screenshots 4 & 6) */}
          <div className="shrink-0 flex flex-col md:flex-row items-center justify-between gap-3 pt-1.5 border-t border-slate-200">
            {/* Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Tambah</span>
              </button>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
              >
                <Save className="w-3.5 h-3.5 text-blue-600" />
                <span>Simpan</span>
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Hapus</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak</span>
              </button>
            </div>

            {/* Pink Total Box */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700">Total :</span>
              <div className="h-7 px-4 min-w-[200px] bg-[#f9c0da] border border-[#f49ec3] rounded flex items-center justify-end font-mono font-bold text-slate-800 text-xs shadow-2xs">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
