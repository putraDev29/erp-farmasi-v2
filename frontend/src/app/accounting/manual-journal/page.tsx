"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api, formatCurrency } from "@/lib/api";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

interface EntryRow {
  account_code: string;
  debit: number;
  credit: number;
  description: string;
}

export default function ManualJournalPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<EntryRow[]>([
    { account_code: "1-1100", debit: 100000, credit: 0, description: "Debit Kas" },
    { account_code: "4-9000", debit: 0, credit: 100000, description: "Kredit Pendapatan Lain-lain" },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data?.filter((a: any) => !a.is_header) || [];
    },
  });

  const totalDebit = entries.reduce((acc, e) => acc + (Number(e.debit) || 0), 0);
  const totalCredit = entries.reduce((acc, e) => acc + (Number(e.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addRow = () => {
    setEntries((prev) => [
      ...prev,
      { account_code: accounts?.[0]?.code || "1-1100", debit: 0, credit: 0, description: "" },
    ]);
  };

  const removeRow = (idx: number) => {
    if (entries.length <= 2) return;
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof EntryRow, val: any) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/accounting/journals/manual", payload);
    },
    onSuccess: () => {
      router.push("/accounting/journals");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal memposting jurnal manual");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg("Deskripsi jurnal wajib diisi");
      return;
    }
    if (!isBalanced) {
      setErrorMsg("Total Debit dan Total Kredit harus seimbang dan lebih dari 0!");
      return;
    }

    createMutation.mutate({
      description,
      date: new Date(date).toISOString(),
      entries,
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 flex items-center gap-3 border-b border-slate-200 pb-1">
        <Link href="/accounting/journals" className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 transition">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-slate-800">Input Jurnal Umum Manual</h1>
          
        </div>
      </div>

      {errorMsg && (
        <div className="shrink-0 p-2 bg-red-50 border border-red-200 text-red-700 text-[11px] rounded flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col space-y-2">
        {/* Header Details */}
        <div className="shrink-0 bg-white p-2.5 rounded border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tanggal Transaksi *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-6 px-2 bg-slate-50 border border-slate-300 rounded text-[11px] font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Deskripsi / Uraian Transaksi *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Pembayaran Biaya Listrik & Air Apotek..."
              className="w-full h-6 px-2 bg-slate-50 border border-slate-300 rounded text-[11px] font-medium"
            />
          </div>
        </div>

        {/* Dynamic Journal Entries */}
        <div className="flex-1 min-h-0 flex flex-col bg-white p-2.5 rounded border border-slate-200 shadow-2xs space-y-2">
          <div className="shrink-0 flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Baris Entri Debit & Kredit</h3>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 px-2.5 h-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {entries.map((row, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-1.5 items-center bg-slate-50 p-1.5 rounded border border-slate-200/70 text-[11px]">
                {/* Account select */}
                <div className="w-full sm:w-1/3">
                  <SearchableAccountSelect
                    accounts={accounts || []}
                    value={row.account_code}
                    onChange={(val, acc) => updateRow(idx, "account_code", acc?._code || val)}
                    placeholder="Pilih / Cari Akun Jurnal..."
                  />
                </div>

                {/* Line note */}
                <div className="w-full sm:w-1/3">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRow(idx, "description", e.target.value)}
                    placeholder="Uraian akun..."
                    className="w-full h-6 px-2 bg-white border border-slate-300 rounded text-[11px]"
                  />
                </div>

                {/* Debit */}
                <div className="w-full sm:w-1/6">
                  <input
                    type="number"
                    min="0"
                    value={row.debit || ""}
                    onChange={(e) => updateRow(idx, "debit", parseFloat(e.target.value) || 0)}
                    placeholder="Debit Rp"
                    className="w-full h-6 px-2 bg-white border border-slate-300 rounded text-[11px] font-bold text-slate-900 text-right font-mono"
                  />
                </div>

                {/* Credit */}
                <div className="w-full sm:w-1/6">
                  <input
                    type="number"
                    min="0"
                    value={row.credit || ""}
                    onChange={(e) => updateRow(idx, "credit", parseFloat(e.target.value) || 0)}
                    placeholder="Kredit Rp"
                    className="w-full h-6 px-2 bg-white border border-slate-300 rounded text-[11px] font-bold text-slate-900 text-right font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={entries.length <= 2}
                  className="text-slate-400 hover:text-red-500 p-1 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Balance Indicator Footer (Pinned bottom) */}
          <div className="shrink-0 p-2 bg-slate-100 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Total Debit:</span>
                <span className="font-bold text-slate-900 font-mono">{formatCurrency(totalDebit)}</span>
                <span className="text-slate-400">|</span>
                <span className="font-semibold text-slate-600">Total Kredit:</span>
                <span className="font-bold text-slate-900 font-mono">{formatCurrency(totalCredit)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isBalanced ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Jurnal Seimbang (Balance Valid)
                  </span>
                ) : (
                  <span className="text-red-600 font-bold text-[11px]">
                    Selisih: {formatCurrency(Math.abs(totalDebit - totalCredit))} (Belum Seimbang!)
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending || !isBalanced}
              className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] transition shadow-2xs disabled:opacity-40"
            >
              {createMutation.isPending ? "Memposting..." : "Posting Jurnal Manual"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
