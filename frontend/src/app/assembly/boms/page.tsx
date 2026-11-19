"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Boxes, X, AlertCircle } from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

export default function BOMsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [finishedProductID, setFinishedProductID] = useState("");
  const [yieldQty, setYieldQty] = useState(1);
  const [componentProductID, setComponentProductID] = useState("");
  const [compQty, setCompQty] = useState(1);
  const [laborCost, setLaborCost] = useState(5000);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: boms, isLoading } = useQuery({
    queryKey: ["boms"],
    queryFn: async () => {
      const res = await api.get("/assembly/boms");
      return res.data?.data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => {
      const res = await api.get("/products?page_size=100");
      return res.data?.data?.items || [];
    },
  });

  React.useEffect(() => {
    if (products && products.length > 0) {
      const assemblyProds = products.filter((p: any) => p.type === "ASSEMBLY");
      if (assemblyProds.length > 0 && !finishedProductID) {
        setFinishedProductID(assemblyProds[0].id);
      } else if (!finishedProductID) {
        setFinishedProductID(products[0].id);
      }

      const invProds = products.filter((p: any) => p.type === "INVENTORY");
      if (invProds.length > 0 && !componentProductID) {
        setComponentProductID(invProds[0].id);
      }
    }
  }, [products, finishedProductID, componentProductID]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/assembly/boms", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boms"] });
      setModalOpen(false);
      setCode("");
      setName("");
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal membuat formula BOM");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selFin = products?.find((p: any) => p.id === finishedProductID);
    const selComp = products?.find((p: any) => p.id === componentProductID);
    if (!selFin || !selComp) return;

    createMutation.mutate({
      code,
      name,
      product_id: finishedProductID,
      unit_id: selFin.base_unit_id,
      yield_qty: yieldQty,
      labor_cost: laborCost,
      overhead_cost: 0,
      notes,
      items: [
        {
          product_id: componentProductID,
          unit_id: selComp.base_unit_id,
          qty: compQty,
          scrap_rate: 0,
        },
      ],
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Formula Bill of Materials (BOM)</h1>
          <p className="text-[11px] text-slate-500">Definisi resep perakitan barang jadi, formula obat racikan, atau paket P3K.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 h-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition shadow-2xs w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Formula BOM Baru</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-3 px-4">Kode BOM</th>
              <th className="py-3 px-4">Nama Formula</th>
              <th className="py-3 px-4">Barang Jadi yang Dihasilkan</th>
              <th className="py-3 px-4 text-center">Hasil (Yield)</th>
              <th className="py-3 px-4">Bahan Baku Komponen</th>
              <th className="py-3 px-4">Biaya Tenaga Kerja</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Memuat formula BOM...</td></tr>
            ) : boms?.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Belum ada formula perakitan.</td></tr>
            ) : (
              boms?.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{b.name}</td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">{b.product?.name}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">{b.yield_qty} {b.unit?.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {b.items?.map((it: any) => `${it.product?.name} (${it.qty} ${it.unit?.name})`).join(", ")}
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-mono">{formatCurrency(b.labor_cost)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Aktif
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
              <h3 className="text-base font-bold text-slate-800">Buat Formula Bill of Materials</h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode BOM *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="BOM-001"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Formula *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Formula Racikan..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Barang Jadi yang Dihasilkan *</label>
                <select
                  value={finishedProductID}
                  onChange={(e) => setFinishedProductID(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                >
                  {products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bahan Baku Komponen Terpakai *</label>
                <select
                  value={componentProductID}
                  onChange={(e) => setComponentProductID(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                >
                  {products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kuantitas Komponen</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={compQty}
                    onChange={(e) => setCompQty(parseFloat(e.target.value) || 1)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Biaya Tenaga Kerja (Rp)</label>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Proses pencampuran obat..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
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
                  {createMutation.isPending ? "Menyimpan..." : "Simpan Formula BOM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
