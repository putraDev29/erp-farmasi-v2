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
  Save,
  AlertTriangle,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import SearchableAccountSelect from "@/components/common/SearchableAccountSelect";

export default function FixedAssetsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Mode: "list" or "form"
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters (List)
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("Tanggal Perolehan");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Form State (Aset Baru - Screenshot 3)
  const [kodeAset, setKodeAset] = useState("Auto");
  const [namaAset, setNamaAset] = useState("");
  const [jumlahAset, setJumlahAset] = useState<number>(1);
  const [nilaiAset, setNilaiAset] = useState<number>(0);
  const [umurTahun, setUmurTahun] = useState<number>(4);
  const [tglPerolehan, setTglPerolehan] = useState("18/11/2026 00:00:00");
  const [tglHabis, setTglHabis] = useState("18/11/2030 23:59:59");
  const [grupAsetId, setGrupAsetId] = useState("");
  const [metodeAset, setMetodeAset] = useState("Garis Lurus");
  const [nonDepresiasi, setNonDepresiasi] = useState(false);
  const [nonJurnal, setNonJurnal] = useState(false);
  const [kreditAkunId, setKreditAkunId] = useState("");

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  const { data: assetGroups = [] } = useQuery({
    queryKey: ["asset-groups"],
    queryFn: async () => {
      const res = await api.get("/accounting/assets/groups");
      return res.data?.data || [];
    },
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["fixed-assets"],
    queryFn: async () => {
      const res = await api.get("/accounting/fixed-assets");
      return res.data?.data || [];
    },
  });

  // Credit accounts (Kas/Bank or Hutang)
  const creditAccounts = useMemo(() => {
    return accounts.filter((a: any) => !a.is_header && (a.code.startsWith("1-11") || a.code.startsWith("2-11")));
  }, [accounts]);

  // Sorting & Filtering
  const filteredAssets = useMemo(() => {
    return assets
      .filter((a: any) => {
        if (keyword) {
          const q = keyword.toLowerCase();
          const matchCode = (a.asset_code || "").toLowerCase().includes(q);
          const matchName = (a.name || "").toLowerCase().includes(q);
          if (!matchCode && !matchName) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "Tanggal Perolehan") {
          const da = new Date(a.acquisition_date).getTime();
          const db = new Date(b.acquisition_date).getTime();
          return sortOrder === "asc" ? da - db : db - da;
        }
        return sortOrder === "asc"
          ? (a.asset_code || "").localeCompare(b.asset_code || "")
          : (b.asset_code || "").localeCompare(a.asset_code || "");
      });
  }, [assets, keyword, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const paginated = filteredAssets.slice((page - 1) * pageSize, page * pageSize);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!namaAset.trim()) {
        throw new Error("Nama aset wajib diisi");
      }
      if (Number(nilaiAset) <= 0) {
        throw new Error("Nilai aset harus lebih besar dari 0");
      }

      // Find selected group for default asset and deprec accounts
      const group = assetGroups.find((g: any) => g.id === grupAsetId);
      const defaultAssetAcc = accounts.find((a: any) => a.code.startsWith("1-5")) || accounts[0];
      const defaultDeprecAcc = accounts.find((a: any) => a.code.startsWith("6-3")) || accounts[0];
      const defaultAccumAcc = accounts.find((a: any) => a.code.startsWith("1-52")) || accounts[0];

      let generatedCode = kodeAset;
      if (generatedCode === "Auto" || !generatedCode) {
        generatedCode = `AST-${new Date().getFullYear()}-${String(assets.length + 1).padStart(4, "0")}`;
      }

      const payload = {
        asset_code: generatedCode,
        name: namaAset.trim(),
        acquisition_date: new Date(),
        acquisition_cost: Number(nilaiAset),
        salvage_value: 0,
        useful_life_months: nonDepresiasi ? 0 : Number(umurTahun) * 12,
        asset_account_id: group?.asset_account_id || defaultAssetAcc?.id,
        deprec_account_id: group?.deprec_account_id || defaultDeprecAcc?.id,
        accum_deprec_acc_id: group?.accum_deprec_acc_id || defaultAccumAcc?.id,
        status: "ACTIVE",
      };

      if (editingId) {
        return await api.put(`/accounting/fixed-assets/${editingId}`, payload);
      }
      return await api.post("/accounting/fixed-assets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      alert("Aset berhasil disimpan.");
      setViewMode("list");
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan aset: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/accounting/fixed-assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      setSelectedId(null);
      alert("Aset berhasil dihapus.");
    },
    onError: (err: any) => {
      alert("Gagal menghapus aset: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setKodeAset("Auto");
    setNamaAset("");
    setJumlahAset(1);
    setNilaiAset(0);
    setUmurTahun(4);
    const now = new Date();
    setTglPerolehan(
      `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} 00:00:00`
    );
    setTglHabis(
      `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear() + 4} 23:59:59`
    );
    if (assetGroups.length > 0) {
      setGrupAsetId(assetGroups[0].id);
    } else {
      setGrupAsetId("");
    }
    setMetodeAset("Garis Lurus");
    setNonDepresiasi(false);
    setNonJurnal(false);
    if (creditAccounts.length > 0) {
      setKreditAkunId(creditAccounts[0].id);
    } else {
      setKreditAkunId("");
    }
  };

  const handleOpenCreate = () => {
    resetForm();
    if (assetGroups.length > 0) {
      setGrupAsetId(assetGroups[0].id);
    }
    if (creditAccounts.length > 0) {
      setKreditAkunId(creditAccounts[0].id);
    }
    setViewMode("form");
  };

  const handleOpenEdit = () => {
    if (!selectedId) return;
    const a = assets.find((x: any) => x.id === selectedId);
    if (!a) return;
    setEditingId(a.id);
    setKodeAset(a.asset_code);
    setNamaAset(a.name);
    setNilaiAset(a.acquisition_cost);
    setUmurTahun(Math.round((a.useful_life_months || 0) / 12));
    setNonDepresiasi(a.useful_life_months === 0);
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
          Hal {filteredAssets.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || filteredAssets.length === 0}
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
        title="Tambah Aset"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        onClick={handleOpenEdit}
        className="h-6 w-7 bg-[#3b82f6] hover:bg-blue-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Ubah Aset"
      >
        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          if (confirm("Apakah Anda yakin ingin menghapus data aset ini?")) {
            deleteMutation.mutate(selectedId!);
          }
        }}
        className="h-6 w-7 bg-[#ef4444] hover:bg-red-600 text-white rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Hapus Aset"
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
            onClick={() => (viewMode === "form" ? setViewMode("list") : router.back())}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            {viewMode === "form" ? "Aset Baru" : "Daftar Aset"}
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
            <div className="flex flex-wrap items-end gap-2 text-[11px]">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-slate-600 font-semibold mb-0.5">Kata Kunci :</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari aset..."
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="w-48">
                <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
                <div className="flex items-center gap-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
                  >
                    <option value="Tanggal Perolehan">Tanggal Perolehan</option>
                    <option value="Kode Aset">Kode Aset</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                    className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center justify-center text-slate-600"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["fixed-assets"] })}
                className="h-6 px-3 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Cari</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="shrink-0">
            {renderToolbar()}
          </div>

          {/* Table (Screenshot 2: Kode Aset | Nama Aset | Jumlah Aset | Nilai Aset | Umur (Tahun) | Tgl Perolehan | Tgl Habis | Grup Aset) */}
          <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 h-6 shadow-2xs">
                <tr>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-36">Kode Aset</th>
                  <th className="py-0.5 px-3 border-r border-slate-200">Nama Aset</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 text-right w-28">Jumlah Aset</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 text-right w-36">Nilai Aset</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 text-center w-28">Umur (Tahun)</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tgl Perolehan</th>
                  <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tgl Habis</th>
                  <th className="py-0.5 px-3 w-40">Grup Aset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      Memuat daftar aset...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400 font-normal">
                      No data
                    </td>
                  </tr>
                ) : (
                  paginated.map((a: any) => {
                    const isSelected = selectedId === a.id;
                    const years = Math.round((a.useful_life_months || 0) / 12);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedId(isSelected ? null : a.id)}
                        className={`h-6 transition cursor-pointer hover:bg-slate-50 ${
                          isSelected ? "bg-[#9ec5f7] font-semibold text-slate-900" : ""
                        }`}
                      >
                        <td className="py-0.5 px-3 font-mono font-semibold text-blue-700 border-r border-slate-200">
                          {a.asset_code}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {a.name}
                        </td>
                        <td className="py-0.5 px-3 text-right font-mono border-r border-slate-200">
                          1.00
                        </td>
                        <td className="py-0.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                          {formatCurrency(a.acquisition_cost)}
                        </td>
                        <td className="py-0.5 px-3 text-center border-r border-slate-200">
                          {years}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {formatDate(a.acquisition_date)}
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200">
                          {formatDate(a.acquisition_date)}
                        </td>
                        <td className="py-0.5 px-3 text-slate-600">
                          {a.asset_account?.name || "Inventaris Kantor"}
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
        /* ======================== BARU VIEW (Screenshot 3) ======================== */
        <div className="flex-1 min-h-0 bg-white p-3 rounded border border-slate-300 shadow-2xs flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Form Inputs (2 cols) */}
            <div className="lg:col-span-2 space-y-2 text-[11px]">
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Kode Aset :</label>
                <input
                  type="text"
                  value={kodeAset}
                  readOnly
                  className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-100 font-mono text-[11px] text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Nama Aset :</label>
                <input
                  type="text"
                  value={namaAset}
                  onChange={(e) => setNamaAset(e.target.value)}
                  placeholder="Nama aset tetap..."
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Jumlah Aset :</label>
                <input
                  type="number"
                  value={jumlahAset}
                  onChange={(e) => setJumlahAset(parseFloat(e.target.value) || 0)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500 font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Nilai Aset :</label>
                <input
                  type="number"
                  value={nilaiAset || ""}
                  onChange={(e) => setNilaiAset(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500 font-mono text-right font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Umur Ekonomis (Tahun) :</label>
                <input
                  type="number"
                  value={umurTahun}
                  onChange={(e) => setUmurTahun(parseInt(e.target.value) || 0)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500 font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Perolehan :</label>
                <input
                  type="text"
                  value={tglPerolehan}
                  onChange={(e) => setTglPerolehan(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Habis :</label>
                <input
                  type="text"
                  value={tglHabis}
                  onChange={(e) => setTglHabis(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Grup Aset :</label>
                <div className="flex items-center gap-1">
                  <select
                    value={grupAsetId}
                    onChange={(e) => setGrupAsetId(e.target.value)}
                    className="flex-1 h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Select...</option>
                    {assetGroups.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.code} - {g.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => router.push("/accounting/assets/groups")}
                    className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center justify-center text-slate-600"
                    title="Tambah Grup Aset"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Metode Aset :</label>
                <input
                  type="text"
                  value={metodeAset}
                  readOnly
                  className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-100 text-[11px] text-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkNonDep"
                  checked={nonDepresiasi}
                  onChange={(e) => setNonDepresiasi(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
                <label htmlFor="chkNonDep" className="font-semibold text-slate-700 cursor-pointer">
                  Aset Non Depresiasi
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chkNonJrn"
                  checked={nonJurnal}
                  onChange={(e) => setNonJurnal(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
                <label htmlFor="chkNonJrn" className="font-semibold text-slate-700 cursor-pointer">
                  Aset Non Jurnal
                </label>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">
                  Dikreditkan ke Kode Akun :
                </label>
                <SearchableAccountSelect
                  accounts={creditAccounts}
                  value={kreditAkunId}
                  onChange={(val) => setKreditAkunId(val)}
                  placeholder="Select / Cari Akun Kredit..."
                />
              </div>
            </div>

            {/* Right Side Yellow Notice Box (Screenshot 3) */}
            <div className="bg-[#fffbeb] border border-amber-300 rounded p-3 text-[11px] text-amber-900 space-y-2 h-fit">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>PENTING :</span>
              </div>
              <p className="leading-relaxed">
                <strong>Aset Non Depresiasi :</strong> (dipilih) = Aset yang tidak disusutkan (Contoh : Aset Tanah)
              </p>
              <div className="space-y-1">
                <strong>Aset Non Jurnal :</strong>
                <p className="text-[10px] leading-relaxed">
                  (tidak dipilih) = mencatat pembelian aset jika aset tersebut sama sekali belum pernah tercatat pada Jurnal atau dengan Jurnal Umum sebelumnya.
                </p>
                <p className="text-[10px] leading-relaxed">
                  (dipilih) = mencatat aset yang sudah dibeli dan datanya sudah masuk ke dalam Jurnal namun belum masuk ke dalam fitur pengaturan aset.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Save Button (Screenshot 3) */}
          <div className="shrink-0 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-6 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
