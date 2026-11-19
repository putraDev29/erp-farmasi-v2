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
  X,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function DepositSupplierPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Mode: "list" or "form"
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters (List)
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Form State (Deposit Supplier Baru - Screenshot 14)
  const [trxNo, setTrxNo] = useState("Auto");
  const [trxDate, setTrxDate] = useState("18/11/2026 19:44:05");
  const [jenisDeposit, setJenisDeposit] = useState("DOUT");
  const [supplierId, setSupplierId] = useState("");
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [depositAccId, setDepositAccId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [keterangan, setKeterangan] = useState("");

  // Queries
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data?.data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  const cashBankAccounts = useMemo(() => {
    return accounts.filter(
      (a: any) => !a.is_header && (a.subtype === "CASH_BANK" || (a.code && a.code.startsWith("1-11")))
    );
  }, [accounts]);

  const depositAccounts = useMemo(() => {
    return accounts.filter(
      (a: any) => !a.is_header && a.code && (a.code.startsWith("1-14") || a.code.startsWith("1-114"))
    );
  }, [accounts]);

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ["deposits-supplier", keyword],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("party_type", "SUPPLIER");
      if (keyword) params.append("search", keyword);
      const res = await api.get(`/accounting/deposits?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return deposits.filter((d: any) => {
      if (keyword) {
        const q = keyword.toLowerCase();
        const matchDoc = (d.doc_no || "").toLowerCase().includes(q);
        const matchSupp = (d.supplier?.name || d.supplier?.code || "").toLowerCase().includes(q);
        const matchNotes = (d.notes || "").toLowerCase().includes(q);
        if (!matchDoc && !matchSupp && !matchNotes) return false;
      }
      return true;
    });
  }, [deposits, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Selected cash account balance
  const selectedCashAccount = useMemo(() => {
    return accounts.find((a: any) => a.id === cashAccountId);
  }, [accounts, cashAccountId]);

  const currentSaldoKas = selectedCashAccount?.balance || 0;

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s: any) => s.id === supplierId);
  }, [suppliers, supplierId]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) {
        throw new Error("Pilih supplier terlebih dahulu");
      }
      if (!cashAccountId) {
        throw new Error("Pilih akun kas sumber (Keluar dari Akun Kas)");
      }
      if (!depositAccId) {
        throw new Error("Pilih Kode Akun Deposit");
      }
      if (Number(amount) <= 0) {
        throw new Error("Jumlah deposit harus lebih besar dari 0");
      }

      return await api.post("/accounting/deposits", {
        party_type: "SUPPLIER",
        doc_no: trxNo === "Auto" ? "" : trxNo,
        date: new Date(),
        supplier_id: supplierId,
        cash_account_id: cashAccountId,
        deposit_acc_id: depositAccId,
        currency: "IDR",
        amount: Number(amount),
        notes: keterangan || "Deposit ke Supplier",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits-supplier"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      alert("Deposit supplier berhasil dicatat.");
      setViewMode("list");
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan deposit: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/accounting/deposits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits-supplier"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedId(null);
      alert("Deposit supplier berhasil dihapus.");
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
    setJenisDeposit("DOUT");
    setSupplierId("");
    if (cashBankAccounts.length > 0) {
      setCashAccountId(cashBankAccounts[0].id);
    } else {
      setCashAccountId("");
    }
    if (depositAccounts.length > 0) {
      setDepositAccId(depositAccounts[0].id);
    } else {
      setDepositAccId("");
    }
    setAmount(0);
    setKeterangan("");
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
        onClick={() => queryClient.invalidateQueries({ queryKey: ["deposits-supplier"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Refresh Data"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={handleOpenCreate}
        className="h-6 w-7 bg-[#00c875] hover:bg-[#00b066] text-white rounded flex items-center justify-center shadow-2xs transition active:scale-95"
        title="Tambah Deposit Supplier"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        className="h-6 w-7 bg-[#3b82f6] hover:bg-blue-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Ubah"
      >
        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          if (confirm("Apakah Anda yakin ingin menghapus deposit supplier ini?")) {
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
            {viewMode === "form" ? "Deposit Supplier Baru" : "Deposit Supplier"}
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
        /* ======================== LIST VIEW (Screenshot 15) ======================== */
        <div className="flex-1 min-h-0 flex flex-col space-y-1">
          {/* Toolbar */}
          <div className="shrink-0">{renderToolbar()}</div>

          {/* Table (Screenshot 15: No Transaksi | Tanggal | Kode | Nama | Keterangan | Mata Uang | Jumlah | User Buat | User Ubah) */}
          <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
                <tr>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-48">No Transaksi</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tanggal</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-28">Kode</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-44">Nama</th>
                  <th className="py-0.5 px-3 border-r border-slate-200">Keterangan</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 text-center w-24">Mata Uang</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 text-right w-36">Jumlah</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-28">User Buat</th>
                  <th className="py-0.5 px-3 w-28">User Ubah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      Memuat data deposit supplier...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400 font-normal">
                      No data
                    </td>
                  </tr>
                ) : (
                  paginated.map((d: any) => {
                    const isSelected = selectedId === d.id;
                    return (
                      <tr
                        key={d.id}
                        onClick={() => setSelectedId(isSelected ? null : d.id)}
                        className={`h-6 transition cursor-pointer hover:bg-slate-50 ${
                          isSelected ? "bg-[#9ec5f7] font-semibold text-slate-900" : ""
                        }`}
                      >
                        <td className="py-0.5 px-3 font-mono font-semibold text-blue-700 border-r border-slate-200">
                          {d.doc_no}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {formatDate(d.date)}
                        </td>
                        <td className="py-0.5 px-3 font-mono border-r border-slate-200">
                          {d.supplier?.code || "-"}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {d.supplier?.name || "-"}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {d.notes || "-"}
                        </td>
                        <td className="py-0.5 px-3 text-center border-r border-slate-200 font-bold">
                          {d.currency || "IDR"}
                        </td>
                        <td className="py-0.5 px-3 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                          {formatCurrency(d.amount)}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200 text-slate-600">
                          {d.creator?.username || "ADMIN2"}
                        </td>
                        <td className="py-0.5 px-3 text-slate-600">
                          {d.updater?.username || "ADMIN2"}
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
        </div>
      ) : (
        /* ======================== BARU VIEW (Screenshot 14) ======================== */
        <div className="flex-1 min-h-0 flex flex-col justify-between bg-white p-3 rounded border border-slate-300 shadow-2xs max-w-2xl">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 text-[11px] pr-1">
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

            {/* Jenis Deposit */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Jenis Deposit :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={jenisDeposit}
                  readOnly
                  className="w-24 h-6 px-2 border border-slate-300 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700"
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Supplier :</label>
              <div className="col-span-2 flex items-center gap-1">
                <input
                  type="text"
                  readOnly
                  value={
                    selectedSupplier
                      ? `[${selectedSupplier.code}] ${selectedSupplier.name}`
                      : "Select..."
                  }
                  className="flex-1 h-6 px-2 border border-slate-300 rounded bg-white text-[11px] cursor-pointer"
                  onClick={() => setSupplierModalOpen(true)}
                />
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(true)}
                  className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center justify-center text-slate-600"
                  title="Cari Supplier"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Keluar dari Akun Kas */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Keluar dari Akun Kas :</label>
              <div className="col-span-2">
                <select
                  value={cashAccountId}
                  onChange={(e) => setCashAccountId(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select...</option>
                  {cashBankAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jumlah Saldo */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Jumlah Saldo :</label>
              <div className="col-span-2">
                <input
                  type="text"
                  value={formatCurrency(currentSaldoKas)}
                  readOnly
                  className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-100 font-mono font-bold text-[11px] text-slate-700"
                />
              </div>
            </div>

            {/* Kode Akun Deposit */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Kode Akun Deposit :</label>
              <div className="col-span-2">
                <select
                  value={depositAccId}
                  onChange={(e) => setDepositAccId(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select...</option>
                  {depositAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jumlah */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-slate-600 font-semibold">Jumlah :</label>
              <div className="col-span-2">
                <input
                  type="number"
                  value={amount || ""}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full h-6 px-2 border border-slate-300 rounded font-mono text-[11px] font-bold text-slate-800 focus:outline-none focus:border-sky-500"
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
                  placeholder="Keterangan deposit..."
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions (Screenshot 14: + Tambah, Simpan, Hapus, Cetak) */}
          <div className="shrink-0 flex items-center gap-1.5 pt-2 border-t border-slate-200">
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

      {/* Supplier Lookup Modal */}
      {supplierModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded shadow-xl w-full max-w-lg overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 font-bold text-xs">
              <span>Pilih Supplier</span>
              <button onClick={() => setSupplierModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
            <div className="p-2 space-y-2">
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Cari kode atau nama supplier..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
              />
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded">
                {suppliers
                  .filter(
                    (s: any) =>
                      !supplierSearch ||
                      s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                      s.code?.toLowerCase().includes(supplierSearch.toLowerCase())
                  )
                  .map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSupplierId(s.id);
                        setSupplierModalOpen(false);
                      }}
                      className="px-3 py-1 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono font-bold text-blue-700">{s.code}</span>
                      <span className="font-semibold text-slate-800">{s.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
