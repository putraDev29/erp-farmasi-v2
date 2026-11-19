"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function DepositBalancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filter State
  const [depositType, setDepositType] = useState<"Deposit Pelanggan" | "Deposit Supplier">(
    "Deposit Pelanggan"
  );
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [gudang, setGudang] = useState("UTAMA - APOTEK BERKAT");
  const [periode, setPeriode] = useState("November");
  const [tahun, setTahun] = useState("2026");

  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Customers & Suppliers Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data?.data || [];
    },
  });

  // Query Deposit Records
  const { data: deposits = [], isLoading, refetch } = useQuery({
    queryKey: ["deposit-records", depositType],
    queryFn: async () => {
      const pType = depositType === "Deposit Pelanggan" ? "CUSTOMER" : "SUPPLIER";
      const res = await api.get(`/accounting/deposits?party_type=${pType}`);
      return res.data?.data || [];
    },
  });

  // Selected party object
  const selectedParty = useMemo(() => {
    if (depositType === "Deposit Pelanggan") {
      return customers.find((c: any) => c.id === selectedPartyId);
    }
    return suppliers.find((s: any) => s.id === selectedPartyId);
  }, [depositType, customers, suppliers, selectedPartyId]);

  // Filter deposit rows
  const ledgerRows = useMemo(() => {
    let running = 0;
    const filtered = deposits.filter((d: any) => {
      if (depositType === "Deposit Pelanggan") {
        if (selectedPartyId && d.customer_id !== selectedPartyId) return false;
      } else {
        if (selectedPartyId && d.supplier_id !== selectedPartyId) return false;
      }
      return true;
    });

    return filtered.map((d: any) => {
      const masuk = d.party_type === "CUSTOMER" ? d.amount : 0;
      const keluar = d.party_type === "SUPPLIER" ? d.amount : 0;
      running += masuk - keluar;

      return {
        id: d.id,
        trx_no: d.doc_no,
        kantor: "UTAMA",
        date: d.date,
        type: d.party_type === "CUSTOMER" ? "DPIN" : "DOUT",
        trx_type: d.party_type === "CUSTOMER" ? "Deposit Masuk" : "Deposit Keluar",
        masuk: masuk,
        keluar: keluar,
        saldo: running,
        name: d.customer?.name || d.supplier?.name || "-",
      };
    });
  }, [deposits, depositType, selectedPartyId]);

  const totalPages = Math.max(1, Math.ceil(ledgerRows.length / pageSize));
  const paginated = ledgerRows.slice((page - 1) * pageSize, page * pageSize);

  const totalMasuk = ledgerRows.reduce((sum, r) => sum + r.masuk, 0);
  const totalKeluar = ledgerRows.reduce((sum, r) => sum + r.keluar, 0);
  const saldoAwal = 0;
  const saldoAkhir = totalMasuk - totalKeluar;

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
          Hal {ledgerRows.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || ledgerRows.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
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
          <h1 className="text-sm font-bold text-slate-800">Deposit Saldo</h1>
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

      {/* 2. Filter Bar (Screenshot 1: Tipe Deposit, Pelanggan, Gudang, Periode, Tahun, Proses, Cetak) */}
      <div className="shrink-0 bg-white p-2.5 rounded border border-slate-200 shadow-2xs space-y-2 text-[11px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Tipe Deposit */}
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tipe Deposit :</label>
            <select
              value={depositType}
              onChange={(e) => {
                setDepositType(e.target.value as any);
                setSelectedPartyId("");
              }}
              className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
            >
              <option value="Deposit Pelanggan">Deposit Pelanggan</option>
              <option value="Deposit Supplier">Deposit Supplier</option>
            </select>
          </div>

          {/* Pelanggan / Supplier */}
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">
              {depositType === "Deposit Pelanggan" ? "Pelanggan :" : "Supplier :"}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                readOnly
                value={
                  selectedParty
                    ? `[${selectedParty.code}] ${selectedParty.name}`
                    : "Select..."
                }
                onClick={() => setPartyModalOpen(true)}
                className="flex-1 h-6 px-2 border border-slate-300 rounded bg-white text-[11px] cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setPartyModalOpen(true)}
                className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center justify-center text-slate-600"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Gudang */}
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Gudang :</label>
            <select
              value={gudang}
              onChange={(e) => setGudang(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
            >
              <option value="UTAMA - APOTEK BERKAT">UTAMA - APOTEK BERKAT</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          {/* Periode */}
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Periode :</label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun */}
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tahun :</label>
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setPage(1);
                refetch();
              }}
              className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
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
      </div>

      {/* Toolbar */}
      <div className="shrink-0">
        {renderToolbar()}
      </div>

      {/* 3. TABLE (Screenshot 1: No Transaksi | Kantor | Tanggal | Tipe | Tipe Trans. | Masuk | Keluar | Saldo | Nama) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-3 border-r border-slate-200 w-48">No Transaksi</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-28">Kantor</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tanggal</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-24">Tipe</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tipe Trans.</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-36">Masuk</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-36">Keluar</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-40">Saldo</th>
              <th className="py-0.5 px-3">Nama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  Memuat data saldo deposit...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center text-slate-400 font-normal">
                  No data
                </td>
              </tr>
            ) : (
              paginated.map((r: any) => (
                <tr key={r.id} className="h-6 hover:bg-slate-50 transition">
                  <td className="py-0.5 px-3 font-mono font-semibold text-blue-700 border-r border-slate-200">
                    {r.trx_no}
                  </td>
                  <td className="py-0.5 px-3 border-r border-slate-200 text-slate-600">
                    {r.kantor}
                  </td>
                  <td className="py-0.5 px-3 border-r border-slate-200">
                    {formatDate(r.date)}
                  </td>
                  <td className="py-0.5 px-3 font-mono font-bold border-r border-slate-200">
                    {r.type}
                  </td>
                  <td className="py-0.5 px-3 border-r border-slate-200">
                    {r.trx_type}
                  </td>
                  <td className="py-0.5 px-3 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">
                    {r.masuk > 0 ? formatCurrency(r.masuk) : "0.00"}
                  </td>
                  <td className="py-0.5 px-3 text-right font-mono font-semibold text-rose-700 border-r border-slate-200">
                    {r.keluar > 0 ? formatCurrency(r.keluar) : "0.00"}
                  </td>
                  <td className="py-0.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                    {formatCurrency(r.saldo)}
                  </td>
                  <td className="py-0.5 px-3 text-slate-700">
                    {r.name}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Toolbar */}
      <div className="shrink-0 pt-0.5">
        {renderToolbar()}
      </div>

      {/* 4. BOTTOM SUMMARY BOXES (Screenshot 1: Total Masuk, Total Keluar, Saldo Awal, Saldo Akhir) */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2 pt-0.5 text-[11px]">
        <div className="bg-white border border-slate-300 rounded p-2 flex items-center justify-between shadow-2xs">
          <span className="font-semibold text-slate-600">Total Masuk :</span>
          <span className="font-mono font-bold text-emerald-700 text-xs">
            {formatCurrency(totalMasuk)}
          </span>
        </div>

        <div className="bg-white border border-slate-300 rounded p-2 flex items-center justify-between shadow-2xs">
          <span className="font-semibold text-slate-600">Total Keluar :</span>
          <span className="font-mono font-bold text-rose-700 text-xs">
            {formatCurrency(totalKeluar)}
          </span>
        </div>

        <div className="bg-white border border-slate-300 rounded p-2 flex items-center justify-between shadow-2xs">
          <span className="font-semibold text-slate-600">Saldo Awal :</span>
          <span className="font-mono font-bold text-slate-700 text-xs">
            {formatCurrency(saldoAwal)}
          </span>
        </div>

        <div className="bg-white border border-slate-300 rounded p-2 flex items-center justify-between shadow-2xs">
          <span className="font-semibold text-slate-600">Saldo Akhir :</span>
          <span className="font-mono font-bold text-blue-700 text-xs">
            {formatCurrency(saldoAkhir)}
          </span>
        </div>
      </div>

      {/* Party Lookup Modal */}
      {partyModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded shadow-xl w-full max-w-lg overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 font-bold text-xs">
              <span>{depositType === "Deposit Pelanggan" ? "Pilih Pelanggan" : "Pilih Supplier"}</span>
              <button onClick={() => setPartyModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
            <div className="p-2 space-y-2">
              <input
                type="text"
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
                placeholder="Cari kode atau nama..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
              />
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded">
                <div
                  onClick={() => {
                    setSelectedPartyId("");
                    setPartyModalOpen(false);
                  }}
                  className="px-3 py-1.5 hover:bg-sky-50 cursor-pointer font-bold text-[11px] text-slate-600"
                >
                  -- Semua {depositType === "Deposit Pelanggan" ? "Pelanggan" : "Supplier"} --
                </div>
                {(depositType === "Deposit Pelanggan" ? customers : suppliers)
                  .filter(
                    (p: any) =>
                      !partySearch ||
                      p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
                      p.code?.toLowerCase().includes(partySearch.toLowerCase())
                  )
                  .map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPartyId(p.id);
                        setPartyModalOpen(false);
                      }}
                      className="px-3 py-1 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono font-bold text-blue-700">{p.code}</span>
                      <span className="font-semibold text-slate-800">{p.name}</span>
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
