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
  ArrowUpDown,
  X,
  PlusCircle,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { TableSortSelect, sortTableData } from "@/components/common/TableSortSelect";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

type JournalTab =
  | "Semua"
  | "Pembelian"
  | "Penjualan"
  | "Perakitan"
  | "Persediaan"
  | "Kas"
  | "Aset"
  | "Manual";

const JOURNAL_TABS: JournalTab[] = [
  "Semua",
  "Pembelian",
  "Penjualan",
  "Perakitan",
  "Persediaan",
  "Kas",
  "Aset",
  "Manual",
];

export default function JournalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters & State
  const [activeTab, setActiveTab] = useState<JournalTab>("Semua");
  const [keyword, setKeyword] = useState("");
  const [deptGudang, setDeptGudang] = useState("UTAMA - APOTEK BERKAT");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Manual Journal Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDesc, setManualDesc] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualEntries, setManualEntries] = useState([
    { account_code: "", debit: 0, credit: 0, description: "" },
    { account_code: "", debit: 0, credit: 0, description: "" },
  ]);

  // Accounts list for manual journal dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  const leafAccounts = useMemo(() => {
    return accounts.filter((a: any) => !a.is_header);
  }, [accounts]);

  // Query Journals
  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["journals", activeTab, startDate, endDate, keyword],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "Semua") {
        params.append("tab", activeTab.toLowerCase());
      }
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (keyword) params.append("keyword", keyword);

      const res = await api.get(`/accounting/journals?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Sorting
  const sortedJournals = useMemo(() => {
    return sortTableData(journals, sortOption, {
      getCode: (j: any) => j.ref_no || j.doc_no || j.journal_no,
      getName: (j: any) => j.description || j.notes,
      getDate: (j: any) => j.created_at || j.date,
    });
  }, [journals, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedJournals.length / pageSize));
  const paginated = sortedJournals.slice((page - 1) * pageSize, page * pageSize);

  // Manual Journal Save Mutation
  const saveManualMutation = useMutation({
    mutationFn: async () => {
      const validEntries = manualEntries.filter(
        (e) => e.account_code && (e.debit > 0 || e.credit > 0)
      );
      if (validEntries.length < 2) {
        throw new Error("Jurnal harus memiliki minimal 2 baris transaksi (debet dan kredit)");
      }
      const sumDebit = validEntries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
      const sumCredit = validEntries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
      if (Math.abs(sumDebit - sumCredit) > 0.01) {
        throw new Error(`Jurnal tidak seimbang! Total Debet (${sumDebit}) != Total Kredit (${sumCredit})`);
      }

      return await api.post("/accounting/journals/manual", {
        description: manualDesc,
        date: new Date(manualDate),
        entries: validEntries,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setManualModalOpen(false);
      setManualDesc("");
      setManualEntries([
        { account_code: "", debit: 0, credit: 0, description: "" },
        { account_code: "", debit: 0, credit: 0, description: "" },
      ]);
      alert("Jurnal manual berhasil disimpan.");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan: " + (err.response?.data?.message || err.message));
    },
  });

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
          Hal {sortedJournals.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || sortedJournals.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["journals"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Refresh Data"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={() => setManualModalOpen(true)}
        className="h-6 w-7 bg-[#00c875] hover:bg-[#00b066] text-white rounded flex items-center justify-center shadow-2xs transition active:scale-95"
        title="Tambah Jurnal Manual"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        className="h-6 w-7 bg-[#3b82f6] hover:bg-blue-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Ubah Jurnal"
      >
        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        className="h-6 w-7 bg-[#ef4444] hover:bg-red-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Hapus Jurnal"
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
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">Daftar Jurnal</h1>
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

      {/* 2. FILTER SECTION (Screenshot 5) */}
      <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs space-y-1.5">
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
            <label className="block text-slate-600 font-semibold mb-0.5">Dept / Gudang :</label>
            <select
              value={deptGudang}
              onChange={(e) => setDeptGudang(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="UTAMA - APOTEK BERKAT">UTAMA - APOTEK BERKAT</option>
            </select>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status :</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="Semua">Semua</option>
              <option value="POSTED">POSTED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 font-medium shadow-2xs truncate cursor-pointer"
            >
              <option value="created_at_desc">1. Urutan sesuai waktu input paling atas</option>
              <option value="code_asc">2. Kode (A - Z)</option>
              <option value="code_desc">3. Kode (Z - A)</option>
              <option value="name_asc">4. Nama (A - Z)</option>
              <option value="name_desc">5. Nama (Z - A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="shrink-0">
        {renderToolbar()}
      </div>

      {/* 4. TABS (Screenshot 5: Semua, Pembelian, Penjualan, Perakitan, Persediaan, Kas, Aset, Manual) */}
      <div className="flex-1 min-h-0 border border-slate-300 rounded bg-white overflow-hidden shadow-2xs flex flex-col">
        <div className="shrink-0 flex items-center border-b border-slate-300 bg-[#f8fafc] overflow-x-auto text-[11px] font-semibold text-slate-700">
          {JOURNAL_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                  setSelectedId(null);
                }}
                className={`px-3 py-1 border-r border-slate-300 whitespace-nowrap transition ${
                  isActive
                    ? "bg-white text-slate-900 border-b-2 border-b-sky-600 font-bold -mb-[1px]"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* 5. JOURNALS LIST (Screenshot 5: Per-transaction rows with nested entries table) */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-200">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              Memuat data jurnal transaksi...
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs font-normal">
              No data
            </div>
          ) : (
            paginated.map((j: any) => {
              const isSelected = selectedId === j.id;
              const displayTrxNo = j.ref_no || j.doc_no;

              return (
                <div
                  key={j.id}
                  onClick={() => setSelectedId(isSelected ? null : j.id)}
                  className={`border-b border-slate-200 transition ${
                    isSelected ? "ring-2 ring-sky-500/50" : ""
                  }`}
                >
                  {/* Transaction Header Bar (Screenshot 5: Light Cyan/Blue background with [Pencil] No Transaksi: ... | Tanggal: ...) */}
                  <div className="flex items-center justify-between px-2 py-1 bg-[#dbeafe] border-b border-blue-200 text-[11px] font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(j.id);
                        }}
                        className="text-slate-500 hover:text-blue-700 p-0.5"
                        title="Pilih"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-blue-900">
                        No Transaksi : {displayTrxNo}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>Tanggal : {formatDate(j.date)}</span>
                      {j.description && (
                        <>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-600 font-normal italic">
                            {j.description}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
                        {j.ref_type}
                      </span>
                      <span className="font-mono text-slate-700 font-bold">
                        Total: {formatCurrency(j.total_debit || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Nested Entries Table (Screenshot 5: Kode Akun | Nama Akun | Keterangan | Debet | Kredit) */}
                  <table className="w-full text-left text-[11px] border-collapse bg-white">
                    <thead className="bg-[#f8fafc] text-slate-600 font-bold border-b border-slate-200 h-6">
                      <tr>
                        <th className="py-0.5 px-3 border-r border-slate-200 w-32 font-mono">Kode Akun</th>
                        <th className="py-0.5 px-3 border-r border-slate-200 w-52">Nama Akun</th>
                        <th className="py-0.5 px-3 border-r border-slate-200">Keterangan</th>
                        <th className="py-0.5 px-3 border-r border-slate-200 text-right w-36">Debet</th>
                        <th className="py-0.5 px-3 text-right w-36">Kredit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {j.entries && j.entries.length > 0 ? (
                        j.entries.map((ent: any) => (
                          <tr key={ent.id} className="h-6 hover:bg-slate-50">
                            <td className="py-0.5 px-3 font-mono font-semibold text-slate-700 border-r border-slate-200">
                              {ent.account?.code || "-"}
                            </td>
                            <td className="py-0.5 px-3 border-r border-slate-200">
                              {ent.account?.name || "-"}
                            </td>
                            <td className="py-0.5 px-3 text-slate-600 border-r border-slate-200">
                              {ent.description || j.description || "-"}
                            </td>
                            <td className="py-0.5 px-3 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">
                              {ent.debit > 0 ? formatCurrency(ent.debit) : "0.00"}
                            </td>
                            <td className="py-0.5 px-3 text-right font-mono font-semibold text-slate-800">
                              {ent.credit > 0 ? formatCurrency(ent.credit) : "0.00"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-2 px-3 text-slate-400 italic">
                            Tidak ada rincian akun
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. BOTTOM TOOLBAR */}
      <div className="shrink-0 pt-0.5">
        {renderToolbar()}
      </div>

      {/* MODAL TAMBAH JURNAL MANUAL */}
      {manualModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded shadow-xl w-full max-w-2xl overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800">
              <span>Tambah Jurnal Manual</span>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2.5 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-0.5">Tanggal :</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-0.5">Keterangan Jurnal :</label>
                  <input
                    type="text"
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    placeholder="Contoh: Jurnal penyesuaian akhir bulan..."
                    className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
                  />
                </div>
              </div>

              {/* Entries Table */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                  <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 h-6">
                    <tr>
                      <th className="py-0.5 px-2 border-r border-slate-200 w-56">Kode / Nama Akun</th>
                      <th className="py-0.5 px-2 border-r border-slate-200">Keterangan</th>
                      <th className="py-0.5 px-2 border-r border-slate-200 text-right w-28">Debet</th>
                      <th className="py-0.5 px-2 text-right w-28">Kredit</th>
                      <th className="py-0.5 px-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {manualEntries.map((row, idx) => (
                      <tr key={idx} className="h-7">
                        <td className="py-0.5 px-1.5 border-r border-slate-200">
                          <SearchableAccountSelect
                            accounts={leafAccounts}
                            value={row.account_code}
                            onChange={(val, acc) => {
                              const copy = [...manualEntries];
                              copy[idx].account_code = acc?._code || val;
                              setManualEntries(copy);
                            }}
                            placeholder="Select / Cari Akun..."
                          />
                        </td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => {
                              const copy = [...manualEntries];
                              copy[idx].description = e.target.value;
                              setManualEntries(copy);
                            }}
                            placeholder="Keterangan..."
                            className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
                          />
                        </td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200 text-right">
                          <input
                            type="number"
                            value={row.debit || ""}
                            onChange={(e) => {
                              const copy = [...manualEntries];
                              copy[idx].debit = parseFloat(e.target.value) || 0;
                              if (copy[idx].debit > 0) copy[idx].credit = 0;
                              setManualEntries(copy);
                            }}
                            placeholder="0.00"
                            className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="py-0.5 px-1.5 text-right">
                          <input
                            type="number"
                            value={row.credit || ""}
                            onChange={(e) => {
                              const copy = [...manualEntries];
                              copy[idx].credit = parseFloat(e.target.value) || 0;
                              if (copy[idx].credit > 0) copy[idx].debit = 0;
                              setManualEntries(copy);
                            }}
                            placeholder="0.00"
                            className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono text-[11px]"
                          />
                        </td>
                        <td className="py-0.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setManualEntries((prev) =>
                                prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev
                              )
                            }
                            className="text-slate-400 hover:text-red-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setManualEntries((prev) => [
                      ...prev,
                      { account_code: "", debit: 0, credit: 0, description: "" },
                    ])
                  }
                  className="h-6 px-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Tambah Baris</span>
                </button>

                <div className="text-[11px] font-mono flex items-center gap-3">
                  <span>
                    Debet:{" "}
                    <strong>
                      {formatCurrency(
                        manualEntries.reduce((s, e) => s + (Number(e.debit) || 0), 0)
                      )}
                    </strong>
                  </span>
                  <span>
                    Kredit:{" "}
                    <strong>
                      {formatCurrency(
                        manualEntries.reduce((s, e) => s + (Number(e.credit) || 0), 0)
                      )}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-1.5 px-3 py-2 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => saveManualMutation.mutate()}
                disabled={saveManualMutation.isPending}
                className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white rounded font-bold text-[11px] disabled:opacity-50 shadow-2xs"
              >
                {saveManualMutation.isPending ? "Menyimpan..." : "Simpan Jurnal"}
              </button>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="h-6 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-semibold text-[11px]"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
