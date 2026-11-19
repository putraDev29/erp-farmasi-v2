"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, AlertCircle } from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function FixedAssetsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [assetCode, setAssetCode] = useState("");
  const [name, setName] = useState("");
  const [cost, setCost] = useState(15000000);
  const [salvage, setSalvage] = useState(0);
  const [lifeMonths, setLifeMonths] = useState(48);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: assets, isLoading } = useQuery({
    queryKey: ["fixed-assets"],
    queryFn: async () => {
      const res = await api.get("/accounting/fixed-assets");
      return res.data?.data || [];
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/accounting/fixed-assets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      setModalOpen(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal mendaftarkan aset tetap");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assetAcc = accounts?.find((a: any) => a.code === "1-2100");
    const deprecAcc = accounts?.find((a: any) => a.code === "6-3000");
    const accumAcc = accounts?.find((a: any) => a.code === "1-2199");

    if (!assetAcc || !deprecAcc || !accumAcc) {
      setErrorMsg("Akun COA aset tetap bawaan belum siap");
      return;
    }

    createMutation.mutate({
      asset_code: assetCode,
      name,
      acquisition_date: new Date().toISOString(),
      acquisition_cost: cost,
      salvage_value: salvage,
      useful_life_months: lifeMonths,
      book_value: cost,
      asset_account_id: assetAcc.id,
      deprec_account_id: deprecAcc.id,
      accum_deprec_acc_id: accumAcc.id,
      status: "ACTIVE",
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Aset Tetap & Amortisasi Penyusutan</h1>
          <p className="text-[11px] text-slate-500">Pencatatan inventaris medis (refrigerator 2-8°C, rak obat, komputer) dan jadwal depresiasi garis lurus.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition shadow-2xs w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Daftarkan Aset Baru</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-3 px-4">Kode Aset</th>
              <th className="py-3 px-4">Nama Aset Tetap</th>
              <th className="py-3 px-4">Nilai Perolehan</th>
              <th className="py-3 px-4 text-center">Masa Manfaat</th>
              <th className="py-3 px-4">Beban Susut / Bulan</th>
              <th className="py-3 px-4">Nilai Buku (Book Value)</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat aset tetap...</td></tr>
            ) : assets?.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Belum ada aset tetap terdaftar.</td></tr>
            ) : (
              assets?.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.asset_code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{a.name}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(a.acquisition_cost)}</td>
                  <td className="py-3 px-4 text-center">{a.useful_life_months} Bulan</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{formatCurrency(a.monthly_deprec_rate)}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">{formatCurrency(a.book_value)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Daftarkan Aset Tetap Baru</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Aset *</label>
                <input
                  type="text"
                  required
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="AST-001"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Aset Tetap *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kulkas Vaksin Cold Chain 2-8°C..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Perolehan (Rp)</label>
                  <input
                    type="number"
                    required
                    value={cost}
                    onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Masa Manfaat (Bulan)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={lifeMonths}
                    onChange={(e) => setLifeMonths(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition disabled:opacity-50"
                >
                  {createMutation.isPending ? "Mendaftarkan..." : "Daftarkan Aset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
