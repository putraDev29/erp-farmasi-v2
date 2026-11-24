"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Printer,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

export default function GeneralLedgerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [accountID, setAccountID] = useState("");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Accounts list (leaf accounts)
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data?.filter((a: any) => !a.is_header) || [];
    },
  });

  useEffect(() => {
    if (accounts.length > 0 && !accountID) {
      // Default to KAS BESAR or first cash account
      const kas = accounts.find((a: any) => a.code === "1-1121") || accounts[0];
      setAccountID(kas.id);
    }
  }, [accounts, accountID]);

  // Query General Ledger
  const { data: ledgerData, isLoading, refetch } = useQuery({
    queryKey: ["ledger", accountID, startDate, endDate],
    queryFn: async () => {
      if (!accountID) return { entries: [], opening_balance: 0 };
      const res = await api.get(
        `/accounting/ledger?account_id=${accountID}&start_date=${startDate}&end_date=${endDate}`
      );
      return res.data?.data || { entries: [], opening_balance: 0 };
    },
    enabled: !!accountID,
  });

  const selectedAccount = accounts.find((a: any) => a.id === accountID);
  const rawEntries = ledgerData?.entries || [];
  const openingBalance = ledgerData?.opening_balance || 0;
  const totalDebit = ledgerData?.total_debit || 0;
  const totalCredit = ledgerData?.total_credit || 0;
  const endingBalance = ledgerData?.ending_balance ?? (openingBalance + totalDebit - totalCredit);

  const totalPages = Math.max(1, Math.ceil(rawEntries.length / pageSize));
  const paginated = rawEntries.slice((page - 1) * pageSize, page * pageSize);

  const handleProcess = () => {
    setPage(1);
    refetch();
  };

  const renderToolbar = () => (
    <div className="flex items-center justify-between gap-1.5 py-0.5">
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
          Hal {rawEntries.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || rawEntries.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
        <span className="font-medium">Tampilkan:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="h-6 px-1.5 border border-slate-300 rounded bg-white text-[11px] font-semibold text-slate-700 focus:outline-none"
        >
          <option value={20}>20 baris</option>
          <option value={50}>50 baris</option>
          <option value={100}>100 baris</option>
          <option value={500}>500 (Semua)</option>
        </select>
        <span className="text-slate-300">|</span>
        <span className="font-semibold text-slate-700 font-mono">{rawEntries.length} data</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none bg-[#fafbfc]">
      {/* 1. TOP TITLE HEADER & FILTER (shrink-0) */}
      <div className="shrink-0 space-y-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-1 px-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-slate-600 hover:text-slate-900"
              title="Kembali"
            >
              <BackIcon className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-bold text-slate-800">Buku Besar</h1>
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

        {/* Filter Bar */}
        <div className="bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-end gap-2 text-[11px]">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Dari Tanggal :</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36 h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Sampai Tanggal :</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36 h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex-1 min-w-[240px]">
              <label className="block text-slate-600 font-semibold mb-0.5">Kode Akun :</label>
              <SearchableAccountSelect
                accounts={accounts}
                value={accountID}
                onChange={(val) => setAccountID(val)}
                placeholder="Pilih / Cari Akun Buku Besar..."
              />
            </div>

            <button
              type="button"
              onClick={handleProcess}
              className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <span>Proses</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#f0f9ff] border border-sky-200 px-3 py-0.5 rounded text-[11px] font-semibold text-sky-900 shadow-2xs">
          Periode Akuntansi {formatDate(startDate)} sampai {formatDate(endDate)}
        </div>

        {/* Top Toolbar */}
        {renderToolbar()}
      </div>

      {/* 2. TABLE (flex-1 min-h-0 overflow-auto) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 h-6">
            <tr>
              <th className="py-0.5 px-3 border-r border-slate-200 w-52">No Transaksi</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tanggal</th>
              <th className="py-0.5 px-3 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-36">Debet</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-36">Kredit</th>
              <th className="py-0.5 px-3 text-right w-40">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  Memuat buku besar...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400 font-normal">
                  No data
                </td>
              </tr>
            ) : (
              paginated.map((row: any, idx: number) => {
                const isNegative = row.saldo < 0;
                const isSaldoAwal = row.description === "Saldo Awal" || !row.doc_no;
                return (
                  <tr key={row.id || idx} className={`h-6 transition ${isSaldoAwal ? "bg-amber-50/40 font-medium" : "hover:bg-slate-50"}`}>
                    <td className="py-0.5 px-3 font-mono font-semibold text-blue-700 border-r border-slate-200">
                      {isSaldoAwal ? "" : (row.doc_no || "")}
                    </td>
                    <td className="py-0.5 px-3 border-r border-slate-200">
                      {isSaldoAwal || !row.date || row.date.startsWith("0001") ? "" : formatDate(row.date)}
                    </td>
                    <td className="py-0.5 px-3 border-r border-slate-200">
                      {row.description || "-"}
                    </td>
                    <td className="py-0.5 px-3 text-right font-mono font-semibold border-r border-slate-200">
                      {row.debit > 0 ? formatCurrency(row.debit) : "0.00"}
                    </td>
                    <td className="py-0.5 px-3 text-right font-mono font-semibold border-r border-slate-200">
                      {row.credit > 0 ? formatCurrency(row.credit) : "0.00"}
                    </td>
                    <td
                      className={`py-0.5 px-3 text-right font-mono font-bold ${
                        isNegative ? "text-red-600 bg-red-50/50" : "text-slate-900"
                      }`}
                    >
                      {formatCurrency(row.saldo)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. BOTTOM TOOLBAR & SUMMARY BOXES (shrink-0) */}
      <div className="shrink-0 space-y-1 pt-0.5">
        {renderToolbar()}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[11px]">
          {/* Total Debet */}
          <div className="bg-white border border-slate-300 rounded p-1.5 flex items-center justify-between shadow-2xs">
            <span className="font-semibold text-slate-600">Total Debet :</span>
            <span className="font-mono font-bold text-slate-800 text-xs">
              {formatCurrency(totalDebit)}
            </span>
          </div>

          {/* Total Kredit */}
          <div className="bg-white border border-slate-300 rounded p-1.5 flex items-center justify-between shadow-2xs">
            <span className="font-semibold text-slate-600">Total Kredit :</span>
            <span className="font-mono font-bold text-slate-800 text-xs">
              {formatCurrency(totalCredit)}
            </span>
          </div>

          {/* Saldo Awal */}
          <div className="bg-white border border-slate-300 rounded p-1.5 flex items-center justify-between shadow-2xs">
            <span className="font-semibold text-slate-600">Saldo Awal :</span>
            <span className="font-mono font-bold text-slate-800 text-xs">
              {formatCurrency(openingBalance)}
            </span>
          </div>

          {/* Saldo Akhir */}
          <div className="bg-white border border-slate-300 rounded p-1.5 flex items-center justify-between shadow-2xs">
            <span className="font-semibold text-slate-600">Saldo Akhir :</span>
            <span
              className={`font-mono font-bold text-xs ${
                endingBalance < 0 ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {formatCurrency(endingBalance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
