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
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

export default function CashTransferPage() {
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

  // Form State (Kas Transfer Baru - Screenshot 12)
  const [trxNo, setTrxNo] = useState("Auto");
  const [trxDate, setTrxDate] = useState("18/11/2026 19:44:05");
  const [keterangan, setKeterangan] = useState("");
  const [dariAkunId, setDariAkunId] = useState("");
  const [keAkunId, setKeAkunId] = useState("");
  const [jumlah, setJumlah] = useState<number>(0);

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

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cash-transfer-transactions", startDate, endDate, keyword],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", "TRANSFER");
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
    return accounts.find((a: any) => a.id === dariAkunId);
  }, [accounts, dariAkunId]);

  const currentSaldoKas = selectedCashAccount?.balance || 0;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!dariAkunId) {
        throw new Error("Pilih akun sumber (Dari Akun)");
      }
      if (!keAkunId) {
        throw new Error("Pilih akun tujuan (Transfer Ke)");
      }
      if (dariAkunId === keAkunId) {
        throw new Error("Akun sumber dan akun tujuan tidak boleh sama");
      }
      if (Number(jumlah) <= 0) {
        throw new Error("Jumlah transfer harus lebih besar dari 0");
      }

      return await api.post("/accounting/cash-transactions", {
        type: "TRANSFER",
        trx_no: trxNo === "Auto" ? "" : trxNo,
        date: new Date(),
        account_id: dariAkunId,
        target_account_id: keAkunId,
        amount: Number(jumlah),
        description: keterangan,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-transfer-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      alert("Kas Transfer berhasil disimpan.");
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
      queryClient.invalidateQueries({ queryKey: ["cash-transfer-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedId(null);
      alert("Transaksi kas transfer berhasil dihapus.");
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
      setDariAkunId(cashBankAccounts[0].id);
      setKeAkunId(cashBankAccounts[1]?.id || "");
    } else {
      setDariAkunId("");
      setKeAkunId("");
    }
    setJumlah(0);
  };

  const handleOpenCreate = () => {
    resetForm();
    setViewMode("form");
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
        onClick={() => queryClient.invalidateQueries({ queryKey: ["cash-transfer-transactions"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Refresh Data"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={handleOpenCreate}
        className="h-6 w-7 bg-[#00c875] hover:bg-[#00b066] text-white rounded flex items-center justify-center shadow-2xs transition active:scale-95"
        title="Tambah Kas Transfer"
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
            setDariAkunId(t.account_id);
            setKeAkunId(t.target_account_id || "");
            setJumlah(t.amount || 0);
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
          if (confirm("Apakah Anda yakin ingin menghapus transaksi kas transfer ini?")) {
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
            {viewMode === "form" ? "Kas Transfer Baru" : "Kas Transfer List"}
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
        /* ======================== LIST VIEW (Screenshot 8) ======================== */
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
                  placeholder="Cari transaksi kas transfer..."
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Dari Akun :</label>
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

          {/* Table (Screenshot 8) */}
          <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 h-6 shadow-2xs">
                <tr>
                  <th className="py-0.5 px-2 border-r border-slate-200 w-10 text-center"></th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-52">No Transaksi</th>
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
                      Memuat daftar kas transfer...
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
                              setDariAkunId(t.account_id);
                              setKeAkunId(t.target_account_id || "");
                              setJumlah(t.amount || 0);
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
                        <td className="py-0.5 px-3 text-right font-mono font-bold text-slate-800">
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
        /* ======================== BARU VIEW (Screenshot 12) ======================== */
        <div className="flex-1 min-h-0 bg-white p-3 rounded border border-slate-300 flex flex-col shadow-2xs max-w-2xl overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 text-[11px] pr-2">
            {/* No Transaksi */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">No Transaksi :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={trxNo}
                  readOnly
                  className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700"
                />
              </div>
            </div>

            {/* Tanggal */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Tanggal :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={trxDate}
                  onChange={(e) => setTrxDate(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Keterangan */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Keterangan :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Keterangan transfer kas..."
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Dari Akun */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Dari Akun :</label>
              <div className="col-span-2">
                <SearchableAccountSelect
                  accounts={cashBankAccounts}
                  value={dariAkunId}
                  onChange={(val) => setDariAkunId(val)}
                  placeholder="Select / Cari Dari Akun..."
                />
              </div>
            </div>

            {/* Saldo Kas */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Saldo Kas :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={formatCurrency(currentSaldoKas)}
                  readOnly
                  className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-100 font-mono font-bold text-[11px] text-slate-700"
                />
              </div>
            </div>

            {/* Transfer Ke */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Transfer Ke :</label>
              <div className="col-span-2">
                <SearchableAccountSelect
                  accounts={cashBankAccounts}
                  value={keAkunId}
                  onChange={(val) => setKeAkunId(val)}
                  placeholder="Select / Cari Transfer Ke Akun..."
                />
              </div>
            </div>

            {/* Jumlah */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Jumlah :</label>
              <div className="col-span-2">
                <input
                  type="number"
                  value={jumlah || ""}
                  onChange={(e) => setJumlah(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full h-6 px-2 border border-slate-300 rounded font-mono text-[11px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions (Screenshot 12: + Tambah, Simpan, Hapus, Cetak) */}
          <div className="shrink-0 flex items-center gap-1.5 pt-1.5 border-t border-slate-200">
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
        </div>
      )}
    </div>
  );
}
